/**
 * Minimal client surface shared by node-postgres (`pg`) and PGlite.
 * Both expose `.query(sql, params) -> { rows }`. We drive transactions with
 * explicit BEGIN/COMMIT so the same code runs against either.
 *
 * Production: pass ONE pooled `pg` Client per request (so the transaction and
 * its advisory locks live on a single connection). Tests: pass a PGlite.
 */
export interface Queryable {
    query(sql: string, params?: unknown[]): Promise<{
        rows: any[];
    }>;
    exec?(sql: string): Promise<unknown>;
}
export declare const SCHEMA_SQL: string;
/** Apply the schema (idempotent). */
export declare function migrate(db: Queryable): Promise<void>;
/** Run `fn` inside one transaction; rollback on throw. */
export declare function withTx<T>(db: Queryable, fn: () => Promise<T>): Promise<T>;
export declare const isUniqueViolation: (e: any) => boolean;
