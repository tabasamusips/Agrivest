import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { Pool } from "pg";

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureUser(userId: string) {
  await db.query(`INSERT INTO users (id, phone) VALUES ($1, $1) ON CONFLICT (id) DO NOTHING`, [userId]);
  await db.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
}

@Controller("wallet")
export class WalletController {

  @UseGuards(AuthGuard)
  @Get("balance")
  async balance(@Req() req: any) {
    await ensureUser(req.user.sub);
    const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
    return { balance: rows[0]?.balance_cents ?? 0 };
  }

  @UseGuards(AuthGuard)
  @Post("deposit")
  async deposit(@Req() req: any, @Body() b: { amount: number; phone?: string }) {
    await ensureUser(req.user.sub);
    await db.query(`UPDATE wallets SET balance_cents = balance_cents + $1, updated_at = now() WHERE user_id = $2`, [b.amount, req.user.sub]);
    await db.query(`INSERT INTO transactions (user_id, type, amount_cents, ref, status) VALUES ($1, 'deposit', $2, 'mpesa-sandbox', 'completed')`, [req.user.sub, b.amount]);
    const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
    return { balance: rows[0].balance_cents, status: "completed" };
  }

  @UseGuards(AuthGuard)
  @Post("withdraw")
  async withdraw(@Req() req: any, @Body() b: { amount: number; phone?: string }) {
    await ensureUser(req.user.sub);
    const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
    const bal = rows[0]?.balance_cents ?? 0;
    if (bal < b.amount) throw new Error("Insufficient balance");
    await db.query(`UPDATE wallets SET balance_cents = balance_cents - $1, updated_at = now() WHERE user_id = $2`, [b.amount, req.user.sub]);
    await db.query(`INSERT INTO transactions (user_id, type, amount_cents, ref, status) VALUES ($1, 'withdraw', $2, 'mpesa-sandbox', 'completed')`, [req.user.sub, b.amount]);
    return { status: "completed" };
  }
}
