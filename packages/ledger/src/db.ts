import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Minimal client surface shared by node-postgres (`pg`) and PGlite.
 * Both expose `.query(sql, params) -> { rows }`. We drive transactions with
 * explicit BEGIN/COMMIT so the same code runs against either.
 *
 * Production: pass ONE pooled `pg` Client per request (so the transaction and
 * its advisory locks live on a single connection). Tests: pass a PGlite.
 */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
  exec?(sql: string): Promise<unknown>;
}

const SCHEMA_PATH = join(__dirname, "..", "schema.sql");
export const SCHEMA_SQL = readFileSync(SCHEMA_PATH, "utf8");

/** Apply the schema (idempotent). */
export async function migrate(db: Queryable): Promise<void> {
  if (db.exec) await db.exec(SCHEMA_SQL);
  else await db.query(SCHEMA_SQL);
}

/** Run `fn` inside one transaction; rollback on throw. */
export async function withTx<T>(db: Queryable, fn: () => Promise<T>): Promise<T> {
  await db.query("BEGIN");
  try {
    const out = await fn();
    await db.query("COMMIT");
    return out;
  } catch (e) {
    try { await db.query("ROLLBACK"); } catch { /* connection already aborted */ }
    throw e;
  }
}

export const isUniqueViolation = (e: any): boolean =>
  e?.code === "23505" || /duplicate key|unique constraint/i.test(String(e?.message));
