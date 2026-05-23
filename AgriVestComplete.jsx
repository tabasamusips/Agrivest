import React, { useState, useMemo } from "react";
import {
  Home, Compass, Wallet, GraduationCap, User, ChevronLeft, ChevronRight,
  Check, CheckCircle2, ShieldCheck, AlertTriangle, Users, Clock, MapPin, Info,
  Plus, Minus, ArrowUpRight, ArrowDownLeft, X, Search, Fish, Egg, Milk, Sprout,
  Hexagon, Leaf, Smartphone, Star, BadgeInfo, Camera, ArrowRight, FileText,
  Layers, TrendingUp, RefreshCw,
} from "lucide-react";

/* ==================================================================== *
 *  AGRI VEST — complete single-file app
 *  Investor + sponsor flows on top of a WORKING in-memory double-entry
 *  ledger that mirrors the real backend: deposit -> wallet, invest ->
 *  escrow, 48h cooling-off refund, sponsor return -> pro-rata payout.
 *  The "Engine" view (Profile -> Ledger engine) shows the books live.
 * ==================================================================== */

/* ----------------------------- money + ledger ----------------------------- */
const KES = (n) => Math.round(n * 100);                 // shillings -> cents
const fmt = (c) =>
  (c < 0 ? "-" : "") + "KES " + (Math.abs(c) / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 });

const accType = (a) => (a === "mpesa_clearing" ? "ASSET" : a === "platform_fees" ? "INCOME" : "LIABILITY");
const debitNormal = (t) => t === "ASSET" || t === "EXPENSE";
const computeBalances = (entries) => {
  const m = {};
  for (const e of entries) for (const p of e.postings) m[p.account] = (m[p.account] || 0) + p.amount;
  return m;
};
const bal = (balances, acc) => {
  const raw = balances[acc] || 0;
  const v = debitNormal(accType(acc)) ? raw : -raw;
  return v === 0 ? 0 : v;
};
const splitProRata = (total, weights) => {
  const W = weights.reduce((a, b) => a + b, 0);
  if (W <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / W);
  const out = exact.map((e) => Math.floor(e));
  const rem = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, f: e - Math.floor(e) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; k < rem; k++) out[order[k].i] += 1;
  return out;
};

/* ----------------------------- presentation ----------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
:root{
  --green-900:#14271c; --green-800:#19341f; --green-700:#1f4a2c; --green-600:#2e6b43;
  --green-500:#3f8456; --green-400:#5b9a4e; --terra:#c65d3b; --terra-soft:#e08a64;
  --gold:#c99a3a; --cream:#f4efe3; --paper:#fbf8f0; --card:#ffffff; --ink:#1c281f;
  --muted:#6c7a6e; --line:#e7e0cf; --gA:#2e7d46; --gB:#5b9a4e; --gC:#c99a3a; --gD:#cf7d36; --gE:#b5482f;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.av{font-family:'Hanken Grotesk',sans-serif;}
.serif{font-family:'Fraunces',serif;} .tnum{font-variant-numeric:tabular-nums;}
.stage{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:28px 16px;
  background:radial-gradient(120% 80% at 80% -10%, #2e6b4322 0%, transparent 50%),radial-gradient(100% 70% at 0% 110%, #c65d3b1a 0%, transparent 45%),#ece5d4;}
.phone{width:392px;max-width:100%;height:812px;position:relative;background:var(--paper);border-radius:46px;overflow:hidden;
  box-shadow:0 2px 0 #fff inset,0 40px 80px -20px #1c281f55,0 0 0 11px #11140f,0 0 0 13px #2a2e25;}
.notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:140px;height:26px;background:#11140f;border-radius:0 0 18px 18px;z-index:60;}
.statusbar{position:absolute;top:0;left:0;right:0;height:46px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;font-size:13px;font-weight:700;color:var(--ink);z-index:55;}
.screen{position:absolute;inset:0;top:46px;bottom:74px;overflow-y:auto;overflow-x:hidden;}
.screen::-webkit-scrollbar{display:none;}
.tabbar{position:absolute;bottom:0;left:0;right:0;height:74px;background:#fbf8f0ee;backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;z-index:50;padding-bottom:6px;}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);background:none;border:none;font-family:inherit;font-size:10px;font-weight:700;cursor:pointer;}
.tab.active{color:var(--green-700);} .tab .dot{width:5px;height:5px;border-radius:9px;background:var(--terra);opacity:0;transition:.2s;} .tab.active .dot{opacity:1;}
.pad{padding:18px 18px 26px;}
.h-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--green-600);}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;}
.btn{font-family:inherit;border:none;cursor:pointer;font-weight:700;border-radius:16px;transition:transform .08s,filter .15s;}
.btn:active{transform:scale(.97);} .btn-primary{background:var(--green-700);color:var(--cream);} .btn-primary:active{filter:brightness(1.08);}
.btn-ghost{background:#1f4a2c12;color:var(--green-700);}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:5px 10px;border-radius:11px;white-space:nowrap;}
.grade{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:12px;padding:5px 9px 5px 7px;border-radius:10px;}
.grade .g{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;}
.bar{height:7px;border-radius:7px;background:#1f4a2c1a;overflow:hidden;} .bar>i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--green-500),var(--green-400));transition:width .9s cubic-bezier(.2,.8,.2,1);}
.bar.terra>i{background:linear-gradient(90deg,var(--terra),var(--terra-soft));}
.fade{animation:fade .5s both;} @keyframes fade{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.pop{animation:pop .45s cubic-bezier(.2,1.4,.4,1) both;} @keyframes pop{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}
.sheet{position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;justify-content:flex-end;background:#14271c44;animation:fade .25s;}
.sheet-inner{background:var(--paper);border-radius:28px 28px 0 0;max-height:92%;overflow-y:auto;animation:up .32s cubic-bezier(.2,.8,.2,1);}
.sheet-inner::-webkit-scrollbar{display:none;} @keyframes up{from{transform:translateY(60px);opacity:.6;}to{transform:none;opacity:1;}}
.overlay{position:absolute;inset:0;top:46px;bottom:0;background:var(--paper);z-index:40;overflow-y:auto;animation:slide .28s cubic-bezier(.2,.8,.2,1);}
.overlay::-webkit-scrollbar{display:none;} @keyframes slide{from{transform:translateX(34px);opacity:0;}to{transform:none;opacity:1;}}
.venthumb{height:172px;position:relative;display:grid;place-items:center;color:#fff;}
.venthumb .vlabel{position:absolute;left:16px;bottom:14px;font-weight:800;font-size:13px;text-shadow:0 1px 8px #0006;}
.spin{animation:spin 1.1s linear infinite;} @keyframes spin{to{transform:rotate(360deg);}}
.seg{display:flex;background:#1f4a2c12;border-radius:14px;padding:4px;gap:4px;}
.seg button{flex:1;border:none;background:none;font-family:inherit;font-weight:700;font-size:13px;padding:9px;border-radius:11px;color:var(--muted);cursor:pointer;}
.seg button.on{background:#fff;color:var(--green-700);box-shadow:0 1px 4px #1c281f1a;}
`;

const GRADE = { A: "var(--gA)", B: "var(--gB)", C: "var(--gC)", D: "var(--gD)", E: "var(--gE)" };
const VEN = {
  poultry: { g: "linear-gradient(135deg,#cf7d36,#b5482f)", Icon: Egg },
  fish: { g: "linear-gradient(135deg,#2e6b43,#1f7a7a)", Icon: Fish },
  horticulture: { g: "linear-gradient(135deg,#3f8456,#5b9a4e)", Icon: Sprout },
  dairy: { g: "linear-gradient(135deg,#9a6b3f,#c99a3a)", Icon: Milk },
  bees: { g: "linear-gradient(135deg,#c99a3a,#cf7d36)", Icon: Hexagon },
  greenhouse: { g: "linear-gradient(135deg,#2e6b43,#5b9a4e)", Icon: Leaf },
};

const PROJECTS = [
  { id: "kiambu-poultry", title: "Kiambu Broiler Poultry", cycle: "Cycle 14", venture: "poultry", vlabel: "Poultry",
    location: "Kiambu County", grade: "B", model: "Fixed-return note", range: "16–19%", exp: 18, down: 4, months: 4,
    minc: KES(500), target: KES(850000), base: KES(612000), investors: 138, daysLeft: 9,
    sponsor: { name: "Wanjiku Farms Ltd", cycles: 13, onTime: 13, rating: 4.8 },
    blurb: "Working capital to restock and feed 5,000 broilers through a 6-week grow-out, sold to a contracted Nairobi processor.",
    use: [["Day-old chicks", 35], ["Feed", 40], ["Vet & vaccines", 12], ["Labour & ops", 13]],
    risks: ["Disease outbreak — mitigated by vet cover + biosecurity", "Feed price volatility", "Single-buyer concentration"],
    protect: ["Index livestock insurance", "Signed offtake agreement", "Milestone escrow release"],
    fail: "If birds are lost to disease, index insurance covers stock value and you receive a partial return from recovered feed and salvage. Worst realistic case returns roughly KES 4 on every 100 invested.",
    updates: [["Week 2", "Chicks placed, mortality 0.8% — below target."], ["Week 0", "Funds released against feed-supplier invoice."]] },
  { id: "homabay-tilapia", title: "Lake Victoria Tilapia", cycle: "Cage cycle 6", venture: "fish", vlabel: "Aquaculture",
    location: "Homa Bay County", grade: "C", model: "Revenue share", range: "18–26%", exp: 22, down: -12, months: 8,
    minc: KES(500), target: KES(1400000), base: KES(574000), investors: 96, daysLeft: 21,
    sponsor: { name: "Nyanza Blue Co-op", cycles: 5, onTime: 4, rating: 4.3 },
    blurb: "Stock and feed eight floating cages of tilapia to market weight, sold to regional fish traders and hotels.",
    use: [["Fingerlings", 22], ["Feed", 48], ["Cage maintenance", 16], ["Logistics", 14]],
    risks: ["Water quality / fish-kill events", "Price swings at harvest (revenue share, not fixed)", "First co-op cycle that ran late"],
    protect: ["Partial aquaculture insurance", "Water-quality monitoring", "Milestone escrow release"],
    fail: "Revenue share means returns follow the actual sale. A poor harvest can return less than you put in — the downside scenario shows a possible 12% loss. This is not a fixed return.",
    updates: [["Month 1", "All eight cages stocked; mean weight tracking to plan."]] },
  { id: "naivasha-greenhouse", title: "Naivasha Greenhouse Tomatoes", cycle: "Cycle 3", venture: "greenhouse", vlabel: "Greenhouse",
    location: "Nakuru County", grade: "A", model: "Fixed-return note", range: "13–16%", exp: 15, down: 7, months: 4,
    minc: KES(500), target: KES(700000), base: KES(268000), investors: 54, daysLeft: 14,
    sponsor: { name: "Rift Fresh Ltd", cycles: 12, onTime: 12, rating: 4.9 },
    blurb: "Drip-irrigated, climate-controlled tomato cycle with a standing supermarket supply contract.",
    use: [["Seedlings", 24], ["Nutrients & water", 30], ["Labour", 26], ["Packaging", 20]],
    risks: ["Pest pressure — mitigated by controlled environment", "Buyer demand shifts"],
    protect: ["Irrigated (not rain-dependent)", "Standing supermarket contract", "Crop insurance"],
    fail: "Lowest-risk listing: irrigated, contracted buyer, proven sponsor. Even the downside scenario stays positive at about KES 7 per 100.",
    updates: [] },
  { id: "kitui-honey", title: "Kitui Apiary & Honey", cycle: "Season 2", venture: "bees", vlabel: "Beekeeping",
    location: "Kitui County", grade: "C", model: "Profit share", range: "17–24%", exp: 20, down: -4, months: 5,
    minc: KES(500), target: KES(480000), base: KES(156000), investors: 39, daysLeft: 18,
    sponsor: { name: "Kamba Honey Group", cycles: 2, onTime: 2, rating: 4.1 },
    blurb: "Expand to 120 modern hives, harvest and process honey sold under a local premium brand.",
    use: [["Hives & equipment", 44], ["Bee colonies", 20], ["Processing", 22], ["Branding & sales", 14]],
    risks: ["Rainfall affects flowering & yield", "Younger sponsor track record", "Profit share — variable"],
    protect: ["Diversified hive sites", "Milestone escrow release"],
    fail: "Profit share with a small downside. A dry season can mean a slight loss — the downside scenario shows roughly 4% down.",
    updates: [] },
];

const DICT = {
  en: { home: "Home", discover: "Discover", wallet: "Wallet", learn: "Learn", profile: "Profile", invest: "Invest",
    pool: "Join the pool", solo: "Invest solo", projReturn: "Projected return", fail: "What if it fails?",
    expected: "Expected", downside: "Downside", min: "Min", net: "Portfolio value", returns: "Returns earned", greet: "Habari, Daniel" },
  sw: { home: "Nyumbani", discover: "Gundua", wallet: "Pochi", learn: "Jifunze", profile: "Wasifu", invest: "Wekeza",
    pool: "Jiunge na kikundi", solo: "Wekeza peke yako", projReturn: "Faida inayotarajiwa", fail: "Je, ikishindwa?",
    expected: "Inayotarajiwa", downside: "Hasara", min: "Chini", net: "Thamani ya jumla", returns: "Faida", greet: "Habari, Daniel" },
};

function GradeChip({ g }) {
  return <span className="grade" style={{ background: GRADE[g] + "1a", color: GRADE[g] }}>
    <span className="g" style={{ background: GRADE[g] }}>{g}</span>Risk {g}</span>;
}
function Bar({ pct, terra }) { return <div className={"bar" + (terra ? " terra" : "")}><i style={{ width: Math.min(100, pct) + "%" }} /></div>; }
function VIcon({ venture, size = 22, sw = 1.6 }) { const I = VEN[venture].Icon; return <I size={size} strokeWidth={sw} />; }

/* ================================ APP ================================ */
export default function AgriVestComplete() {
  const [lang, setLang] = useState("en");
  const t = DICT[lang];
  const [onboarded, setOnboarded] = useState(false);
  const [kyc, setKyc] = useState(false);
  const [tab, setTab] = useState("home");
  const [openP, setOpenP] = useState(null);
  const [showFail, setShowFail] = useState(false);
  const [invest, setInvest] = useState(null);
  const [sponsor, setSponsor] = useState(false);
  const [engine, setEngine] = useState(false);
  const [toast, setToast] = useState(null);

  // ---- the working ledger ----
  const [entries, setEntries] = useState([
    { id: "je1", kind: "deposit", ts: Date.now(), ref: "MP-seed",
      postings: [{ account: "mpesa_clearing", amount: KES(12000) }, { account: "wallet:me", amount: -KES(12000) }] },
  ]);
  const [positions, setPositions] = useState([]);
  const balances = useMemo(() => computeBalances(entries), [entries]);
  const walletC = bal(balances, "wallet:me");

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const myEscrow = (pid) => positions.filter((p) => p.project === pid && p.status === "active").reduce((s, p) => s + p.amount, 0);
  const raisedC = (proj) => proj.base + myEscrow(proj.id);

  const deposit = (amtC) => {
    const ref = "MP" + Date.now();
    setEntries((es) => [...es, { id: "je" + (es.length + 1), kind: "deposit", ts: Date.now(), ref,
      postings: [{ account: "mpesa_clearing", amount: amtC }, { account: "wallet:me", amount: -amtC }] }]);
    flash("Deposit received via M-Pesa");
  };
  const withdraw = (amtC) => {
    if (walletC < amtC) return flash("Insufficient balance");
    setEntries((es) => [...es, { id: "je" + (es.length + 1), kind: "withdraw", ts: Date.now(), ref: "WD" + Date.now(),
      postings: [{ account: "wallet:me", amount: amtC }, { account: "mpesa_clearing", amount: -amtC }] }]);
    flash("Withdrawal sent to M-Pesa");
  };
  const doInvest = (pid, amtC) => {
    if (walletC < amtC) { flash("Top up your wallet first"); return false; }
    const id = "je" + (entries.length + 1);
    setEntries((es) => [...es, { id: "je" + (es.length + 1), kind: "invest", ts: Date.now(),
      postings: [{ account: "wallet:me", amount: amtC }, { account: "escrow:" + pid, amount: -amtC }] }]);
    setPositions((ps) => [{ entryId: id, project: pid, amount: amtC, ts: Date.now(), status: "active" }, ...ps]);
    return true;
  };
  const cancel = (entryId) => {
    const pos = positions.find((p) => p.entryId === entryId);
    const orig = entries.find((e) => e.id === entryId);
    if (!pos || pos.status !== "active" || !orig) return;
    setEntries((es) => [...es, { id: "je" + (es.length + 1), kind: "reverse:invest", ts: Date.now(), reverses: entryId,
      postings: orig.postings.map((p) => ({ account: p.account, amount: -p.amount })) }]);
    setPositions((ps) => ps.map((p) => (p.entryId === entryId ? { ...p, status: "refunded" } : p)));
    flash("Refunded — within the 48h cooling-off window");
  };
  const completeCycle = (pos) => {
    const proj = PROJECTS.find((p) => p.id === pos.project);
    const principal = pos.amount;
    const gross = Math.round(principal * (1 + proj.exp / 100));
    const profit = gross - principal;
    const fee = Math.round(Math.max(0, profit) * 0.1);
    const payout = gross - fee;
    setEntries((es) => {
      let n = es.length; const ne = [...es];
      const add = (kind, postings, extra = {}) => { n++; ne.push({ id: "je" + n, kind, ts: Date.now(), postings, ...extra }); };
      add("disburse", [{ account: "escrow:" + proj.id, amount: principal }, { account: "mpesa_clearing", amount: -principal }]);
      add("return", [{ account: "mpesa_clearing", amount: gross }, { account: "returns:" + proj.id, amount: -gross }]);
      if (fee > 0) add("fee", [{ account: "returns:" + proj.id, amount: fee }, { account: "platform_fees", amount: -fee }]);
      add("payout", [{ account: "returns:" + proj.id, amount: payout }, { account: "wallet:me", amount: -payout }]);
      return ne;
    });
    setPositions((ps) => ps.map((p) => (p.entryId === pos.entryId ? { ...p, status: "paid", realized: payout } : p)));
    flash("Cycle complete — return paid to your wallet");
  };

  const realizedReturns = positions.filter((p) => p.status === "paid").reduce((s, p) => s + (p.realized - p.amount), 0);
  const activePositions = positions.filter((p) => p.status !== "refunded");

  const openProject = (p) => { setShowFail(false); setOpenP(p); };
  const startInvest = (mode) => { if (!kyc) { flash("Complete KYC to invest"); return; } setInvest({ step: "amount", mode, amount: openP.minc }); };
  const confirmInvest = () => { setInvest((iv) => ({ ...iv, step: "processing" })); setTimeout(() => setInvest((iv) => ({ ...iv, step: "done" })), 1700); };
  const finishInvest = () => { doInvest(openP.id, invest.amount); setInvest(null); setOpenP(null); setTab("home"); };

  return (
    <div className="av stage">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="phone">
        <div className="notch" />
        <div className="statusbar">
          <span className="tnum">9:41</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11 }}>5G</span>
            <span style={{ width: 22, height: 11, border: "1.5px solid var(--ink)", borderRadius: 3, position: "relative", display: "inline-block" }}>
              <span style={{ position: "absolute", inset: 1.5, right: 6, background: "var(--ink)", borderRadius: 1 }} />
            </span>
          </span>
        </div>

        <div className="screen">
          {tab === "home" && <HomeView {...{ t, walletC, realizedReturns, activePositions, openProject, setTab, completeCycle, kyc, setEngine, lang, setLang }} />}
          {tab === "discover" && <DiscoverView {...{ t, openProject, raisedC, lang, setLang }} />}
          {tab === "wallet" && <WalletView {...{ t, walletC, entries, deposit, withdraw, lang, setLang }} />}
          {tab === "learn" && <LearnView {...{ t, lang, setLang }} />}
          {tab === "profile" && <ProfileView {...{ t, kyc, setSponsor, setEngine, lang, setLang }} />}
        </div>

        {openP && <ProjectDetail {...{ p: openP, t, showFail, setShowFail, raisedC, onClose: () => setOpenP(null), onInvest: startInvest, kyc }} />}
        {invest && openP && <InvestSheet {...{ p: openP, invest, setInvest, t, onConfirm: confirmInvest, onFinish: finishInvest, onCancel: () => setInvest(null) }} />}
        {sponsor && <div style={{ position: "absolute", left: 0, right: 0, top: 46, bottom: 0, zIndex: 75 }}><SponsorDash onClose={() => setSponsor(false)} flash={flash} /></div>}
        {engine && <div style={{ position: "absolute", left: 0, right: 0, top: 46, bottom: 0, zIndex: 76 }}><EngineView {...{ entries, balances, onClose: () => setEngine(false) }} /></div>}
        {!onboarded && <div style={{ position: "absolute", left: 0, right: 0, top: 46, bottom: 0, zIndex: 95 }}><Onboarding onDone={() => { setOnboarded(true); setKyc(true); }} /></div>}

        {toast && <div className="pop" style={{ position: "absolute", left: 16, right: 16, bottom: 86, zIndex: 90, background: "var(--green-800)", color: "var(--cream)", padding: "13px 16px", borderRadius: 14, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 9, boxShadow: "0 10px 30px #14271c55" }}>
          <CheckCircle2 size={17} style={{ color: "#9fe0ad" }} /> {toast}</div>}

        <div className="tabbar">
          {[["home", Home, t.home], ["discover", Compass, t.discover], ["wallet", Wallet, t.wallet], ["learn", GraduationCap, t.learn], ["profile", User, t.profile]].map(([k, Ic, label]) => (
            <button key={k} className={"tab" + (tab === k ? " active" : "")} onClick={() => { setTab(k); setOpenP(null); }}>
              <Ic size={21} strokeWidth={tab === k ? 2.4 : 1.9} />{label}<span className="dot" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LangToggle({ lang, setLang }) {
  return <div className="seg" style={{ width: 92, padding: 3 }}>
    {["en", "sw"].map((l) => <button key={l} className={lang === l ? "on" : ""} style={{ padding: "6px 0", fontSize: 12 }} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
  </div>;
}

/* ------------------------------- HOME ------------------------------- */
function HomeView({ t, walletC, realizedReturns, activePositions, openProject, setTab, completeCycle, kyc, setEngine, lang, setLang }) {
  const portfolio = walletC + activePositions.filter((p) => p.status === "active").reduce((s, p) => s + p.amount, 0);
  return (
    <div className="pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div className="h-eyebrow">Agri Vest</div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{t.greet}</div></div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="fade" style={{ borderRadius: 24, padding: "20px 20px 18px", color: "var(--cream)", position: "relative", overflow: "hidden", background: "radial-gradient(120% 100% at 90% 0%, #2e6b43 0%, #14271c 70%)" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "#5b9a4e22" }} />
        <div style={{ fontSize: 12, fontWeight: 700, opacity: .8 }}>{t.net}</div>
        <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.05 }}>{fmt(portfolio)}</div>
        <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
          <div><div style={{ fontSize: 11, opacity: .75, fontWeight: 600 }}>{t.returns}</div>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: "#9fe0ad" }}>+{fmt(realizedReturns)}</div></div>
          <div style={{ borderLeft: "1px solid #ffffff22", paddingLeft: 18 }}><div style={{ fontSize: 11, opacity: .75, fontWeight: 600 }}>Active</div>
            <div className="tnum" style={{ fontSize: 16, fontWeight: 700 }}>{activePositions.filter((p) => p.status === "active").length}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 13, fontSize: 11, opacity: .72 }}><Info size={13} /> Returns are projected until a cycle pays out.</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "22px 0 11px" }}>
        <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)" }}>Your projects</div>
        <button className="btn" onClick={() => setTab("discover")} style={{ background: "none", color: "var(--terra)", fontSize: 13 }}>Browse more →</button>
      </div>
      {activePositions.length === 0 && (
        <div className="card" style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
          No investments yet. Open <b style={{ color: "var(--green-700)" }}>Discover</b> and back a project from KES 500.
        </div>
      )}
      {activePositions.map((pos, i) => {
        const proj = PROJECTS.find((p) => p.id === pos.project);
        return (
          <div key={i} className="card fade" style={{ padding: 13, marginBottom: 11, animationDelay: i * 60 + "ms" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => openProject(proj)} style={{ width: 46, height: 46, borderRadius: 13, background: VEN[proj.venture].g, display: "grid", placeItems: "center", color: "#fff", border: "none", cursor: "pointer" }}>
                <VIcon venture={proj.venture} /></button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proj.title}</div>
                <div className="tnum" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{fmt(pos.amount)} · {proj.range}</div>
              </div>
              <span className="chip" style={{ background: pos.status === "paid" ? "#2e7d461a" : "#c99a3a1a", color: pos.status === "paid" ? "var(--gA)" : "var(--gold)" }}>{pos.status === "paid" ? "Paid out" : "Active"}</span>
            </div>
            {pos.status === "active" && (
              <button className="btn btn-ghost" onClick={() => completeCycle(pos)} style={{ width: "100%", marginTop: 11, padding: "10px", fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <RefreshCw size={15} /> Simulate cycle → get paid (demo)
              </button>
            )}
            {pos.status === "paid" && (
              <div className="tnum" style={{ marginTop: 9, fontSize: 12.5, color: "var(--gA)", fontWeight: 700 }}>Received {fmt(pos.realized)} · profit +{fmt(pos.realized - pos.amount)}</div>
            )}
          </div>
        );
      })}

      <button className="btn" onClick={() => setEngine(true)} style={{ width: "100%", marginTop: 8, padding: 13, borderRadius: 16, background: "#1f4a2c10", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, color: "var(--green-700)" }}>
        <Layers size={18} /><span style={{ flex: 1, textAlign: "left", fontWeight: 700, fontSize: 13.5 }}>Peek at the ledger engine</span><ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ----------------------------- DISCOVER ----------------------------- */
function DiscoverView({ t, openProject, raisedC, lang, setLang }) {
  return (
    <div className="pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)" }}>{t.discover}</div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 14px", borderRadius: 15, marginBottom: 13 }}>
        <Search size={18} style={{ color: "var(--muted)" }} /><span style={{ color: "var(--muted)", fontSize: 14 }}>Search ventures, counties…</span>
      </div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
        {["All", "Poultry", "Aquaculture", "Horticulture", "Bees", "Greenhouse"].map((f, i) => (
          <span key={f} className="chip" style={{ background: i === 0 ? "var(--green-700)" : "#1f4a2c12", color: i === 0 ? "var(--cream)" : "var(--green-700)", padding: "8px 13px", fontSize: 12.5 }}>{f}</span>
        ))}
      </div>
      {PROJECTS.map((p, i) => {
        const pct = Math.round((raisedC(p) / p.target) * 100);
        return (
          <button key={p.id} className="card fade" onClick={() => openProject(p)} style={{ width: "100%", textAlign: "left", padding: 0, overflow: "hidden", border: "1px solid var(--line)", cursor: "pointer", animationDelay: i * 70 + "ms", marginBottom: 14 }}>
            <div className="venthumb" style={{ background: VEN[p.venture].g }}>
              <VIcon venture={p.venture} size={46} sw={1.5} /><span className="vlabel">{p.vlabel} · {p.location}</span>
              <span style={{ position: "absolute", top: 12, right: 12 }}><GradeChip g={p.grade} /></span>
            </div>
            <div style={{ padding: "13px 15px 15px" }}>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 11 }}>{p.cycle} · {p.model}</div>
              <div style={{ display: "flex", gap: 14, marginBottom: 11 }}>
                <div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>PROJECTED</div>
                  <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--green-700)" }}>{p.range}</div></div>
                <div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>CYCLE</div>
                  <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>{p.months} mo</div></div>
              </div>
              <Bar pct={pct} terra />
              <div className="tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>
                <span style={{ color: "var(--terra)" }}>{pct}% funded</span><span>{p.investors} investors · {p.daysLeft}d left</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------- PROJECT DETAIL -------------------------- */
function ProjectDetail({ p, t, showFail, setShowFail, raisedC, onClose, onInvest, kyc }) {
  const pct = Math.round((raisedC(p) / p.target) * 100);
  return (
    <div className="overlay">
      <div className="venthumb" style={{ background: VEN[p.venture].g, height: 196 }}>
        <button className="btn" onClick={onClose} style={{ position: "absolute", top: 14, left: 14, width: 38, height: 38, borderRadius: 12, background: "#0003", color: "#fff", display: "grid", placeItems: "center", backdropFilter: "blur(6px)" }}><ChevronLeft size={22} /></button>
        <span style={{ position: "absolute", top: 16, right: 14 }}><GradeChip g={p.grade} /></span>
        <VIcon venture={p.venture} size={58} sw={1.4} />
        <span className="vlabel" style={{ fontSize: 14 }}><MapPin size={13} style={{ verticalAlign: -2 }} /> {p.location}</span>
      </div>
      <div className="pad" style={{ paddingBottom: 110 }}>
        <div className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)", lineHeight: 1.12 }}>{p.title}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{p.cycle} · {p.model}</div>

        <div className="card" style={{ display: "flex", marginTop: 16, padding: "14px 4px", borderRadius: 18 }}>
          {[[t.projReturn, p.range, "var(--green-700)"], ["Cycle", p.months + " mo", "var(--ink)"], [t.min, fmt(p.minc), "var(--ink)"]].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid var(--line)" : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)" }}>{String(s[0]).toUpperCase()}</div>
              <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: s[2] }}>{s[1]}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <Bar pct={pct} terra />
          <div className="tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ color: "var(--terra)" }}>{fmt(raisedC(p))} <span style={{ color: "var(--muted)" }}>of {fmt(p.target)}</span></span>
            <span style={{ color: "var(--muted)" }}><Users size={12} style={{ verticalAlign: -1 }} /> {p.investors} · {p.daysLeft}d</span>
          </div>
        </div>

        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "20px 0 7px" }}>The venture</div>
        <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.55 }}>{p.blurb}</div>

        <div className="card" style={{ padding: 15, marginTop: 14, display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--green-700)", color: "var(--cream)", display: "grid", placeItems: "center" }} className="serif"><span style={{ fontWeight: 600 }}>{p.sponsor.name[0]}</span></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{p.sponsor.name}</div>
            <div className="tnum" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{p.sponsor.onTime}/{p.sponsor.cycles} cycles repaid on time</div>
          </div>
          <span className="chip tnum" style={{ background: "#c99a3a1a", color: "var(--gold)" }}><Star size={12} fill="var(--gold)" /> {p.sponsor.rating}</span>
        </div>

        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "22px 0 10px" }}>The numbers</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, padding: 14, borderRadius: 16, background: "#2e7d4612", border: "1px solid #2e7d4633" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gA)" }}>{t.expected.toUpperCase()}</div>
            <div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: "var(--gA)" }}>+{p.exp}%</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>over {p.months} months</div>
          </div>
          <div style={{ flex: 1, padding: 14, borderRadius: 16, background: p.down < 0 ? "#b5482f12" : "#c99a3a12", border: "1px solid " + (p.down < 0 ? "#b5482f33" : "#c99a3a33") }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.down < 0 ? "var(--gE)" : "var(--gold)" }}>{t.downside.toUpperCase()}</div>
            <div className="serif tnum" style={{ fontSize: 22, fontWeight: 600, color: p.down < 0 ? "var(--gE)" : "var(--gold)" }}>{p.down < 0 ? "−" + Math.abs(p.down) : "+" + p.down}%</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.down < 0 ? "loss possible" : "modelled floor"}</div>
          </div>
        </div>

        <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "20px 0 10px" }}>Use of funds</div>
        {p.use.map((u, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}><span>{u[0]}</span><span className="tnum" style={{ color: "var(--muted)" }}>{u[1]}%</span></div>
            <Bar pct={u[1]} />
          </div>
        ))}

        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "22px 0 10px" }}>The risks</div>
        {p.risks.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9, fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>
            <AlertTriangle size={16} style={{ color: "var(--gD)", flexShrink: 0, marginTop: 1 }} /> {r}
          </div>
        ))}

        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "20px 0 10px" }}>Protections in place</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {p.protect.map((pr, i) => <span key={i} className="chip" style={{ background: "#2e7d461a", color: "var(--gA)", padding: "7px 11px" }}><ShieldCheck size={13} /> {pr}</span>)}
        </div>

        <button className="btn" onClick={() => setShowFail(!showFail)} style={{ width: "100%", marginTop: 18, padding: 15, borderRadius: 16, background: "#b5482f10", border: "1px solid #b5482f33", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
          <AlertTriangle size={18} style={{ color: "var(--gE)" }} /><span style={{ flex: 1, fontWeight: 700, color: "var(--gE)", fontSize: 14 }}>{t.fail}</span>
          <ChevronRight size={18} style={{ color: "var(--gE)", transform: showFail ? "rotate(90deg)" : "none", transition: ".2s" }} />
        </button>
        {showFail && <div className="fade" style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, padding: "13px 4px 0" }}>{p.fail}</div>}

        {p.updates.length > 0 && <>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "22px 0 10px" }}>Updates</div>
          {p.updates.map((u, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: 6, background: "var(--green-500)" }} />
                {i < p.updates.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--line)" }} />}
              </div>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: "var(--green-700)" }}>{u[0]}</div>
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{u[1]}</div></div>
            </div>
          ))}
        </>}
      </div>

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px 18px", background: "linear-gradient(transparent,var(--paper) 26%)", display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => onInvest("solo")} style={{ padding: "15px 18px", fontSize: 14 }}>{t.solo}</button>
        <button className="btn btn-primary" onClick={() => onInvest("pool")} style={{ flex: 1, padding: "15px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Users size={18} /> {t.pool}</button>
      </div>
    </div>
  );
}

/* ----------------------------- INVEST SHEET ----------------------------- */
function InvestSheet({ p, invest, setInvest, t, onConfirm, onFinish, onCancel }) {
  const { step, mode, amount } = invest;
  const units = Math.round(amount / p.minc);
  const expKes = Math.round(amount * (p.exp / 100));
  const downKes = Math.round(amount * (p.down / 100));
  const setAmt = (v) => setInvest((iv) => ({ ...iv, amount: Math.max(p.minc, v) }));
  return (
    <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget && step !== "processing") onCancel(); }}>
      <div className="sheet-inner">
        {step !== "done" && step !== "processing" && <div style={{ padding: "8px 0 0", display: "flex", justifyContent: "center" }}><div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--line)" }} /></div>}
        {step === "amount" && (
          <div className="pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{mode === "pool" ? t.pool : t.solo}</div>
              <button className="btn" onClick={onCancel} style={{ background: "none", color: "var(--muted)", padding: 4 }}><X size={22} /></button>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>{p.title} · {p.range} projected over {p.months} months</div>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>YOU INVEST</div>
              <div className="serif tnum" style={{ fontSize: 42, fontWeight: 600, color: "var(--green-700)" }}>{fmt(amount)}</div>
              {mode === "pool" && <div className="tnum" style={{ fontSize: 13, color: "var(--terra)", fontWeight: 700 }}>= {units} unit{units > 1 ? "s" : ""} of the pool</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 10px" }}>
              <button className="btn btn-ghost" onClick={() => setAmt(amount - p.minc)} style={{ width: 48, height: 48, display: "grid", placeItems: "center" }}><Minus size={20} /></button>
              <input type="range" min={p.minc} max={mode === "pool" ? KES(50000) : KES(200000)} step={p.minc} value={amount} onChange={(e) => setAmt(+e.target.value)} style={{ flex: 1, accentColor: "var(--green-600)" }} />
              <button className="btn btn-ghost" onClick={() => setAmt(amount + p.minc)} style={{ width: 48, height: 48, display: "grid", placeItems: "center" }}><Plus size={20} /></button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[500, 1000, 5000, 10000].map((q) => (
                <button key={q} className="btn" onClick={() => setAmt(KES(q))} style={{ flex: 1, padding: "9px 0", fontSize: 12.5, background: amount === KES(q) ? "var(--green-700)" : "#1f4a2c12", color: amount === KES(q) ? "var(--cream)" : "var(--green-700)" }}>{q >= 1000 ? q / 1000 + "k" : q}</button>
              ))}
            </div>
            <div className="card" style={{ padding: 15, display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: "var(--gA)" }}>{t.expected.toUpperCase()} RETURN</div>
                <div className="serif tnum" style={{ fontSize: 19, fontWeight: 600, color: "var(--gA)" }}>+{fmt(expKes)}</div></div>
              <div style={{ flex: 1, borderLeft: "1px solid var(--line)", paddingLeft: 12 }}><div style={{ fontSize: 11, fontWeight: 700, color: p.down < 0 ? "var(--gE)" : "var(--gold)" }}>{t.downside.toUpperCase()}</div>
                <div className="serif tnum" style={{ fontSize: 19, fontWeight: 600, color: p.down < 0 ? "var(--gE)" : "var(--gold)" }}>{p.down < 0 ? "−" + fmt(Math.abs(downKes)) : "+" + fmt(downKes)}</div></div>
            </div>
            <button className="btn btn-primary" onClick={() => setInvest((iv) => ({ ...iv, step: "review" }))} style={{ width: "100%", padding: 16, fontSize: 15, marginTop: 16 }}>Review</button>
          </div>
        )}
        {step === "review" && (
          <div className="pad">
            <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>Confirm your investment</div>
            <div className="card" style={{ padding: 16 }}>
              {[["Project", p.title], ["Type", mode === "pool" ? "Pooled · " + units + " units" : "Solo"], ["You invest", fmt(amount)], ["Cycle", p.months + " months"], ["Expected return", "+" + fmt(expKes)]].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < 4 ? "1px solid var(--line)" : "none", fontSize: 13.5 }}>
                  <span style={{ color: "var(--muted)", fontWeight: 600 }}>{r[0]}</span><span className="tnum" style={{ color: "var(--ink)", fontWeight: 700 }}>{r[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: "#b5482f0d", border: "1px solid #b5482f33" }}>
              <div style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45, marginBottom: 9 }}>
                <AlertTriangle size={17} style={{ color: "var(--gE)", flexShrink: 0 }} /><span>This is <b>not a guaranteed return</b>. {p.down < 0 ? "You could lose part of your money." : "Returns can be lower than projected."}</span></div>
              <div style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45, marginBottom: 9 }}>
                <Clock size={17} style={{ color: "var(--gold)", flexShrink: 0 }} /><span><b>Committed until the cycle ends</b> (~{p.months} months). No early exit after cooling-off.</span></div>
              <div style={{ display: "flex", gap: 9, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>
                <ShieldCheck size={17} style={{ color: "var(--gA)", flexShrink: 0 }} /><span><b>48-hour cooling-off:</b> cancel for a full refund within 48 hours.</span></div>
            </div>
            <button className="btn btn-primary" onClick={onConfirm} style={{ width: "100%", padding: 16, fontSize: 15, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Smartphone size={18} /> Pay {fmt(amount)} via M-Pesa</button>
            <button className="btn" onClick={() => setInvest((iv) => ({ ...iv, step: "amount" }))} style={{ width: "100%", padding: 12, background: "none", color: "var(--muted)", marginTop: 4 }}>Back</button>
          </div>
        )}
        {step === "processing" && (
          <div className="pad" style={{ textAlign: "center", padding: "54px 30px" }}>
            <div className="spin" style={{ width: 56, height: 56, borderRadius: "50%", border: "4px solid #1f4a2c22", borderTopColor: "var(--green-600)", margin: "0 auto 22px" }} />
            <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>Check your phone</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>An M-Pesa prompt for <b className="tnum">{fmt(amount)}</b> has been sent. Enter your PIN to confirm.</div>
          </div>
        )}
        {step === "done" && (
          <div className="pad" style={{ textAlign: "center", padding: "44px 28px 32px" }}>
            <div className="pop" style={{ width: 72, height: 72, borderRadius: "50%", background: "#2e7d4618", display: "grid", placeItems: "center", margin: "0 auto 18px" }}><CheckCircle2 size={42} style={{ color: "var(--gA)" }} /></div>
            <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)" }}>You're in</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}><b className="tnum">{fmt(amount)}</b> committed to {p.title}{mode === "pool" ? " · " + units + " units" : ""}.</div>
            <div style={{ marginTop: 16, padding: 13, borderRadius: 13, background: "#2e7d4610", fontSize: 12.5, color: "var(--green-800)", lineHeight: 1.45, display: "flex", gap: 9, textAlign: "left" }}>
              <ShieldCheck size={17} style={{ color: "var(--gA)", flexShrink: 0 }} /><span>Changed your mind? Cancel for a full refund until <b>48 hours from now</b>.</span></div>
            <button className="btn btn-primary" onClick={onFinish} style={{ width: "100%", padding: 15, fontSize: 15, marginTop: 18 }}>View my portfolio</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ WALLET ------------------------------ */
function WalletView({ t, walletC, entries, deposit, withdraw, lang, setLang }) {
  const [modal, setModal] = useState(null); // 'deposit' | 'withdraw'
  const [amt, setAmt] = useState(2000);
  const txns = [...entries].reverse().filter((e) => e.kind !== "fee").slice(0, 12);
  const txLabel = { deposit: "M-Pesa deposit", withdraw: "Withdrawal to M-Pesa", invest: "Invested", "reverse:invest": "Refund (cooling-off)", payout: "Return paid", disburse: "Released to sponsor", return: "Sponsor repayment" };
  const myDelta = (e) => { const p = e.postings.find((x) => x.account === "wallet:me"); return p ? -p.amount : 0; };
  return (
    <div className="pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)" }}>{t.wallet}</div><LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="card fade" style={{ padding: 20, borderRadius: 22, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>Available balance</div>
        <div className="serif tnum" style={{ fontSize: 34, fontWeight: 600, color: "var(--ink)", margin: "3px 0 16px" }}>{fmt(walletC)}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setModal("deposit"); setAmt(2000); }} style={{ flex: 1, padding: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><ArrowDownLeft size={17} /> Deposit</button>
          <button className="btn btn-ghost" onClick={() => { setModal("withdraw"); setAmt(1000); }} style={{ flex: 1, padding: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><ArrowUpRight size={17} /> Withdraw</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 13, fontSize: 11.5, color: "var(--muted)" }}><Smartphone size={13} /> Deposits & withdrawals via M-Pesa</div>
      </div>
      <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "22px 0 8px" }}>Activity</div>
      {txns.map((e, i) => {
        const d = myDelta(e); const inn = d >= 0;
        return (
          <div key={i} className="card" style={{ padding: "13px 15px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", background: inn ? "#2e7d461a" : "#c65d3b1a", color: inn ? "var(--gA)" : "var(--terra)" }}>{inn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{txLabel[e.kind] || e.kind}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{e.ref || "settled"}</div></div>
            {d !== 0 && <div className="tnum" style={{ fontWeight: 700, fontSize: 14, color: inn ? "var(--gA)" : "var(--ink)" }}>{inn ? "+" : "−"}{fmt(Math.abs(d))}</div>}
          </div>
        );
      })}
      {modal && (
        <div className="sheet" onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="sheet-inner"><div className="pad">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><div style={{ width: 42, height: 5, borderRadius: 5, background: "var(--line)" }} /></div>
            <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: "var(--ink)" }}>{modal === "deposit" ? "Deposit via M-Pesa" : "Withdraw to M-Pesa"}</div>
            <div className="serif tnum" style={{ fontSize: 38, fontWeight: 600, color: "var(--green-700)", textAlign: "center", margin: "16px 0" }}>{fmt(KES(amt))}</div>
            <input type="range" min={500} max={50000} step={500} value={amt} onChange={(e) => setAmt(+e.target.value)} style={{ width: "100%", accentColor: "var(--green-600)" }} />
            <button className="btn btn-primary" onClick={() => { modal === "deposit" ? deposit(KES(amt)) : withdraw(KES(amt)); setModal(null); }} style={{ width: "100%", padding: 16, fontSize: 15, marginTop: 18 }}>
              {modal === "deposit" ? "Send STK push" : "Withdraw"} {fmt(KES(amt))}</button>
          </div></div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- LEARN ------------------------------- */
function LearnView({ t, lang, setLang }) {
  const cards = [["What is a return?", "Faida ni nini?", "var(--green-600)"], ["Why agriculture is risky", "Kwa nini kilimo kina hatari", "var(--gold)"], ["What a risk grade means", "Daraja la hatari ni nini", "var(--terra)"], ["What happens if a project fails", "Mradi ukishindwa", "var(--gE)"]];
  return (
    <div className="pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)" }}>{t.learn}</div><LangToggle lang={lang} setLang={setLang} />
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>Agriculture earns real returns — and carries real risk. Understand both before you invest.</div>
      {cards.map((c, i) => (
        <div key={i} className="card fade" style={{ padding: 16, marginBottom: 11, display: "flex", alignItems: "center", gap: 13, animationDelay: i * 60 + "ms" }}>
          <div style={{ width: 8, height: 40, borderRadius: 8, background: c[2] }} />
          <div style={{ flex: 1 }}><div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{lang === "en" ? c[0] : c[1]}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>3 min read</div></div>
          <ChevronRight size={18} style={{ color: "var(--muted)" }} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ PROFILE ------------------------------ */
function ProfileView({ t, kyc, setSponsor, setEngine, lang, setLang }) {
  const rows = [["Verification & limits", ShieldCheck], ["Payment methods", Wallet], ["Refer & earn", Users], ["Risk disclosures", AlertTriangle]];
  return (
    <div className="pad">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)" }}>{t.profile}</div><LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="card fade" style={{ padding: 18, display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-700)", color: "var(--cream)", display: "grid", placeItems: "center" }} className="serif"><span style={{ fontSize: 22, fontWeight: 600 }}>D</span></div>
        <div style={{ flex: 1 }}><div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Daniel Omulo</div>
          <span className="chip" style={{ background: "#2e7d461a", color: "var(--gA)", marginTop: 3 }}><CheckCircle2 size={13} /> {kyc ? "KYC verified" : "KYC pending"}</span></div>
      </div>
      <button className="btn fade" onClick={() => setSponsor(true)} style={{ width: "100%", textAlign: "left", padding: 16, marginBottom: 12, display: "flex", alignItems: "center", gap: 13, background: "linear-gradient(120deg,#1f4a2c,#14271c)" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#ffffff1a", display: "grid", placeItems: "center", color: "var(--cream)" }}><Sprout size={22} /></div>
        <div style={{ flex: 1 }}><div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--cream)" }}>I'm raising capital</div>
          <div style={{ fontSize: 12, color: "#ffffffaa" }}>Switch to the sponsor dashboard</div></div><ChevronRight size={18} style={{ color: "var(--cream)" }} />
      </button>
      <button className="btn fade" onClick={() => setEngine(true)} style={{ width: "100%", textAlign: "left", padding: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 13, background: "#1f4a2c10", border: "1px solid var(--line)" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#1f4a2c14", display: "grid", placeItems: "center", color: "var(--green-700)" }}><Layers size={22} /></div>
        <div style={{ flex: 1 }}><div className="serif" style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Ledger engine</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>See the double-entry books, live</div></div><ChevronRight size={18} style={{ color: "var(--muted)" }} />
      </button>
      {rows.map((r, i) => { const Ic = r[1]; return (
        <div key={i} className="card fade" style={{ padding: 15, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, animationDelay: i * 50 + "ms" }}>
          <Ic size={19} style={{ color: "var(--green-600)" }} /><div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r[0]}</div><ChevronRight size={18} style={{ color: "var(--muted)" }} />
        </div>
      ); })}
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>Agri Vest is a design prototype. Not a licensed product. Investments carry risk of loss.</div>
    </div>
  );
}

/* --------------------------- ENGINE (ledger) --------------------------- */
function EngineView({ entries, balances, onClose }) {
  const accounts = Object.keys(balances).filter((a) => balances[a] !== 0 || true).sort();
  const recent = [...entries].reverse().slice(0, 8);
  const niceAcc = (a) => a.replace("wallet:me", "wallet:me").replace("mpesa_clearing", "M-Pesa clearing").replace("platform_fees", "Platform fees").replace("escrow:", "escrow · ").replace("returns:", "returns · ");
  return (
    <div className="fade" style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--paper)" }}>
      <div style={{ background: "linear-gradient(120deg,#1f4a2c,#14271c)", color: "var(--cream)", padding: "22px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a", color: "var(--cream)", display: "grid", placeItems: "center" }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 800, letterSpacing: ".06em", fontSize: 13 }}>LEDGER ENGINE</div>
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600, marginTop: 12 }}>The books, live</div>
        <div style={{ fontSize: 12.5, opacity: .82, marginTop: 4, lineHeight: 1.45 }}>Every action posts a balanced double-entry. The whole ledger always nets to zero.</div>
      </div>
      <div className="pad">
        <div className="h-eyebrow" style={{ marginBottom: 8 }}>Account balances</div>
        {accounts.map((a) => {
          const b = bal(balances, a); const t = accType(a);
          return (
            <div key={a} className="card" style={{ padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span className="chip" style={{ background: t === "ASSET" ? "#2e7d461a" : t === "INCOME" ? "#c99a3a1a" : "#1f4a2c12", color: t === "ASSET" ? "var(--gA)" : t === "INCOME" ? "var(--gold)" : "var(--green-700)", fontSize: 9.5 }}>{t}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{niceAcc(a)}</span>
              <span className="tnum serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{fmt(b)}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "6px 2px 18px", fontSize: 12, fontWeight: 700, color: "var(--gA)" }}>
          <CheckCircle2 size={15} /> Ledger balances ✓ (sums to zero)
        </div>

        <div className="h-eyebrow" style={{ marginBottom: 8 }}>Recent journal entries</div>
        {recent.map((e) => (
          <div key={e.id} className="card" style={{ padding: 13, marginBottom: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green-700)" }}>{e.kind}</span>
              <span className="tnum" style={{ fontSize: 11, color: "var(--muted)" }}>{e.id}{e.ref ? " · " + e.ref : ""}</span>
            </div>
            {e.postings.map((p, i) => (
              <div key={i} className="tnum" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--ink)" }}>
                <span style={{ color: "var(--muted)" }}>{p.amount > 0 ? "Dr" : "Cr"} {niceAcc(p.account)}</span>
                <span style={{ fontWeight: 600 }}>{fmt(Math.abs(p.amount))}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, padding: "8px 0 30px", display: "flex", gap: 8 }}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} /> This mirrors the real backend ledger (PostgreSQL, append-only, idempotent M-Pesa receipts, pro-rata payouts).
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ ONBOARDING ------------------------------ */
function Onboarding({ onDone }) {
  const [s, setS] = useState(0);
  const [otp, setOtp] = useState("");
  const next = () => setS((x) => x + 1);
  if (s === 0) return (
    <div style={{ position: "absolute", inset: 0, padding: "40px 26px 26px", display: "flex", flexDirection: "column", color: "var(--cream)", background: "radial-gradient(120% 90% at 80% 0%, #2e6b43 0%, #14271c 72%)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: "#ffffff1a", display: "grid", placeItems: "center", marginBottom: 22 }}><Sprout size={32} /></div>
        <div className="h-eyebrow" style={{ color: "#9fe0ad" }}>Agri Vest</div>
        <div className="serif" style={{ fontSize: 33, fontWeight: 600, lineHeight: 1.12, marginTop: 6 }}>Invest in real African agriculture.</div>
        <div style={{ fontSize: 15, opacity: .85, marginTop: 14, lineHeight: 1.5 }}>Fund vetted farms, livestock and fisheries from KES 500 — solo or pooled. The returns are real, and so is the risk. We show you both.</div>
      </div>
      <button className="btn" onClick={next} style={{ background: "var(--cream)", color: "var(--green-800)", padding: 16, fontSize: 15 }}>Get started</button>
      <div style={{ textAlign: "center", fontSize: 12, opacity: .65, marginTop: 12 }}>Prototype · not a licensed product</div>
    </div>
  );
  if (s === 1) return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 26px 26px", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <div className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)" }}>What's your number?</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, marginBottom: 26, lineHeight: 1.5 }}>We'll send a one-time code. Your phone is your Agri Vest identity — the same one M-Pesa uses.</div>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 16px" }}><span style={{ fontWeight: 700, color: "var(--ink)" }}>🇰🇪 +254</span><span style={{ color: "var(--muted)", fontSize: 15, letterSpacing: ".08em" }}>7•• ••• •••</span></div>
      <div style={{ flex: 1 }} /><button className="btn btn-primary" onClick={next} style={{ padding: 16, fontSize: 15 }}>Send code</button>
    </div>
  );
  if (s === 2) return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 26px 26px", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <div className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)" }}>Enter the code</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, marginBottom: 22 }}>Sent to +254 7•• ••• •••</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="card serif" style={{ width: 54, height: 62, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 600, color: "var(--green-700)", border: otp.length === i ? "2px solid var(--green-600)" : "1px solid var(--line)" }}>{otp[i] || ""}</div>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26, width: 222, marginLeft: "auto", marginRight: "auto", justifyContent: "center" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => <button key={n} className="btn" onClick={() => setOtp((o) => (o + n).slice(0, 4))} style={{ width: 64, height: 46, background: "#1f4a2c12", color: "var(--ink)", fontSize: 18 }}>{n}</button>)}
      </div>
      <div style={{ flex: 1 }} /><button className="btn btn-primary" onClick={next} disabled={otp.length < 4} style={{ padding: 16, fontSize: 15, opacity: otp.length >= 4 ? 1 : .45 }}>Verify</button>
    </div>
  );
  if (s === 3) return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 26px 26px", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <span className="chip" style={{ background: "#c99a3a1a", color: "var(--gold)", alignSelf: "flex-start" }}>Step 1 of 2 · KYC</span>
      <div className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)", marginTop: 14 }}>Verify your identity</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, marginBottom: 22, lineHeight: 1.5 }}>Required before you invest — it keeps the platform safe and is part of being a regulated product.</div>
      <div className="card" style={{ padding: 22, textAlign: "center" }}>
        <div style={{ width: 54, height: 54, borderRadius: 15, background: "#1f4a2c12", display: "grid", placeItems: "center", color: "var(--green-600)", margin: "0 auto 12px" }}><FileText size={26} /></div>
        <div style={{ fontWeight: 700, color: "var(--ink)" }}>Scan your National ID</div><div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>or passport · diaspora supported</div>
      </div>
      <div style={{ flex: 1 }} /><button className="btn btn-primary" onClick={next} style={{ padding: 16, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Camera size={18} /> Scan ID</button>
    </div>
  );
  if (s === 4) return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 26px 26px", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      <span className="chip" style={{ background: "#c99a3a1a", color: "var(--gold)", alignSelf: "flex-start" }}>Step 2 of 2 · KYC</span>
      <div className="serif" style={{ fontSize: 25, fontWeight: 600, color: "var(--ink)", marginTop: 14 }}>Quick selfie check</div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>A liveness check confirms it's really you.</div>
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}><div style={{ width: 168, height: 168, borderRadius: "50%", border: "3px dashed var(--green-500)", display: "grid", placeItems: "center", color: "var(--green-500)" }}><Camera size={48} strokeWidth={1.4} /></div></div>
      <button className="btn btn-primary" onClick={next} style={{ padding: 16, fontSize: 15 }}>Capture</button>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, padding: "36px 26px 26px", background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <div className="pop" style={{ width: 84, height: 84, borderRadius: "50%", background: "#2e7d4618", display: "grid", placeItems: "center" }}><CheckCircle2 size={48} style={{ color: "var(--gA)" }} /></div>
        <div className="serif" style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", marginTop: 18 }}>You're verified</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, lineHeight: 1.5, maxWidth: 260 }}>Welcome to Agri Vest, Daniel. Your wallet is preloaded so you can try investing right away.</div>
      </div>
      <button className="btn btn-primary" onClick={onDone} style={{ padding: 16, fontSize: 15, width: "100%" }}>Enter Agri Vest</button>
    </div>
  );
}

/* ------------------------------ SPONSOR ------------------------------ */
function SponsorDash({ onClose, flash }) {
  const me = PROJECTS[0];
  const [updates, setUpdates] = useState(me.updates);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [wizard, setWizard] = useState(false);
  const pct = Math.round((me.base / me.target) * 100);
  const post = () => { if (draft.trim()) { setUpdates((u) => [["Just now", draft.trim()], ...u]); flash("Update posted to investors"); } setDraft(""); setComposing(false); };
  if (wizard) return <SponsorWizard onClose={() => setWizard(false)} flash={flash} />;
  return (
    <div className="fade" style={{ position: "absolute", inset: 0, overflowY: "auto", background: "var(--paper)" }}>
      <div style={{ background: "linear-gradient(120deg,#1f4a2c,#14271c)", color: "var(--cream)", padding: "22px 18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button className="btn" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: "#ffffff1a", color: "var(--cream)", display: "grid", placeItems: "center" }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight: 800, letterSpacing: ".06em", fontSize: 13 }}>SPONSOR DASHBOARD</div>
        </div>
        <div className="h-eyebrow" style={{ color: "#9fe0ad" }}>{me.sponsor.name}</div>
        <div className="serif" style={{ fontSize: 24, fontWeight: 600 }}>{me.title}</div>
        <div style={{ marginTop: 14 }}><div className="bar terra"><i style={{ width: pct + "%" }} /></div>
          <div className="tnum" style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ color: "#ffd9c2" }}>{fmt(me.base)} raised</span><span style={{ opacity: .8 }}>{pct}% of {fmt(me.target)}</span></div></div>
      </div>
      <div className="pad">
        <div style={{ display: "flex", gap: 10 }}>
          {[[Users, me.investors, "investors", "var(--green-600)"], [Clock, me.daysLeft + "d", "left to raise", "var(--gold)"], [Star, me.sponsor.rating, "rating", "var(--gold)"]].map((c, i) => { const Ic = c[0]; return (
            <div key={i} className="card" style={{ flex: 1, padding: 14, textAlign: "center" }}><Ic size={18} style={{ color: c[3] }} />
              <div className="serif tnum" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>{c[1]}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{c[2]}</div></div>
          ); })}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => setComposing(true)} style={{ flex: 1, padding: 14, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Camera size={17} /> Post update</button>
          <button className="btn btn-ghost" onClick={() => setWizard(true)} style={{ flex: 1, padding: 14, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><Plus size={17} /> New raise</button>
        </div>
        {composing && (
          <div className="card fade" style={{ padding: 14, marginTop: 14 }}>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's the latest on the ground?" style={{ width: "100%", border: "none", outline: "none", resize: "none", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", minHeight: 58, background: "transparent" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <span className="chip" style={{ background: "#1f4a2c12", color: "var(--green-700)" }}><Camera size={13} /> Add photo</span><div style={{ flex: 1 }} />
              <button className="btn" onClick={() => setComposing(false)} style={{ background: "none", color: "var(--muted)", padding: "8px 10px" }}>Cancel</button>
              <button className="btn btn-primary" onClick={post} style={{ padding: "9px 16px", fontSize: 13 }}>Post</button>
            </div>
          </div>
        )}
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)", margin: "22px 0 12px" }}>Investor updates</div>
        {updates.map((u, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}><div style={{ width: 10, height: 10, borderRadius: 6, background: "var(--green-500)" }} />{i < updates.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--line)" }} />}</div>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: "var(--green-700)" }}>{u[0]}</div><div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>{u[1]}</div></div>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, padding: "6px 0 30px", display: "flex", gap: 8 }}><Info size={15} style={{ flexShrink: 0, marginTop: 1 }} /> Photo-backed updates are required before each milestone escrow release.</div>
      </div>
    </div>
  );
}

function SponsorWizard({ onClose, flash }) {
  const [s, setS] = useState(0);
  const [v, setV] = useState("poultry");
  const [amt, setAmt] = useState(850000);
  const [model, setModel] = useState("Fixed-return note");
  const VT = [["poultry", "Poultry", Egg], ["fish", "Aquaculture", Fish], ["horticulture", "Horticulture", Sprout], ["dairy", "Dairy", Milk], ["bees", "Beekeeping", Hexagon], ["greenhouse", "Greenhouse", Leaf]];
  if (s === 2) return (
    <div className="fade" style={{ position: "absolute", inset: 0, background: "var(--paper)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center", padding: "30px 28px" }}>
      <div className="pop" style={{ width: 80, height: 80, borderRadius: "50%", background: "#2e7d4618", display: "grid", placeItems: "center" }}><CheckCircle2 size={44} style={{ color: "var(--gA)" }} /></div>
      <div className="serif" style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", marginTop: 18 }}>Submitted for review</div>
      <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}>Our agronomy & credit team will underwrite your venture, assign a risk grade, and come back with an offer. Most reviews take 3–5 days.</div>
      <button className="btn btn-primary" onClick={() => { flash("Project submitted for underwriting"); onClose(); }} style={{ padding: 15, fontSize: 15, width: "100%", marginTop: 24 }}>Back to dashboard</button>
    </div>
  );
  return (
    <div className="fade" style={{ position: "absolute", inset: 0, background: "var(--paper)", overflowY: "auto" }}>
      <div className="pad">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <button className="btn" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, background: "#1f4a2c12", color: "var(--green-700)", display: "grid", placeItems: "center" }}><X size={20} /></button>
          <span className="chip" style={{ background: "#c99a3a1a", color: "var(--gold)" }}>Step {s + 1} of 2</span>
        </div>
        {s === 0 && (<>
          <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)", margin: "10px 0 4px" }}>What are you raising for?</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Pick the venture type investors will see.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {VT.map(([key, label, Ic]) => (
              <button key={key} className="card" onClick={() => setV(key)} style={{ padding: 16, textAlign: "left", cursor: "pointer", border: v === key ? "2px solid var(--green-600)" : "1px solid var(--line)", background: v === key ? "#2e7d460d" : "#fff" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: VEN[key].g, display: "grid", placeItems: "center", color: "#fff", marginBottom: 8 }}><Ic size={20} strokeWidth={1.6} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setS(1)} style={{ width: "100%", padding: 15, fontSize: 15, marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Continue <ArrowRight size={18} /></button>
        </>)}
        {s === 1 && (<>
          <div className="serif" style={{ fontSize: 23, fontWeight: 600, color: "var(--ink)", margin: "10px 0 16px" }}>The raise</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>AMOUNT SOUGHT</div>
          <div className="serif tnum" style={{ fontSize: 30, fontWeight: 600, color: "var(--green-700)" }}>{fmt(KES(amt))}</div>
          <input type="range" min={100000} max={100000000} step={50000} value={amt} onChange={(e) => setAmt(+e.target.value)} style={{ width: "100%", accentColor: "var(--green-600)", margin: "10px 0 4px" }} />
          <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", gap: 6 }}><Info size={14} /> Regulatory cap: KES 100,000,000 per 12 months.</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "20px 0 8px" }}>RETURN MODEL</div>
          {["Fixed-return note", "Revenue share", "Harvest payout", "Equity-style"].map((m) => (
            <button key={m} className="card" onClick={() => setModel(m)} style={{ width: "100%", textAlign: "left", padding: "13px 15px", marginBottom: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 11, border: model === m ? "2px solid var(--green-600)" : "1px solid var(--line)" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + (model === m ? "var(--green-600)" : "var(--line)"), display: "grid", placeItems: "center", flexShrink: 0 }}>{model === m && <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--green-600)" }} />}</div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{m}</span>
            </button>
          ))}
          <button className="btn btn-primary" onClick={() => setS(2)} style={{ width: "100%", padding: 15, fontSize: 15, marginTop: 10 }}>Submit for review</button>
        </>)}
      </div>
    </div>
  );
}
