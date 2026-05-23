import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrate, PgAgriVest, KES } from "@agrivest/ledger";
import { MarketplaceService, migrateMarketplace } from "../src/marketplace.js";

async function fresh() {
  const db = await PGlite.create();
  await migrate(db);            // ledger schema first
  await migrateMarketplace(db); // marketplace schema reads ledger tables
  return db;
}

test("submit -> approve -> list shows the project as funding", async () => {
  const db = await fresh();
  const m = new MarketplaceService(db);
  await m.createSponsor("wanjiku", "Wanjiku Farms Ltd");
  await m.submitProject({
    id: "kiambu-poultry", sponsorId: "wanjiku", title: "Kiambu Broiler Poultry",
    venture: "poultry", location: "Kiambu", returnModel: "fixed",
    cycleMonths: 4, minCents: KES(500), targetCents: KES(1000), blurb: "Restock 5,000 broilers",
  });
  await m.approveProject("kiambu-poultry", { grade: "B", expectedPct: 18, downsidePct: 4 });

  const list = await m.listProjects();
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "funding");
  assert.equal(list[0].grade, "B");
  assert.equal(list[0].raised, 0);
  assert.equal(list[0].funded_pct, 0);
});

test("funding progress is read live from the ledger and cross-checks", async () => {
  const db = await fresh();
  const m = new MarketplaceService(db);
  const led = new PgAgriVest(db);
  await m.createSponsor("s1", "Sponsor One");
  await m.submitProject({
    id: "proj1", sponsorId: "s1", title: "P1", venture: "fish", location: "Homa Bay",
    returnModel: "revenue_share", cycleMonths: 8, minCents: KES(500), targetCents: KES(1000),
  });
  await m.approveProject("proj1", { grade: "C", expectedPct: 22, downsidePct: -12 });

  // two pooled investors put money in via the ledger
  await led.deposit("a", KES(600), "Da"); await led.invest("a", "proj1", KES(600));
  await led.deposit("b", KES(400), "Db"); await led.invest("b", "proj1", KES(400));

  const f = await m.fundingProgress("proj1");
  assert.equal(f.raisedCents, KES(1000)); // matches the escrow balance
  assert.equal(f.investors, 2);
  assert.equal(f.fundedPct, 100);

  const filled = await m.markFundedIfComplete("proj1");
  assert.equal(filled, true);
  const detail = await m.getProject("proj1");
  assert.equal(detail.status, "active");
});

test("updates: photo-backed evidence appears on the project", async () => {
  const db = await fresh();
  const m = new MarketplaceService(db);
  await m.createSponsor("s2", "Sponsor Two");
  await m.submitProject({
    id: "proj2", sponsorId: "s2", title: "P2", venture: "bees", location: "Kitui",
    returnModel: "profit_share", cycleMonths: 5, minCents: KES(500), targetCents: KES(500),
  });
  await m.postUpdate("proj2", "120 hives installed; first harvest in 6 weeks.", true);
  const detail = await m.getProject("proj2");
  assert.equal(detail.updates.length, 1);
  assert.equal(detail.updates[0].has_photo, true);
});
