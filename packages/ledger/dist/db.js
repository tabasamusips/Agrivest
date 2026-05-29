"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUniqueViolation = exports.SCHEMA_SQL = void 0;
exports.migrate = migrate;
exports.withTx = withTx;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const SCHEMA_PATH = (0, node_path_1.join)(__dirname, "..", "schema.sql");
exports.SCHEMA_SQL = (0, node_fs_1.readFileSync)(SCHEMA_PATH, "utf8");
/** Apply the schema (idempotent). */
async function migrate(db) {
    if (db.exec)
        await db.exec(exports.SCHEMA_SQL);
    else
        await db.query(exports.SCHEMA_SQL);
}
/** Run `fn` inside one transaction; rollback on throw. */
async function withTx(db, fn) {
    await db.query("BEGIN");
    try {
        const out = await fn();
        await db.query("COMMIT");
        return out;
    }
    catch (e) {
        try {
            await db.query("ROLLBACK");
        }
        catch { /* connection already aborted */ }
        throw e;
    }
}
const isUniqueViolation = (e) => e?.code === "23505" || /duplicate key|unique constraint/i.test(String(e?.message));
exports.isUniqueViolation = isUniqueViolation;
