"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
exports.migrateMarketplace = migrateMarketplace;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ledger_1 = require("@agrivest/ledger");
const SCHEMA_SQL = (0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, "..", "schema.sql"), "utf8");
/** Apply the marketplace schema. Run AFTER the ledger schema (it reads ledger tables). */
async function migrateMarketplace(db) {
    if (db.exec)
        await db.exec(SCHEMA_SQL);
    else
        await db.query(SCHEMA_SQL);
}
const num = (v) => (v == null ? 0 : Number(v));
/**
 * The marketplace catalogue. Funding numbers are read live from the ledger:
 * `raised` = the project's escrow balance, `investors` = active investments.
 */
class MarketplaceService {
    db;
    constructor(db) {
        this.db = db;
    }
    createSponsor(id, name) {
        return this.db.query("INSERT INTO sponsor(id, name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [id, name]);
    }
    /** Sponsor submits a venture; it enters underwriting (not yet investable). */
    submitProject(p) {
        return this.db.query(`INSERT INTO project(id, sponsor_id, title, venture, location, return_model,
                           cycle_months, min_cents, target_cents, blurb)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [p.id, p.sponsorId, p.title, p.venture, p.location, p.returnModel,
            p.cycleMonths, p.minCents, p.targetCents, p.blurb ?? null]);
    }
    /** Underwriting outcome: grade + return terms, open for funding. */
    approveProject(id, t) {
        return this.db.query(`UPDATE project SET grade=$2, expected_pct=$3, downside_pct=$4,
              status='funding', opened_at=now(), closes_at=$5 WHERE id=$1`, [id, t.grade, t.expectedPct, t.downsidePct, t.closesAt ?? null]);
    }
    async fundingProgress(projectId) {
        const tgt = num((await this.db.query("SELECT target_cents FROM project WHERE id=$1", [projectId])).rows[0]?.target_cents);
        const raw = num((await this.db.query("SELECT raw FROM account_balance WHERE account=$1", [`escrow:${projectId}`])).rows[0]?.raw);
        const raised = -raw; // escrow is credit-normal: normal balance = -raw
        const investors = num((await this.db.query("SELECT COUNT(*) AS n FROM investment WHERE project=$1 AND status='active'", [projectId])).rows[0]?.n);
        const fundedPct = tgt > 0 ? Math.round((raised / tgt) * 1000) / 10 : 0;
        return { raisedCents: raised, targetCents: tgt, fundedPct, investors };
    }
    /** Catalogue with live funding, newest first. */
    async listProjects() {
        const rows = (await this.db.query(`SELECT p.*, COALESCE(-ab.raw, 0) AS raised,
              (SELECT COUNT(*) FROM investment i WHERE i.project=p.id AND i.status='active') AS investors
       FROM project p
       LEFT JOIN account_balance ab ON ab.account = 'escrow:' || p.id
       ORDER BY p.opened_at DESC NULLS LAST, p.id`)).rows;
        return rows.map((r) => ({
            ...r,
            raised: num(r.raised),
            target_cents: num(r.target_cents),
            investors: num(r.investors),
            funded_pct: num(r.target_cents) > 0 ? Math.round((num(r.raised) / num(r.target_cents)) * 1000) / 10 : 0,
        }));
    }
    async getProject(id) {
        const p = (await this.db.query("SELECT * FROM project WHERE id=$1", [id])).rows[0];
        if (!p)
            return null;
        const funding = await this.fundingProgress(id);
        const updates = (await this.db.query("SELECT ts, body, has_photo FROM project_update WHERE project_id=$1 ORDER BY ts DESC", [id])).rows;
        return { ...p, target_cents: num(p.target_cents), min_cents: num(p.min_cents), funding, updates };
    }
    postUpdate(projectId, body, hasPhoto = false) {
        return this.db.query("INSERT INTO project_update(project_id, body, has_photo) VALUES ($1,$2,$3)", [projectId, body, hasPhoto]);
    }
    /** Flip to 'active' once the raise is fully funded. */
    async markFundedIfComplete(projectId) {
        return (0, ledger_1.withTx)(this.db, async () => {
            const f = await this.fundingProgress(projectId);
            if (f.raisedCents >= f.targetCents && f.targetCents > 0) {
                await this.db.query("UPDATE project SET status='active' WHERE id=$1 AND status='funding'", [projectId]);
                return true;
            }
            return false;
        });
    }
}
exports.MarketplaceService = MarketplaceService;
