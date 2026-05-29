import { Queryable } from "../db.js";
import { PgAgriVest } from "../pg.js";
import { DarajaClient, StkResult, B2CResult } from "./daraja.js";
/**
 * Bridges M-Pesa <-> the ledger. The crucial property: the M-Pesa receipt is
 * used as the ledger idempotency `ref`, so Daraja retrying a callback (which it
 * does) can never double-credit a deposit or double-record a payout.
 */
export declare class PaymentsService {
    private db;
    private ledger;
    private daraja;
    constructor(db: Queryable, ledger: PgAgriVest, daraja: DarajaClient);
    /** Investor taps "Deposit" -> STK push to their phone. Money lands on callback. */
    initiateDeposit(user: string, amountCents: number, phone: string): Promise<{
        checkoutRequestId: string;
    }>;
    /** Daraja POSTs here when the customer approves (or cancels) the STK prompt. */
    handleStkCallback(result: StkResult): Promise<void>;
    /**
     * Investor cashes out: debit the wallet now (reserving funds via the ledger's
     * balance guard), then send B2C. If B2C ultimately fails, the result handler
     * compensates with a reversing deposit so no money is lost.
     */
    initiateWithdrawal(user: string, amountCents: number, phone: string): Promise<{
        conversationId: string;
    }>;
    handleB2CResult(result: B2CResult): Promise<void>;
}
