import { Queryable, withTx } from "../db.js";
import { PgAgriVest } from "../pg.js";
import { LedgerError } from "../errors.js";
import {
  DarajaClient, StkResult, B2CResult, centsToWholeKES,
} from "./daraja.js";

/**
 * Bridges M-Pesa <-> the ledger. The crucial property: the M-Pesa receipt is
 * used as the ledger idempotency `ref`, so Daraja retrying a callback (which it
 * does) can never double-credit a deposit or double-record a payout.
 */
export class PaymentsService {
  constructor(
    private db: Queryable,
    private ledger: PgAgriVest,
    private daraja: DarajaClient,
  ) {}

  /** Investor taps "Deposit" -> STK push to their phone. Money lands on callback. */
  async initiateDeposit(user: string, amountCents: number, phone: string) {
    const amountKES = centsToWholeKES(amountCents);
    const res = await this.daraja.stkPush({
      amountKES, phone, accountReference: `AV-${user}`, description: "Agri Vest deposit",
    });
    if (res.ResponseCode !== "0") throw new LedgerError(`STK push rejected: ${res.CustomerMessage}`);
    await this.db.query(
      `INSERT INTO payment_intent(id, kind, account_ref, amount, phone) VALUES ($1,'deposit',$2,$3,$4)`,
      [res.CheckoutRequestID, user, amountCents, phone]
    );
    return { checkoutRequestId: res.CheckoutRequestID };
  }

  /** Daraja POSTs here when the customer approves (or cancels) the STK prompt. */
  async handleStkCallback(result: StkResult) {
    return withTx(this.db, async () => {
      const rows = (await this.db.query(
        "SELECT * FROM payment_intent WHERE id = $1 FOR UPDATE", [result.checkoutRequestId]
      )).rows;
      if (!rows.length) throw new LedgerError(`unknown CheckoutRequestID ${result.checkoutRequestId}`);
      const intent = rows[0];
      if (intent.status === "completed") return; // already processed (idempotent)

      if (!result.success || !result.receipt) {
        await this.db.query("UPDATE payment_intent SET status='failed' WHERE id=$1", [result.checkoutRequestId]);
        return;
      }
      // credit the wallet — receipt is the ledger idempotency ref
      await this.ledger.deposit(intent.account_ref, Number(intent.amount), result.receipt);
      await this.db.query(
        "UPDATE payment_intent SET status='completed', receipt=$2 WHERE id=$1",
        [result.checkoutRequestId, result.receipt]
      );
    });
  }

  /**
   * Investor cashes out: debit the wallet now (reserving funds via the ledger's
   * balance guard), then send B2C. If B2C ultimately fails, the result handler
   * compensates with a reversing deposit so no money is lost.
   */
  async initiateWithdrawal(user: string, amountCents: number, phone: string) {
    const amountKES = centsToWholeKES(amountCents);
    const opRef = `WD-${user}-${Date.now()}`;
    await this.ledger.withdraw(user, amountCents, opRef); // throws if insufficient
    const res = await this.daraja.b2c({ amountKES, phone, remarks: "Agri Vest withdrawal" });
    await this.db.query(
      `INSERT INTO payment_intent(id, kind, account_ref, amount, phone, status)
       VALUES ($1,'withdrawal',$2,$3,$4,'pending')`,
      [res.OriginatorConversationID, user, amountCents, phone]
    );
    return { conversationId: res.OriginatorConversationID };
  }

  async handleB2CResult(result: B2CResult) {
    return withTx(this.db, async () => {
      const rows = (await this.db.query(
        "SELECT * FROM payment_intent WHERE id = $1 FOR UPDATE", [result.originatorConversationId]
      )).rows;
      if (!rows.length) return;
      const intent = rows[0];
      if (intent.status !== "pending") return;

      if (result.success) {
        await this.db.query(
          "UPDATE payment_intent SET status='completed', receipt=$2 WHERE id=$1",
          [result.originatorConversationId, result.receipt ?? null]
        );
      } else {
        // B2C failed -> give the money back (compensating credit)
        await this.ledger.deposit(intent.account_ref, Number(intent.amount), `refund-${intent.id}`);
        await this.db.query("UPDATE payment_intent SET status='failed' WHERE id=$1", [result.originatorConversationId]);
      }
    });
  }
}
