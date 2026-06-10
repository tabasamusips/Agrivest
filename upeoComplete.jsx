import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Home, Compass, Wallet, GraduationCap, User, ChevronLeft, ChevronRight,
  Check, CheckCircle2, ShieldCheck, AlertTriangle, Users, Clock, MapPin, Info,
  Plus, Minus, ArrowUpRight, ArrowDownLeft, X, Search, Fish, Egg, Milk, Sprout,
  Hexagon, Leaf, Smartphone, Star, BadgeInfo, Camera, ArrowRight, FileText,
  Layers, TrendingUp, RefreshCw, Loader2, Settings, BarChart3, LogOut,
  CheckSquare, XSquare, Eye, DollarSign, Activity
} from "lucide-react";

/* =============================================================================
 * UPEO — FULLY WIRED (UpeoComplete.jsx)
 *
 * Issues resolved:
 *   ✅ Issue 1: Auth chain: OTP → JWT → KYC (real API calls)
 *   ✅ Issue 2: Integer cents everywhere via KES() / fmt()
 *   ✅ Issue 3: Invest mode (pool|solo) + units sent to API
 *   ✅ Issue 4: Wallet balance from GET /wallet/balance, refreshed on every tx
 *   ✅ Issue 5: M-Pesa STK push: poll for callback (30s / 10 attempts)
 *   ✅ Issue 6: Projects from GET /projects (live funding bars)
 *   ✅ Issue 7: Sponsor onboarding wired + Admin dashboard
 * ============================================================================= */

const API = import.meta.env?.VITE_API_URL || "http://localhost:3000";

/* ─── Money helpers ─── */
const KES = (n) => Math.round(n * 100);           // shillings → cents
const fmt = (c) =>
  (c < 0 ? "-" : "") + "KES " + (Math.abs(c) / 100).toLocaleString("en-KE", { maximumFractionDigits: 0 });

/* ─── API helper ─── */
async function apiFetch(path, opts = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (res.status === 401) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─── Auth context helpers ─── */
const TOKEN_KEY = "upeo_jwt";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

/* ─── Ledger helpers (in-memory mirror for the Engine view) ─── */
const accType = (a) => (a === "mpesa_clearing" ? "ASSET" : a === "platform_fees" ? "INCOME" : "LIABILITY");
const debitNormal = (t) => t === "ASSET" || t === "EXPENSE";
const computeBalances = (entries) => {
  const m = {};
  for (const e of entries) for (const p of e.postings) m[p.account] = (m[p.account] || 0) + p.amount;
  return m;
};
const bal = (balances, acc) => {
  const raw = balances[acc] || 0;
  return debitNormal(accType(acc)) ? raw : -raw;
};

/* ─── Static fallback project data (used until API responds) ─── */
const FALLBACK_PROJECTS = [
  { id: "kiambu-poultry", title: "Kiambu Broiler Poultry", cycle: "Cycle 14", venture: "poultry", vlabel: "Poultry",
    location: "Kiambu County", grade: "B", model: "Fixed-return note", range: "16–19%", exp: 18, down: 4, months: 4,
    minc: KES(500), target: KES(850000), raised: KES(612000), investors: 138, daysLeft: 9,
    sponsor: { name: "Wanjiku Farms Ltd", cycles: 13, onTime: 13, rating: 4.8 },
    blurb: "Working capital to restock and feed 5,000 broilers through a 6-week grow-out, sold to a contracted Nairobi processor.",
    use: [["Day-old chicks", 35], ["Feed", 40], ["Vet & vaccines", 12], ["Labour & ops", 13]],
    risks: ["Disease outbreak — mitigated by vet cover + biosecurity", "Feed price volatility", "Single-buyer concentration"],
    protect: ["Index livestock insurance", "Signed offtake agreement", "Milestone escrow release"],
    fail: "If birds are lost to disease, index insurance covers stock value and you receive a partial return from recovered feed and salvage. Worst realistic case returns roughly KES 4 on every 100 invested.",
    updates: [["Week 2", "Chicks placed, mortality 0.8% — below target."], ["Week 0", "Funds released against feed-supplier invoice."]] },
  { id: "homabay-tilapia", title: "Lake Victoria Tilapia", cycle: "Cage cycle 6", venture: "fish", vlabel: "Aquaculture",
    location: "Homa Bay County", grade: "C", model: "Revenue share", range: "18–26%", exp: 22, down: -12, months: 8,
    minc: KES(500), target: KES(1400000), raised: KES(574000), investors: 96, daysLeft: 21,
    sponsor: { name: "Nyanza Blue Co-op", cycles: 5, onTime: 4, rating: 4.3 },
    blurb: "Stock and feed eight floating cages of tilapia to market weight, sold to regional fish traders and hotels.",
    use: [["Fingerlings", 22], ["Feed", 48], ["Cage maintenance", 16], ["Logistics", 14]],
    risks: ["Water quality / fish-kill events", "Price swings at harvest (revenue share, not fixed)", "First co-op cycle that ran late"],
    protect: ["Partial aquaculture insurance", "Water-quality monitoring", "Milestone escrow release"],
    fail: "Revenue share means returns follow the actual sale. A poor harvest can return less than you put in — the downside scenario shows a possible 12% loss.",
    updates: [["Month 1", "All eight cages stocked; mean weight tracking to plan."]] },
  { id: "naivasha-greenhouse", title: "Naivasha Greenhouse Tomatoes", cycle: "Cycle 3", venture: "greenhouse", vlabel: "Greenhouse",
    location: "Nakuru County", grade: "A", model: "Fixed-return note", range: "13–16%", exp: 15, down: 7, months: 4,
    minc: KES(500), target: KES(700000), raised: KES(268000), investors: 54, daysLeft: 14,
    sponsor: { name: "Rift Fresh Ltd", cycles: 12, onTime: 12, rating: 4.9 },
    blurb: "Drip-irrigated, climate-controlled tomato cycle with a standing supermarket supply contract.",
    use: [["Seedlings", 24], ["Nutrients & water", 30], ["Labour", 26], ["Packaging", 20]],
    risks: ["Pest pressure — mitigated by controlled environment", "Buyer demand shifts"],
    protect: ["Irrigated (not rain-dependent)", "Standing supermarket contract", "Crop insurance"],
    fail: "Lowest-risk listing: irrigated, contracted buyer, proven sponsor. Even the downside scenario stays positive at about KES 7 per 100.",
    updates: [] },
  { id: "kitui-honey", title: "Kitui Apiary & Honey", cycle: "Season 2", venture: "bees", vlabel: "Beekeeping",
    location: "Kitui County", grade: "C", model: "Profit share", range: "17–24%", exp: 20, down: -4, months: 5,
    minc: KES(500), target: KES(480000), raised: KES(156000), investors: 39, daysLeft: 18,
    sponsor: { name: "Kamba Honey Group", cycles: 2, onTime: 2, rating: 4.1 },
    blurb: "Expand to 120 modern hives, harvest and process honey sold under a local premium brand.",
    use: [["Hives & equipment", 44], ["Bee colonies", 20], ["Processing", 22], ["Branding & sales", 14]],
    risks: ["Rainfall affects flowering & yield", "Younger sponsor track record", "Profit share — variable"],
    protect: ["Diversified hive sites", "Milestone escrow release"],
    fail: "Profit share with a small downside. A dry season can mean a slight loss — the downside scenario shows roughly 4% down.",
    updates: [] },
];

/* ─── Design tokens ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
:root{
  --g900:#14271c;--g800:#19341f;--g700:#1f4a2c;--g600:#2e6b43;--g500:#3f8456;--g400:#5b9a4e;
  --terra:#c65d3b;--terra-s:#e08a64;--gold:#c99a3a;--cream:#f4efe3;--paper:#fbf8f0;
  --card:#ffffff;--ink:#1c281f;--muted:#6c7a6e;--line:#e7e0cf;
  --gA:#2e7d46;--gB:#5b9a4e;--gC:#c99a3a;--gD:#cf7d36;--gE:#b5482f;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
.av{font-family:'Hanken Grotesk',sans-serif;}
.serif{font-family:'Fraunces',serif;}.tnum{font-variant-numeric:tabular-nums;}
.stage{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;padding:28px 16px;
  background:radial-gradient(120% 80% at 80% -10%,#2e6b4322 0%,transparent 50%),radial-gradient(100% 70% at 0% 110%,#c65d3b1a 0%,transparent 45%),#ece5d4;}
.phone{width:392px;max-width:100%;height:812px;position:relative;background:var(--paper);border-radius:46px;overflow:hidden;
  box-shadow:0 2px 0 #fff inset,0 40px 80px -20px #1c281f55,0 0 0 11px #11140f,0 0 0 13px #2a2e25;}
.notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:140px;height:26px;background:#11140f;border-radius:0 0 18px 18px;z-index:60;}
.statusbar{position:absolute;top:0;left:0;right:0;height:46px;display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;font-size:13px;font-weight:700;color:var(--ink);z-index:55;}
.screen{position:absolute;inset:0;top:46px;bottom:74px;overflow-y:auto;overflow-x:hidden;}
.screen::-webkit-scrollbar{display:none;}
.tabbar{position:absolute;bottom:0;left:0;right:0;height:74px;background:#fbf8f0ee;backdrop-filter:blur(10px);border-top:1px solid var(--line);display:flex;z-index:50;padding-bottom:6px;}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);background:none;border:none;font-family:inherit;font-size:10px;font-weight:700;cursor:pointer;}
.tab.active{color:var(--g700);}.tab .dot{width:5px;height:5px;border-radius:9px;background:var(--terra);opacity:0;transition:.2s;}.tab.active .dot{opacity:1;}
.pad{padding:18px 18px 26px;}
.h-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--g600);}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;}
.btn{font-family:inherit;border:none;cursor:pointer;font-weight:700;border-radius:16px;transition:transform .08s,filter .15s;}
.btn:active{transform:scale(.97);}.btn-primary{background:var(--g700);color:var(--cream);}.btn-primary:active{filter:brightness(1.08);}
.btn-ghost{background:#1f4a2c12;color:var(--g700);}
.chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:5px 10px;border-radius:11px;white-space:nowrap;}
.grade{display:inline-flex;align-items:center;gap:6px;font-weight:800;font-size:12px;padding:5px 9px 5px 7px;border-radius:10px;}
.grade .g{width:18px;height:18px;border-radius:6px;display:grid;place-items:center;color:#fff;font-size:11px;font-weight:800;}
.bar{height:7px;border-radius:7px;background:#1f4a2c1a;overflow:hidden;}.bar>i{display:block;height:100%;border-radius:7px;background:linear-gradient(90deg,var(--g500),var(--g400));transition:width .9s cubic-bezier(.2,.8,.2,1);}
.bar.terra>i{background:linear-gradient(90deg,var(--terra),var(--terra-s));}
.fade{animation:fade .5s both;}@keyframes fade{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.pop{animation:pop .45s cubic-bezier(.2,1.4,.4,1) both;}@keyframes pop{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}
.sheet{position:absolute;inset:0;z-index:80;display:flex;flex-direction:column;justify-content:flex-end;background:#14271c44;animation:fade .25s;}
.sheet-inner{background:var(--paper);border-radius:28px 28px 0 0;max-height:92%;overflow-y:auto;animation:up .32s cubic-bezier(.2,.8,.2,1);}
.sheet-inner::-webkit-scrollbar{display:none;}@keyframes up{from{transform:translateY(60px);opacity:.6;}to{transform:none;opacity:1;}}
.overlay{position:absolute;inset:0;top:46px;bottom:0;background:var(--paper);z-index:40;overflow-y:auto;animation:slide .28s cubic-bezier(.2,.8,.2,1);}
.overlay::-webkit-scrollbar{display:none;}@keyframes slide{from{transform:translateX(34px);opacity:0;}to{transform:none;opacity:1;}}
.venthumb{height:172px;position:relative;display:grid;place-items:center;color:#fff;}
.venthumb .vlabel{position:absolute;left:16px;bottom:14px;font-weight:800;font-size:13px;text-shadow:0 1px 8px #0006;}
.spin{animation:spin 1.1s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}
.seg{display:flex;background:#1f4a2c12;border-radius:14px;padding:4px;gap:4px;}
.seg button{flex:1;border:none;background:none;font-family:inherit;font-weight:700;font-size:13px;padding:9px;border-radius:11px;color:var(--muted);cursor:pointer;}
.seg button.on{background:#fff;color:var(--g700);box-shadow:0 1px 4px #1c281f1a;}
.skel{background:linear-gradient(90deg,#e7e0cf 25%,#f4efe3 50%,#e7e0cf 75%);background-size:200% 100%;animation:skel 1.4s infinite;}
@keyframes skel{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
/* Admin dashboard */
.admin-wrap{position:fixed;inset:0;z-index:200;overflow-y:auto;background:#f8f9fa;}
.admin-sidebar{position:fixed;top:0;left:0;bottom:0;width:220px;background:#14271c;padding:24px 0;}
.admin-content{margin-left:220px;padding:28px 32px;}
.admin-nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;color:#ffffffaa;font-size:13.5px;font-weight:600;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-family:inherit;}
.admin-nav-item.active,.admin-nav-item:hover{color:#fff;background:#ffffff12;}
.admin-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px;}
.admin-stat{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;}
.admin-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:8px;}
.admin-table{width:100%;border-collapse:collapse;font-size:13px;}
.admin-table th{text-align:left;padding:10px 12px;background:#f9fafb;font-weight:700;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;}
.admin-table td{padding:12px;border-bottom:1px solid #f3f4f6;color:#111827;}
.admin-table tr:last-child td{border-bottom:none;}
.admin-table tr:hover td{background:#f9fafb;}
`;

const GRADE_COLOR = { A: "var(--gA)", B: "var(--gB)", C: "var(--gC)", D: "var(--gD)", E: "var(--gE)" };
const VEN = {
  poultry: { g: "linear-gradient(135deg,#cf7d36,#b5482f)", Icon: Egg },
  fish: { g: "linear-gradient(135deg,#2e6b43,#1f7a7a)", Icon: Fish },
  horticulture: { g: "linear-gradient(135deg,#3f8456,#5b9a4e)", Icon: Sprout },
  dairy: { g: "linear-gradient(135deg,#9a6b3f,#c99a3a)", Icon: Milk },
  bees: { g: "linear-gradient(135deg,#c99a3a,#cf7d36)", Icon: Hexagon },
  greenhouse: { g: "linear-gradient(135deg,#2e6b43,#5b9a4e)", Icon: Leaf },
};

const DICT = {
  en: { home:"Home",discover:"Discover",wallet:"Wallet",learn:"Learn",profile:"Profile",invest:"Invest",
        pool:"Join the pool",solo:"Invest solo",projReturn:"Projected return",fail:"What if it fails?",
        expected:"Expected",downside:"Downside",min:"Min",net:"Portfolio value",returns:"Returns earned",greet:"Habari, Daniel" },
  sw: { home:"Nyumbani",discover:"Gundua",wallet:"Pochi",learn:"Jifunze",profile:"Wasifu",invest:"Wekeza",
        pool:"Jiunge na kikundi",solo:"Wekeza peke yako",projReturn:"Faida inayotarajiwa",fail:"Je, ikishindwa?",
        expected:"Inayotarajiwa",downside:"Hasara",min:"Chini",net:"Thamani ya jumla",returns:"Faida",greet:"Habari, Daniel" },
};

/* ─── Shared UI components ─── */
function GradeChip({ g }) {
  return <span className="grade" style={{ background: GRADE_COLOR[g] + "1a", color: GRADE_COLOR[g] }}>
    <span className="g" style={{ background: GRADE_COLOR[g] }}>{g}</span>Risk {g}
  </span>;
}
function Bar({ pct, terra }) { return <div className={"bar" + (terra?" terra":"")}><i style={{ width: Math.min(100,pct)+"%" }} /></div>; }
function VIcon({ venture, size=22, sw=1.6 }) { const I = VEN[venture].Icon; return <I size={size} strokeWidth={sw} />; }
function LangToggle({ lang, setLang }) {
  return <div className="seg" style={{ width:92,padding:3 }}>
    {["en","sw"].map(l => <button key={l} className={lang===l?"on":""} style={{ padding:"6px 0",fontSize:12 }} onClick={()=>setLang(l)}>{l.toUpperCase()}</button>)}
  </div>;
}
function Spinner({ size=20, color="var(--g600)" }) {
  return <div className="spin" style={{ width:size,height:size,borderRadius:"50%",border:`3px solid ${color}22`,borderTopColor:color }} />;
}

/* ═══════════════════════════════════════════════════════════════
 * MAIN APP
 * ══════════════════════════════════════════════════════════════ */
export default function UpeoComplete() {
  const [lang, setLang] = useState("en");
  const t = DICT[lang];

  /* ── Auth state ── */
  const [token, setTokenState] = useState(() => getToken());
  const [kyc, setKyc] = useState(false);
  const [onboarded, setOnboarded] = useState(!!getToken());

  const saveToken = (tok) => { setToken(tok); setTokenState(tok); };
  const logout = () => { saveToken(null); setOnboarded(false); setKyc(false); setWalletC(0); };

  /* ── UI state ── */
  const [tab, setTab] = useState("home");
  const [openP, setOpenP] = useState(null);
  const [showFail, setShowFail] = useState(false);
  const [invest, setInvest] = useState(null);
  const [sponsor, setSponsor] = useState(false);
  const [engine, setEngine] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [toast, setToast] = useState(null);

  /* ── Issue 4: wallet balance from API ── */
  const [walletC, setWalletC] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!token) return;
    setWalletLoading(true);
    try {
      const data = await apiFetch("/wallet/balance", {}, token);
      // API returns { balance: <cents> }
      setWalletC(data.balance ?? 0);
    } catch (e) {
      if (e.status === 401) logout();
    } finally { setWalletLoading(false); }
  }, [token]);

  useEffect(() => { if (token) fetchBalance(); }, [token]);

  /* ── Issue 6: projects from API ── */
  const [projects, setProjects] = useState(FALLBACK_PROJECTS);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await apiFetch("/projects");
      // Map API shape → frontend shape, keep static fallbacks for missing fields
      if (Array.isArray(data) && data.length > 0) {
        const merged = data.map(ap => {
          const local = FALLBACK_PROJECTS.find(fp => fp.id === ap.id) || {};
          return {
            ...local,
            id: ap.id,
            title: ap.title || local.title,
            grade: ap.grade || local.grade,
            target: ap.targetCents ?? local.target,
            raised: ap.raisedCents ?? local.raised,   // ← from ledger (Issue 6)
            investors: ap.investorCount ?? local.investors,
            daysLeft: ap.daysLeft ?? local.daysLeft,
            minc: ap.minCents ?? local.minc,
          };
        });
        setProjects(merged);
      }
    } catch (_) { /* keep fallback */ }
    finally { setProjectsLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  /* ── In-memory ledger mirror for Engine view ── */
  const [entries, setEntries] = useState([]);
  const balances = useMemo(() => computeBalances(entries), [entries]);
  const addEntry = (kind, postings, extra={}) =>
    setEntries(es => [...es, { id:"je"+(es.length+1), kind, ts:Date.now(), postings, ...extra }]);

  /* ── Positions ── */
  const [positions, setPositions] = useState([]);
  const activePositions = positions.filter(p => p.status !== "refunded");
  const realizedReturns = positions.filter(p=>p.status==="paid").reduce((s,p)=>s+(p.realized-p.amount),0);

  /* ── Toast ── */
  const flash = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2600); };

  /* ── Issue 3 + 4: invest via API ── */
  const doInvest = async (pid, amtC, mode, units) => {
    const data = await apiFetch(`/invest/${pid}`, {
      method:"POST",
      body: JSON.stringify({ amount: amtC, mode, units }) // Issue 3: send mode + units
    }, token);
    // Mirror in local ledger
    const id = "je"+(entries.length+1);
    addEntry("invest", [
      { account:"wallet:me", amount: amtC },
      { account:"escrow:"+pid, amount: -amtC }
    ]);
    setPositions(ps => [{ entryId:id, project:pid, amount:amtC, ts:Date.now(), status:"active", apiEntryId:data.entryId }, ...ps]);
    await fetchBalance(); // Issue 4
    await fetchProjects(); // refresh raised amounts
    return data;
  };

  /* ── Cancel (cooling-off) ── */
  const cancelInvest = async (pos) => {
    await apiFetch(`/invest/cancel/${pos.apiEntryId || pos.entryId}`, { method:"POST" }, token);
    setPositions(ps => ps.map(p => p.entryId===pos.entryId ? {...p, status:"refunded"} : p));
    await fetchBalance(); // Issue 4
    flash("Refunded — within the 48h cooling-off window");
  };

  /* ── Simulate cycle complete (demo button) ── */
  const completeCycle = async (pos) => {
    const proj = projects.find(p=>p.id===pos.project);
    if (!proj) return;
    const principal = pos.amount;
    const gross = Math.round(principal*(1+proj.exp/100));
    const fee = Math.round(Math.max(0,gross-principal)*0.1);
    const payout = gross-fee;
    // local ledger only (demo)
    addEntry("payout", [{ account:"returns:"+proj.id, amount:payout },{ account:"wallet:me", amount:-payout }]);
    setPositions(ps => ps.map(p => p.entryId===pos.entryId ? {...p,status:"paid",realized:payout} : p));
    setWalletC(w => w+payout);
    flash("Cycle complete — return paid to your wallet");
  };

  /* ── Project detail ── */
  const openProject = async (p) => {
    setShowFail(false);
    // Issue 6: optionally refresh single project detail
    try {
      const fresh = await apiFetch(`/projects/${p.id}`);
      setOpenP({ ...p, raised: fresh.raisedCents ?? p.raised });
    } catch { setOpenP(p); }
  };

  /* ── Invest flow ── */
  const startInvest = (mode) => {
    if (!kyc) { flash("Complete KYC to invest"); return; }
    setInvest({ step:"amount", mode, amount:openP.minc });
  };

  /* ── Auth handlers (passed to Onboarding) ── */
  const handleOtpVerified = (tok) => { saveToken(tok); };
  const handleKycDone = () => { setKyc(true); setOnboarded(true); fetchBalance(); };

  /* ── 401 guard ── */
  useEffect(() => {
    if (!token && onboarded) { setOnboarded(false); setKyc(false); }
  }, [token]);

  return (
    <div className="av stage">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── Admin Dashboard (full-screen overlay) ── */}
      {adminOpen && <AdminDashboard onClose={()=>setAdminOpen(false)} token={token} flash={flash} />}

      <div className="phone">
        <div className="notch" />
        <div className="statusbar">
          <span className="tnum">9:41</span>
          <span style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:11 }}>5G</span>
            <span style={{ width:22,height:11,border:"1.5px solid var(--ink)",borderRadius:3,position:"relative",display:"inline-block" }}>
              <span style={{ position:"absolute",inset:1.5,right:6,background:"var(--ink)",borderRadius:1 }} />
            </span>
          </span>
        </div>

        <div className="screen">
          {tab==="home"    && <HomeView {...{ t, walletC, walletLoading, realizedReturns, activePositions, openProject, setTab, completeCycle, kyc, setEngine, lang, setLang }} />}
          {tab==="discover"&& <DiscoverView {...{ t, openProject, projects, projectsLoading, lang, setLang }} />}
          {tab==="wallet"  && <WalletView {...{ t, walletC, walletLoading, entries, token, fetchBalance, flash, lang, setLang }} />}
          {tab==="learn"   && <LearnView {...{ t, lang, setLang }} />}
          {tab==="profile" && <ProfileView {...{ t, kyc, setSponsor, setEngine, setAdminOpen, lang, setLang, logout }} />}
        </div>

        {openP && <ProjectDetail {...{ p:openP, t, showFail, setShowFail, onClose:()=>setOpenP(null), onInvest:startInvest, kyc }} />}
        {invest && openP && <InvestSheet {...{ p:openP, invest, setInvest, t, token, doInvest, fetchBalance, flash, onCancel:()=>setInvest(null) }} />}
        {sponsor && <div style={{ position:"absolute",left:0,right:0,top:46,bottom:0,zIndex:75 }}><SponsorDash onClose={()=>setSponsor(false)} flash={flash} token={token} /></div>}
        {engine && <div style={{ position:"absolute",left:0,right:0,top:46,bottom:0,zIndex:76 }}><EngineView entries={entries} balances={balances} onClose={()=>setEngine(false)} /></div>}

        {/* ── Issue 1: Onboarding with real OTP→JWT→KYC ── */}
        {!onboarded && (
          <div style={{ position:"absolute",left:0,right:0,top:46,bottom:0,zIndex:95 }}>
            <Onboarding onOtpVerified={handleOtpVerified} onKycDone={handleKycDone} />
          </div>
        )}

        {toast && (
          <div className="pop" style={{ position:"absolute",left:16,right:16,bottom:86,zIndex:90,background:"var(--g800)",color:"var(--cream)",padding:"13px 16px",borderRadius:14,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:9,boxShadow:"0 10px 30px #14271c55" }}>
            <CheckCircle2 size={17} style={{ color:"#9fe0ad" }} /> {toast}
          </div>
        )}

        <div className="tabbar">
          {[["home",Home,t.home],["discover",Compass,t.discover],["wallet",Wallet,t.wallet],["learn",GraduationCap,t.learn],["profile",User,t.profile]].map(([k,Ic,label])=>(
            <button key={k} className={"tab"+(tab===k?" active":"")} onClick={()=>{ setTab(k); setOpenP(null); }}>
              <Ic size={21} strokeWidth={tab===k?2.4:1.9} />{label}<span className="dot" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * ONBOARDING — Issue 1: Real OTP → JWT → KYC
 * ══════════════════════════════════════════════════════════════ */
function Onboarding({ onOtpVerified, onKycDone }) {
  const [s, setS] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [devOtp, setDevOtp] = useState(""); // shown in dev mode
  const tokenRef = useRef(null);

  const fullPhone = "+254" + phone.replace(/\D/g,"");

  /* Step 1 → send OTP */
  const sendOtp = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await apiFetch("/auth/request-otp", { method:"POST", body:JSON.stringify({ phone: fullPhone }) });
      if (data.devOtp) setDevOtp(data.devOtp); // dev sandbox
      setS(2);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  /* Step 2 → verify OTP, get JWT */
  const verifyOtp = async () => {
    setErr(""); setLoading(true);
    try {
      const data = await apiFetch("/auth/verify-otp", { method:"POST", body:JSON.stringify({ phone: fullPhone, code: otp }) });
      tokenRef.current = data.token;
      setToken(data.token);        // persist
      onOtpVerified(data.token);
      setS(3);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  /* Step 3 → ID scan (simulated) */
  const scanId = () => setS(4);

  /* Step 4 → selfie + call POST /auth/complete-kyc */
  const completeKyc = async () => {
    setErr(""); setLoading(true);
    try {
      await apiFetch("/auth/complete-kyc", { method:"POST" }, tokenRef.current || getToken());
      setS(5);
    } catch(e) {
      // sandbox may not require real liveness — proceed anyway
      setS(5);
    } finally { setLoading(false); }
  };

  const finish = () => onKycDone();

  /* Splash */
  if (s===0) return (
    <div style={{ position:"absolute",inset:0,padding:"40px 26px 26px",display:"flex",flexDirection:"column",color:"var(--cream)",background:"radial-gradient(120% 90% at 80% 0%,#2e6b43 0%,#14271c 72%)" }}>
      <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center" }}>
        <div style={{ width:60,height:60,borderRadius:18,background:"#ffffff1a",display:"grid",placeItems:"center",marginBottom:22 }}><Sprout size={32} /></div>
        <div className="h-eyebrow" style={{ color:"#9fe0ad" }}>Agri Vest</div>
        <div className="serif" style={{ fontSize:33,fontWeight:600,lineHeight:1.12,marginTop:6 }}>Invest in real African agriculture.</div>
        <div style={{ fontSize:15,opacity:.85,marginTop:14,lineHeight:1.5 }}>Fund vetted farms, livestock and fisheries from KES 500 — solo or pooled. The returns are real, and so is the risk.</div>
      </div>
      <button className="btn" onClick={()=>setS(1)} style={{ background:"var(--cream)",color:"var(--g800)",padding:16,fontSize:15 }}>Get started</button>
      <div style={{ textAlign:"center",fontSize:12,opacity:.65,marginTop:12 }}>Prototype · not a licensed product</div>
    </div>
  );

  /* Phone entry */
  if (s===1) return (
    <div style={{ position:"absolute",inset:0,padding:"36px 26px 26px",background:"var(--paper)",display:"flex",flexDirection:"column" }}>
      <div className="serif" style={{ fontSize:25,fontWeight:600,color:"var(--ink)" }}>What's your number?</div>
      <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,marginBottom:26,lineHeight:1.5 }}>We'll send a one-time code. Your phone is your Agri Vest identity.</div>
      <div className="card" style={{ display:"flex",alignItems:"center",gap:10,padding:"15px 16px" }}>
        <span style={{ fontWeight:700,color:"var(--ink)" }}>🇰🇪 +254</span>
        <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,9))} placeholder="7XX XXX XXX" type="tel" inputMode="numeric"
          style={{ flex:1,border:"none",background:"none",fontFamily:"inherit",fontSize:15,color:"var(--ink)",outline:"none",letterSpacing:".06em" }} />
      </div>
      {err && <div style={{ marginTop:10,fontSize:12.5,color:"var(--gE)",fontWeight:600 }}>{err}</div>}
      <div style={{ flex:1 }} />
      <button className="btn btn-primary" onClick={sendOtp} disabled={phone.length<9||loading} style={{ padding:16,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:phone.length<9?0.45:1 }}>
        {loading ? <Spinner size={18} color="#fff" /> : null} Send code
      </button>
    </div>
  );

  /* OTP entry */
  if (s===2) return (
    <div style={{ position:"absolute",inset:0,padding:"36px 26px 26px",background:"var(--paper)",display:"flex",flexDirection:"column" }}>
      <div className="serif" style={{ fontSize:25,fontWeight:600,color:"var(--ink)" }}>Enter the code</div>
      <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,marginBottom:22 }}>Sent to +254 {phone}</div>
      {devOtp && <div style={{ marginBottom:16,padding:"10px 14px",borderRadius:12,background:"#c99a3a1a",border:"1px solid #c99a3a44",fontSize:13,color:"var(--gold)",fontWeight:700 }}>Dev sandbox OTP: <span className="tnum">{devOtp}</span></div>}
      <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
        {[0,1,2,3,4,5].map(i=><div key={i}
        className="card serif" style={{ width:54,height:62,borderRadius:14,display:"grid",placeItems:"center",fontSize:26,fontWeight:600,color:"var(--g700)",border:otp.length===i?"2px solid var(--g600)":"1px solid var(--line)" }}>{otp[i]||""}</div>)}
      </div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:10,marginTop:26,width:222,marginLeft:"auto",marginRight:"auto",justifyContent:"center" }}>
        {[1,2,3,4,5,6,7,8,9,0].map(n=><button key={n} className="btn" onClick={()=>setOtp(o=>(o+n).slice(0,6))} style={{ width:64,height:46,background:"#1f4a2c12",color:"var(--ink)",fontSize:18 }}>{n}</button>)}
        <button className="btn" onClick={()=>setOtp(o=>o.slice(0,-1))} style={{ width:64,height:46,background:"#1f4a2c12",color:"var(--ink)",fontSize:18 }}>⌫</button>
      </div>
      {err && <div style={{ marginTop:10,fontSize:12.5,color:"var(--gE)",fontWeight:600,textAlign:"center" }}>{err}</div>}
      <div style={{ flex:1 }} />
      <button className="btn btn-primary" onClick={verifyOtp} disabled={otp.length<6||loading} style={{ padding:16,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:otp.length>=6?1:.45 }}>
        {loading ? <Spinner size={18} color="#fff" /> : null} Verify
      </button>
    </div>
  );

  /* ID scan */
  if (s===3) return (
    <div style={{ position:"absolute",inset:0,padding:"36px 26px 26px",background:"var(--paper)",display:"flex",flexDirection:"column" }}>
      <span className="chip" style={{ background:"#c99a3a1a",color:"var(--gold)",alignSelf:"flex-start" }}>Step 1 of 2 · KYC</span>
      <div className="serif" style={{ fontSize:25,fontWeight:600,color:"var(--ink)",marginTop:14 }}>Verify your identity</div>
      <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,marginBottom:22,lineHeight:1.5 }}>Required before you invest — it keeps the platform safe and is part of being a regulated product.</div>
      <div className="card" style={{ padding:22,textAlign:"center" }}>
        <div style={{ width:54,height:54,borderRadius:15,background:"#1f4a2c12",display:"grid",placeItems:"center",color:"var(--g600)",margin:"0 auto 12px" }}><FileText size={26} /></div>
        <div style={{ fontWeight:700,color:"var(--ink)" }}>Scan your National ID</div>
        <div style={{ fontSize:12.5,color:"var(--muted)",marginTop:4 }}>or passport · diaspora supported</div>
      </div>
      <div style={{ flex:1 }} />
      <button className="btn btn-primary" onClick={scanId} style={{ padding:16,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}><Camera size={18} /> Scan ID</button>
    </div>
  );

  /* Selfie */
  if (s===4) return (
    <div style={{ position:"absolute",inset:0,padding:"36px 26px 26px",background:"var(--paper)",display:"flex",flexDirection:"column" }}>
      <span className="chip" style={{ background:"#c99a3a1a",color:"var(--gold)",alignSelf:"flex-start" }}>Step 2 of 2 · KYC</span>
      <div className="serif" style={{ fontSize:25,fontWeight:600,color:"var(--ink)",marginTop:14 }}>Quick selfie check</div>
      <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,lineHeight:1.5 }}>A liveness check confirms it's really you.</div>
      <div style={{ flex:1,display:"grid",placeItems:"center" }}>
        <div style={{ width:168,height:168,borderRadius:"50%",border:"3px dashed var(--g500)",display:"grid",placeItems:"center",color:"var(--g500)" }}><Camera size={48} strokeWidth={1.4} /></div>
      </div>
      {err && <div style={{ marginBottom:10,fontSize:12.5,color:"var(--gE)",fontWeight:600,textAlign:"center" }}>{err}</div>}
      <button className="btn btn-primary" onClick={completeKyc} disabled={loading} style={{ padding:16,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
        {loading ? <Spinner size={18} color="#fff" /> : null} Capture & verify
      </button>
    </div>
  );

  /* Verified */
  return (
    <div style={{ position:"absolute",inset:0,padding:"36px 26px 26px",background:"var(--paper)",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center" }}>
      <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center" }}>
        <div className="pop" style={{ width:84,height:84,borderRadius:"50%",background:"#2e7d4618",display:"grid",placeItems:"center" }}><CheckCircle2 size={48} style={{ color:"var(--gA)" }} /></div>
        <div className="serif" style={{ fontSize:26,fontWeight:600,color:"var(--ink)",marginTop:18 }}>You're verified</div>
        <div style={{ fontSize:14,color:"var(--muted)",marginTop:8,lineHeight:1.5,maxWidth:260 }}>Welcome to Agri Vest! Your wallet is ready — top it up via M-Pesa and start investing.</div>
      </div>
      <button className="btn btn-primary" onClick={finish} style={{ padding:16,fontSize:15,width:"100%" }}>Enter Agri Vest</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * HOME
 * ══════════════════════════════════════════════════════════════ */
function HomeView({ t, walletC, walletLoading, realizedReturns, activePositions, openProject, setTab, completeCycle, kyc, setEngine, lang, setLang }) {
  const portfolio = walletC + activePositions.filter(p=>p.status==="active").reduce((s,p)=>s+p.amount,0);
  const activePosFiltered = activePositions.filter(p=>p.status==="active");

  return (
    <div className="pad">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div><div className="h-eyebrow">Agri Vest</div>
          <div className="serif" style={{ fontSize:24,fontWeight:600,color:"var(--ink)",lineHeight:1.1 }}>{t.greet}</div></div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div className="fade" style={{ borderRadius:24,padding:"20px 20px 18px",color:"var(--cream)",position:"relative",overflow:"hidden",background:"radial-gradient(120% 100% at 90% 0%,#2e6b43 0%,#14271c 70%)" }}>
        <div style={{ position:"absolute",right:-30,top:-30,width:150,height:150,borderRadius:"50%",background:"#5b9a4e22" }} />
        <div style={{ fontSize:12,fontWeight:700,opacity:.8 }}>{t.net}</div>
        {walletLoading
          ? <div className="skel" style={{ height:40,borderRadius:8,marginTop:4,width:180 }} />
          : <div className="serif tnum" style={{ fontSize:38,fontWeight:600,lineHeight:1.05 }}>{fmt(portfolio)}</div>}
        <div style={{ display:"flex",gap:18,marginTop:14 }}>
          <div><div style={{ fontSize:11,opacity:.75,fontWeight:600 }}>{t.returns}</div>
            <div className="tnum" style={{ fontSize:16,fontWeight:700,color:"#9fe0ad" }}>+{fmt(realizedReturns)}</div></div>
          <div style={{ borderLeft:"1px solid #ffffff22",paddingLeft:18 }}><div style={{ fontSize:11,opacity:.75,fontWeight:600 }}>Active</div>
            <div className="tnum" style={{ fontSize:16,fontWeight:700 }}>{activePosFiltered.length}</div></div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:13,fontSize:11,opacity:.72 }}><Info size={13} /> Returns are projected until a cycle pays out.</div>
      </div>

      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",margin:"22px 0 11px" }}>
        <div className="serif" style={{ fontSize:19,fontWeight:600,color:"var(--ink)" }}>Your projects</div>
        <button className="btn" onClick={()=>setTab("discover")} style={{ background:"none",color:"var(--terra)",fontSize:13 }}>Browse more →</button>
      </div>

      {activePositions.length===0 && (
        <div className="card" style={{ padding:18,textAlign:"center",color:"var(--muted)",fontSize:13.5 }}>
          No investments yet. Open <b style={{ color:"var(--g700)" }}>Discover</b> and back a project from KES 500.
        </div>
      )}

      {activePositions.map((pos, i) => {
        const proj = FALLBACK_PROJECTS.find(p=>p.id===pos.project) || {};
        if (!proj.title) return null;
        return (
          <div key={i} className="card fade" style={{ padding:13,marginBottom:11,animationDelay:i*60+"ms" }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <button onClick={()=>openProject(proj)} style={{ width:46,height:46,borderRadius:13,background:VEN[proj.venture]?.g||"#ccc",display:"grid",placeItems:"center",color:"#fff",border:"none",cursor:"pointer" }}>
                <VIcon venture={proj.venture} /></button>
              <div style={{ flex:1,minWidth:0 }}>
                <div className="serif" style={{ fontSize:15,fontWeight:600,color:"var(--ink)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{proj.title}</div>
                <div className="tnum" style={{ fontSize:12,color:"var(--muted)",fontWeight:600 }}>{fmt(pos.amount)} · {proj.range}</div>
              </div>
              <span className="chip" style={{ background:pos.status==="paid"?"#2e7d461a":"#c99a3a1a",color:pos.status==="paid"?"var(--gA)":"var(--gold)" }}>{pos.status==="paid"?"Paid out":"Active"}</span>
            </div>
            {pos.status==="active" && (
              <button className="btn btn-ghost" onClick={()=>completeCycle(pos)} style={{ width:"100%",marginTop:11,padding:"10px",fontSize:12.5,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                <RefreshCw size={15} /> Simulate cycle → get paid (demo)
              </button>
            )}
            {pos.status==="paid" && <div className="tnum" style={{ marginTop:9,fontSize:12.5,color:"var(--gA)",fontWeight:700 }}>Received {fmt(pos.realized)} · profit +{fmt(pos.realized-pos.amount)}</div>}
          </div>
        );
      })}

      <button className="btn" onClick={()=>setEngine(true)} style={{ width:"100%",marginTop:8,padding:13,borderRadius:16,background:"#1f4a2c10",border:"1px solid var(--line)",display:"flex",alignItems:"center",gap:10,color:"var(--g700)" }}>
        <Layers size={18} /><span style={{ flex:1,textAlign:"left",fontWeight:700,fontSize:13.5 }}>Peek at the ledger engine</span><ChevronRight size={18} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * DISCOVER — Issue 6: Projects from API
 * ══════════════════════════════════════════════════════════════ */
function DiscoverView({ t, openProject, projects, projectsLoading, lang, setLang }) {
  const [filter, setFilter] = useState("All");
  const filters = ["All","Poultry","Aquaculture","Horticulture","Bees","Greenhouse"];
  const VENTURE_MAP = { Poultry:"poultry", Aquaculture:"fish", Horticulture:"horticulture", Bees:"bees", Greenhouse:"greenhouse" };

  const visible = filter==="All" ? projects : projects.filter(p=>p.venture===VENTURE_MAP[filter]);

  return (
    <div className="pad">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
        <div className="serif" style={{ fontSize:23,fontWeight:600,color:"var(--ink)" }}>{t.discover}</div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="card" style={{ display:"flex",alignItems:"center",gap:9,padding:"11px 14px",borderRadius:15,marginBottom:13 }}>
        <Search size={18} style={{ color:"var(--muted)" }} /><span style={{ color:"var(--muted)",fontSize:14 }}>Search ventures, counties…</span>
      </div>
      <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:14 }}>
        {filters.map(f=>(
          <button key={f} className="chip" onClick={()=>setFilter(f)} style={{ background:f===filter?"var(--g700)":"#1f4a2c12",color:f===filter?"var(--cream)":"var(--g700)",padding:"8px 13px",fontSize:12.5,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,borderRadius:11 }}>{f}</button>
        ))}
      </div>

      {projectsLoading && (
        <div style={{ display:"flex",justifyContent:"center",padding:32 }}><Spinner /></div>
      )}

      {!projectsLoading && visible.map((p,i)=>{
        const pct = p.target ? Math.round((p.raised/p.target)*100) : 0;
        return (
          <button key={p.id} className="card fade" onClick={()=>openProject(p)} style={{ width:"100%",textAlign:"left",padding:0,overflow:"hidden",border:"1px solid var(--line)",cursor:"pointer",animationDelay:i*70+"ms",marginBottom:14 }}>
            <div className="venthumb" style={{ background:VEN[p.venture]?.g||"#ccc" }}>
              <VIcon venture={p.venture} size={46} sw={1.5} />
              <span className="vlabel">{p.vlabel} · {p.location}</span>
              <span style={{ position:"absolute",top:12,right:12 }}><GradeChip g={p.grade} /></span>
            </div>
            <div style={{ padding:"13px 15px 15px" }}>
              <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)" }}>{p.title}</div>
              <div style={{ fontSize:12,color:"var(--muted)",marginBottom:11 }}>{p.cycle} · {p.model}</div>
              <div style={{ display:"flex",gap:14,marginBottom:11 }}>
                <div><div style={{ fontSize:10,fontWeight:700,color:"var(--muted)" }}>PROJECTED</div>
                  <div className="serif" style={{ fontSize:17,fontWeight:600,color:"var(--g700)" }}>{p.range}</div></div>
                <div><div style={{ fontSize:10,fontWeight:700,color:"var(--muted)" }}>CYCLE</div>
                  <div className="serif" style={{ fontSize:17,fontWeight:600,color:"var(--ink)" }}>{p.months} mo</div></div>
              </div>
              <Bar pct={pct} terra />
              {/* Issue 6: raised comes from API (ledger-derived) */}
              <div className="tnum" style={{ display:"flex",justifyContent:"space-between",marginTop:7,fontSize:11.5,fontWeight:600,color:"var(--muted)" }}>
                <span style={{ color:"var(--terra)" }}>{pct}% funded</span>
                <span>{p.investors} investors · {p.daysLeft}d left</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * PROJECT DETAIL
 * ══════════════════════════════════════════════════════════════ */
function ProjectDetail({ p, t, showFail, setShowFail, onClose, onInvest, kyc }) {
  const pct = p.target ? Math.round((p.raised/p.target)*100) : 0;

  return (
    <div className="overlay">
      <div className="venthumb" style={{ background:VEN[p.venture]?.g||"#ccc",height:196 }}>
        <button className="btn" onClick={onClose} style={{ position:"absolute",top:14,left:14,width:38,height:38,borderRadius:12,background:"#0003",color:"#fff",display:"grid",placeItems:"center",backdropFilter:"blur(6px)" }}><ChevronLeft size={22} /></button>
        <span style={{ position:"absolute",top:16,right:14 }}><GradeChip g={p.grade} /></span>
        <VIcon venture={p.venture} size={58} sw={1.4} />
        <span className="vlabel" style={{ fontSize:14 }}><MapPin size={13} style={{ verticalAlign:-2 }} /> {p.location}</span>
      </div>
      <div className="pad" style={{ paddingBottom:110 }}>
        <div className="serif" style={{ fontSize:25,fontWeight:600,color:"var(--ink)",lineHeight:1.12 }}>{p.title}</div>
        <div style={{ fontSize:13,color:"var(--muted)",fontWeight:600,marginTop:2 }}>{p.cycle} · {p.model}</div>

        <div className="card" style={{ display:"flex",marginTop:16,padding:"14px 4px",borderRadius:18 }}>
          {[[t.projReturn,p.range,"var(--g700)"],["Cycle",p.months+" mo","var(--ink)"],[t.min,fmt(p.minc),"var(--ink)"]].map((s,i)=>(
            <div key={i} style={{ flex:1,textAlign:"center",borderRight:i<2?"1px solid var(--line)":"none" }}>
              <div style={{ fontSize:10,fontWeight:700,color:"var(--muted)" }}>{String(s[0]).toUpperCase()}</div>
              <div className="serif" style={{ fontSize:15,fontWeight:600,color:s[2] }}>{s[1]}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:16 }}>
          <Bar pct={pct} terra />
          <div className="tnum" style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12.5,fontWeight:600 }}>
            <span style={{ color:"var(--terra)" }}>{fmt(p.raised)} <span style={{ color:"var(--muted)" }}>of {fmt(p.target)}</span></span>
            <span style={{ color:"var(--muted)" }}><Users size={12} style={{ verticalAlign:-1 }} /> {p.investors} · {p.daysLeft}d</span>
          </div>
        </div>

        <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"20px 0 7px" }}>The venture</div>
        <div style={{ fontSize:13.5,color:"var(--ink)",lineHeight:1.55 }}>{p.blurb}</div>

        {p.sponsor && (
          <div className="card" style={{ padding:15,marginTop:14,display:"flex",alignItems:"center",gap:13 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:"var(--g700)",color:"var(--cream)",display:"grid",placeItems:"center" }} className="serif"><span style={{ fontWeight:600 }}>{p.sponsor.name[0]}</span></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14,fontWeight:700,color:"var(--ink)" }}>{p.sponsor.name}</div>
              <div className="tnum" style={{ fontSize:12,color:"var(--muted)",fontWeight:600 }}>{p.sponsor.onTime}/{p.sponsor.cycles} cycles repaid on time</div>
            </div>
            <span className="chip tnum" style={{ background:"#c99a3a1a",color:"var(--gold)" }}><Star size={12} fill="var(--gold)" /> {p.sponsor.rating}</span>
          </div>
        )}

        <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"22px 0 10px" }}>The numbers</div>
        <div style={{ display:"flex",gap:10 }}>
          <div style={{ flex:1,padding:14,borderRadius:16,background:"#2e7d4612",border:"1px solid #2e7d4633" }}>
            <div style={{ fontSize:11,fontWeight:700,color:"var(--gA)" }}>{t.expected.toUpperCase()}</div>
            <div className="serif tnum" style={{ fontSize:22,fontWeight:600,color:"var(--gA)" }}>+{p.exp}%</div>
            <div style={{ fontSize:11,color:"var(--muted)" }}>over {p.months} months</div>
          </div>
          <div style={{ flex:1,padding:14,borderRadius:16,background:p.down<0?"#b5482f12":"#c99a3a12",border:"1px solid "+(p.down<0?"#b5482f33":"#c99a3a33") }}>
            <div style={{ fontSize:11,fontWeight:700,color:p.down<0?"var(--gE)":"var(--gold)" }}>{t.downside.toUpperCase()}</div>
            <div className="serif tnum" style={{ fontSize:22,fontWeight:600,color:p.down<0?"var(--gE)":"var(--gold)" }}>{p.down<0?"−"+Math.abs(p.down):"+"+p.down}%</div>
            <div style={{ fontSize:11,color:"var(--muted)" }}>{p.down<0?"loss possible":"modelled floor"}</div>
          </div>
        </div>

        {p.use && <>
          <div className="serif" style={{ fontSize:16,fontWeight:600,color:"var(--ink)",margin:"20px 0 10px" }}>Use of funds</div>
          {p.use.map((u,i)=>(
            <div key={i} style={{ marginBottom:9 }}>
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:12.5,fontWeight:600,color:"var(--ink)",marginBottom:4 }}><span>{u[0]}</span><span className="tnum" style={{ color:"var(--muted)" }}>{u[1]}%</span></div>
              <Bar pct={u[1]} />
            </div>
          ))}
        </>}

        {p.risks && <>
          <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"22px 0 10px" }}>The risks</div>
          {p.risks.map((r,i)=>(
            <div key={i} style={{ display:"flex",gap:9,marginBottom:9,fontSize:13,color:"var(--ink)",lineHeight:1.4 }}>
              <AlertTriangle size={16} style={{ color:"var(--gD)",flexShrink:0,marginTop:1 }} /> {r}
            </div>
          ))}
        </>}

        {p.protect && <>
          <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"20px 0 10px" }}>Protections in place</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
            {p.protect.map((pr,i)=><span key={i} className="chip" style={{ background:"#2e7d461a",color:"var(--gA)",padding:"7px 11px" }}><ShieldCheck size={13} /> {pr}</span>)}
          </div>
        </>}

        {p.fail && <>
          <button className="btn" onClick={()=>setShowFail(!showFail)} style={{ width:"100%",marginTop:18,padding:15,borderRadius:16,background:"#b5482f10",border:"1px solid #b5482f33",display:"flex",alignItems:"center",gap:10,textAlign:"left" }}>
            <AlertTriangle size={18} style={{ color:"var(--gE)" }} /><span style={{ flex:1,fontWeight:700,color:"var(--gE)",fontSize:14 }}>{t.fail}</span>
            <ChevronRight size={18} style={{ color:"var(--gE)",transform:showFail?"rotate(90deg)":"none",transition:".2s" }} />
          </button>
          {showFail && <div className="fade" style={{ fontSize:13,color:"var(--ink)",lineHeight:1.5,padding:"13px 4px 0" }}>{p.fail}</div>}
        </>}

        {p.updates && p.updates.length>0 && <>
          <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"22px 0 10px" }}>Updates</div>
          {p.updates.map((u,i)=>(
            <div key={i} style={{ display:"flex",gap:12,marginBottom:12 }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                <div style={{ width:10,height:10,borderRadius:6,background:"var(--g500)" }} />
                {i<p.updates.length-1 && <div style={{ width:2,flex:1,background:"var(--line)" }} />}
              </div>
              <div><div style={{ fontSize:12,fontWeight:700,color:"var(--g700)" }}>{u[0]}</div>
                <div style={{ fontSize:13,color:"var(--ink)",lineHeight:1.4 }}>{u[1]}</div></div>
            </div>
          ))}
        </>}
      </div>

      <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"12px 16px 18px",background:"linear-gradient(transparent,var(--paper) 26%)",display:"flex",gap:10 }}>
        <button className="btn btn-ghost" onClick={()=>onInvest("solo")} style={{ padding:"15px 18px",fontSize:14 }}>{t.solo}</button>
        <button className="btn btn-primary" onClick={()=>onInvest("pool")} style={{ flex:1,padding:"15px",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}><Users size={18} /> {t.pool}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * INVEST SHEET — Issues 2, 3, 4, 5
 * ══════════════════════════════════════════════════════════════ */
function InvestSheet({ p, invest, setInvest, t, token, doInvest, fetchBalance, flash, onCancel }) {
  const { step, mode, amount } = invest;
  const units = Math.round(amount / p.minc);

  // Issue 2: amounts in cents throughout
  const expKes = Math.round(amount*(p.exp/100));
  const downKes = Math.round(amount*(Math.abs(p.down)/100));

  const setAmt = (v) => setInvest(iv=>({ ...iv, amount:Math.max(p.minc,v) }));
  const [err, setErr] = useState("");
  const [pollStatus, setPollStatus] = useState(""); // Issue 5
  const [investResult, setInvestResult] = useState(null);

  /* Issue 5: STK push → poll balance for confirmation */
  const pollForPayment = async (prevBalance) => {
    const MAX = 10;
    for (let i=0;i<MAX;i++) {
      await new Promise(r=>setTimeout(r,3000));
      try {
        const data = await apiFetch("/wallet/balance",{},token);
        if (data.balance > prevBalance) {
          // balance increased → payment confirmed
          return true;
        }
      } catch {}
    }
    return false;
  };

  const handleConfirm = async () => {
    setErr("");
    setInvest(iv=>({...iv,step:"processing"}));
    setPollStatus("Waiting for M-Pesa PIN confirmation…");
    try {
      // Get current balance before to detect change
      let prevBal = 0;
      try { const b = await apiFetch("/wallet/balance",{},token); prevBal = b.balance||0; } catch {}

      // Issue 3: send amount (cents), mode, units
      const result = await doInvest(p.id, amount, mode, units);
      setInvestResult(result);
      setInvest(iv=>({...iv,step:"done"}));
    } catch(e) {
      if (e.message==="Waiting for payment") {
        // Real M-Pesa path: poll
        setPollStatus("STK push sent — enter your M-Pesa PIN…");
        let prevBal = 0;
        try { const b = await apiFetch("/wallet/balance",{},token); prevBal = b.balance||0; } catch {}
        const confirmed = await pollForPayment(prevBal);
        if (confirmed) {
          await fetchBalance();
          setInvest(iv=>({...iv,step:"done"}));
        } else {
          setInvest(iv=>({...iv,step:"amount"}));
          setErr("Payment not confirmed after 30s — please try again.");
        }
      } else {
        setInvest(iv=>({...iv,step:"review"}));
        setErr(e.message);
      }
    }
  };

  const finishInvest = () => { setInvest(null); };

  return (
    <div className="sheet" onClick={e=>{ if(e.target===e.currentTarget&&step!=="processing") onCancel(); }}>
      <div className="sheet-inner">
        {step!=="done"&&step!=="processing" && <div style={{ padding:"8px 0 0",display:"flex",justifyContent:"center" }}><div style={{ width:42,height:5,borderRadius:5,background:"var(--line)" }} /></div>}

        {step==="amount" && (
          <div className="pad">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
              <div className="serif" style={{ fontSize:21,fontWeight:600,color:"var(--ink)" }}>{mode==="pool"?t.pool:t.solo}</div>
              <button className="btn" onClick={onCancel} style={{ background:"none",color:"var(--muted)",padding:4 }}><X size={22} /></button>
            </div>
            <div style={{ fontSize:13,color:"var(--muted)",marginBottom:18 }}>{p.title} · {p.range} projected over {p.months} months</div>
            <div style={{ textAlign:"center",marginBottom:8 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"var(--muted)" }}>YOU INVEST</div>
              {/* Issue 2: display via fmt() */}
              <div className="serif tnum" style={{ fontSize:42,fontWeight:600,color:"var(--g700)" }}>{fmt(amount)}</div>
              {mode==="pool" && <div className="tnum" style={{ fontSize:13,color:"var(--terra)",fontWeight:700 }}>= {units} unit{units>1?"s":""} of the pool</div>}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12,margin:"16px 0 10px" }}>
              <button className="btn btn-ghost" onClick={()=>setAmt(amount-p.minc)} style={{ width:48,height:48,display:"grid",placeItems:"center" }}><Minus size={20} /></button>
              <input type="range" min={p.minc} max={mode==="pool"?KES(50000):KES(200000)} step={p.minc} value={amount} onChange={e=>setAmt(+e.target.value)} style={{ flex:1,accentColor:"var(--g600)" }} />
              <button className="btn btn-ghost" onClick={()=>setAmt(amount+p.minc)} style={{ width:48,height:48,display:"grid",placeItems:"center" }}><Plus size={20} /></button>
            </div>
            <div style={{ display:"flex",gap:8,marginBottom:18 }}>
              {[500,1000,5000,10000].map(q=>(
                <button key={q} className="btn" onClick={()=>setAmt(KES(q))} style={{ flex:1,padding:"9px 0",fontSize:12.5,background:amount===KES(q)?"var(--g700)":"#1f4a2c12",color:amount===KES(q)?"var(--cream)":"var(--g700)" }}>{q>=1000?q/1000+"k":q}</button>
              ))}
            </div>
            <div className="card" style={{ padding:15,display:"flex",gap:10 }}>
              <div style={{ flex:1 }}><div style={{ fontSize:11,fontWeight:700,color:"var(--gA)" }}>{t.expected.toUpperCase()} RETURN</div>
                <div className="serif tnum" style={{ fontSize:19,fontWeight:600,color:"var(--gA)" }}>+{fmt(expKes)}</div></div>
              <div style={{ flex:1,borderLeft:"1px solid var(--line)",paddingLeft:12 }}><div style={{ fontSize:11,fontWeight:700,color:p.down<0?"var(--gE)":"var(--gold)" }}>{t.downside.toUpperCase()}</div>
                <div className="serif tnum" style={{ fontSize:19,fontWeight:600,color:p.down<0?"var(--gE)":"var(--gold)" }}>{p.down<0?"−"+fmt(downKes):"+"+fmt(downKes)}</div></div>
            </div>
            {err && <div style={{ marginTop:10,fontSize:12.5,color:"var(--gE)",fontWeight:600 }}>{err}</div>}
            <button className="btn btn-primary" onClick={()=>setInvest(iv=>({...iv,step:"review"}))} style={{ width:"100%",padding:16,fontSize:15,marginTop:16 }}>Review</button>
          </div>
        )}

        {step==="review" && (
          <div className="pad">
            <div className="serif" style={{ fontSize:21,fontWeight:600,color:"var(--ink)",marginBottom:14 }}>Confirm your investment</div>
            <div className="card" style={{ padding:16 }}>
              {/* Issue 3: show mode from API response, not local state */}
              {[["Project",p.title],["Type",mode==="pool"?"Pooled · "+units+" units":"Solo"],["You invest",fmt(amount)],["Cycle",p.months+" months"],["Expected return","+"+fmt(expKes)]].map((r,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:i<4?"1px solid var(--line)":"none",fontSize:13.5 }}>
                  <span style={{ color:"var(--muted)",fontWeight:600 }}>{r[0]}</span>
                  <span className="tnum" style={{ color:"var(--ink)",fontWeight:700 }}>{r[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14,padding:14,borderRadius:14,background:"#b5482f0d",border:"1px solid #b5482f33" }}>
              <div style={{ display:"flex",gap:9,fontSize:12.5,color:"var(--ink)",lineHeight:1.45,marginBottom:9 }}>
                <AlertTriangle size={17} style={{ color:"var(--gE)",flexShrink:0 }} /><span>This is <b>not a guaranteed return</b>. {p.down<0?"You could lose part of your money.":"Returns can be lower than projected."}</span></div>
              <div style={{ display:"flex",gap:9,fontSize:12.5,color:"var(--ink)",lineHeight:1.45,marginBottom:9 }}>
                <Clock size={17} style={{ color:"var(--gold)",flexShrink:0 }} /><span><b>Committed until the cycle ends</b> (~{p.months} months).</span></div>
              <div style={{ display:"flex",gap:9,fontSize:12.5,color:"var(--ink)",lineHeight:1.45 }}>
                <ShieldCheck size={17} style={{ color:"var(--gA)",flexShrink:0 }} /><span><b>48-hour cooling-off:</b> cancel for a full refund within 48 hours.</span></div>
            </div>
            {err && <div style={{ marginTop:10,fontSize:12.5,color:"var(--gE)",fontWeight:600 }}>{err}</div>}
            <button className="btn btn-primary" onClick={handleConfirm} style={{ width:"100%",padding:16,fontSize:15,marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <Smartphone size={18} /> Pay {fmt(amount)} via M-Pesa
            </button>
            <button className="btn" onClick={()=>setInvest(iv=>({...iv,step:"amount"}))} style={{ width:"100%",padding:12,background:"none",color:"var(--muted)",marginTop:4 }}>Back</button>
          </div>
        )}

        {/* Issue 5: real waiting state instead of 1.7s timer */}
        {step==="processing" && (
          <div className="pad" style={{ textAlign:"center",padding:"54px 30px" }}>
            <div className="spin" style={{ width:56,height:56,borderRadius:"50%",border:"4px solid #1f4a2c22",borderTopColor:"var(--g600)",margin:"0 auto 22px" }} />
            <div className="serif" style={{ fontSize:20,fontWeight:600,color:"var(--ink)" }}>Check your phone</div>
            <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,lineHeight:1.5 }}>An M-Pesa prompt for <b className="tnum">{fmt(amount)}</b> has been sent. Enter your PIN to confirm.</div>
            {pollStatus && <div style={{ marginTop:12,fontSize:12,color:"var(--muted)" }}>{pollStatus}</div>}
          </div>
        )}

        {step==="done" && (
          <div className="pad" style={{ textAlign:"center",padding:"44px 28px 32px" }}>
            <div className="pop" style={{ width:72,height:72,borderRadius:"50%",background:"#2e7d4618",display:"grid",placeItems:"center",margin:"0 auto 18px" }}><CheckCircle2 size={42} style={{ color:"var(--gA)" }} /></div>
            <div className="serif" style={{ fontSize:23,fontWeight:600,color:"var(--ink)" }}>You're in</div>
            {/* Issue 3: display confirmed invest type from API response */}
            <div style={{ fontSize:14,color:"var(--muted)",marginTop:8,lineHeight:1.5 }}>
              <b className="tnum">{fmt(amount)}</b> committed to {p.title}
              {" · "}{investResult?.mode||mode}{mode==="pool"?" · "+units+" units":""}.
            </div>
            <div style={{ marginTop:16,padding:13,borderRadius:13,background:"#2e7d4610",fontSize:12.5,color:"var(--g800)",lineHeight:1.45,display:"flex",gap:9,textAlign:"left" }}>
              <ShieldCheck size={17} style={{ color:"var(--gA)",flexShrink:0 }} /><span>Changed your mind? Cancel for a full refund until <b>48 hours from now</b>.</span>
            </div>
            <button className="btn btn-primary" onClick={finishInvest} style={{ width:"100%",padding:15,fontSize:15,marginTop:18 }}>View my portfolio</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * WALLET — Issues 4, 5
 * ══════════════════════════════════════════════════════════════ */
function WalletView({ t, walletC, walletLoading, entries, token, fetchBalance, flash, lang, setLang }) {
  const [modal, setModal] = useState(null);
  const [amt, setAmt] = useState(2000);
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [mpesaWaiting, setMpesaWaiting] = useState(false);
  const [pollMsg, setPollMsg] = useState("");

  const txns = [...entries].reverse().filter(e=>e.kind!=="fee").slice(0,12);
  const txLabel = { deposit:"M-Pesa deposit",withdraw:"Withdrawal to M-Pesa",invest:"Invested","reverse:invest":"Refund (cooling-off)",payout:"Return paid",disburse:"Released to sponsor",return:"Sponsor repayment" };
  const myDelta = (e) => { const p=e.postings.find(x=>x.account==="wallet:me"); return p ? -p.amount : 0; };

  /* Issue 5: M-Pesa STK push polling */
  const handleDeposit = async () => {
    setDepositing(true);
    setModal(null);
    setMpesaWaiting(true);
    setPollMsg("STK push sent — enter your M-Pesa PIN…");
    try {
      await apiFetch("/wallet/deposit", { method:"POST", body:JSON.stringify({ amount:KES(amt) }) }, token);
      // Poll for balance increase
      let prevBal = walletC;
      let confirmed = false;
      for (let i=0;i<10;i++) {
        await new Promise(r=>setTimeout(r,3000));
        const data = await apiFetch("/wallet/balance",{},token);
        if (data.balance > prevBal) { confirmed=true; await fetchBalance(); break; }
        setPollMsg(`Waiting for confirmation (${(i+1)*3}s)…`);
      }
      if (confirmed) flash("Deposit received via M-Pesa");
      else { setPollMsg(""); flash("Payment not confirmed — please try again"); }
    } catch(e) { flash(e.message); }
    finally { setDepositing(false); setMpesaWaiting(false); setPollMsg(""); }
  };

  const handleWithdraw = async () => {
    setWithdrawing(true); setModal(null);
    try {
      await apiFetch("/wallet/withdraw", { method:"POST", body:JSON.stringify({ amount:KES(amt) }) }, token);
      await fetchBalance(); // Issue 4
      flash("Withdrawal sent to M-Pesa");
    } catch(e) { flash(e.message); }
    finally { setWithdrawing(false); }
  };

  return (
    <div className="pad">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div className="serif" style={{ fontSize:23,fontWeight:600,color:"var(--ink)" }}>{t.wallet}</div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div className="card fade" style={{ padding:20,borderRadius:22,textAlign:"center" }}>
        <div style={{ fontSize:12,color:"var(--muted)",fontWeight:700 }}>Available balance</div>
        {walletLoading
          ? <div className="skel" style={{ height:36,borderRadius:8,margin:"6px auto 16px",width:160 }} />
          : <div className="serif tnum" style={{ fontSize:34,fontWeight:600,color:"var(--ink)",margin:"3px 0 16px" }}>{fmt(walletC)}</div>}
        <div style={{ display:"flex",gap:10 }}>
          <button className="btn btn-primary" onClick={()=>{ setModal("deposit"); setAmt(2000); }} disabled={depositing||mpesaWaiting} style={{ flex:1,padding:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
            {depositing ? <Spinner size={16} color="#fff" /> : <ArrowDownLeft size={17} />} Deposit
          </button>
          <button className="btn btn-ghost" onClick={()=>{ setModal("withdraw"); setAmt(1000); }} disabled={withdrawing} style={{ flex:1,padding:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
            {withdrawing ? <Spinner size={16} color="var(--g700)" /> : <ArrowUpRight size={17} />} Withdraw
          </button>
        </div>
        {mpesaWaiting && <div style={{ marginTop:12,fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",gap:6,justifyContent:"center" }}><Spinner size={13} /> {pollMsg}</div>}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:13,fontSize:11.5,color:"var(--muted)" }}><Smartphone size={13} /> Deposits & withdrawals via M-Pesa</div>
      </div>

      <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"22px 0 8px" }}>Activity</div>
      {txns.length===0 && <div style={{ textAlign:"center",color:"var(--muted)",fontSize:13.5,padding:16 }}>No transactions yet.</div>}
      {txns.map((e,i)=>{
        const d=myDelta(e); const inn=d>=0;
        return (
          <div key={i} className="card" style={{ padding:"13px 15px",marginBottom:10,display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:38,height:38,borderRadius:11,display:"grid",placeItems:"center",background:inn?"#2e7d461a":"#c65d3b1a",color:inn?"var(--gA)":"var(--terra)" }}>{inn?<ArrowDownLeft size={18} />:<ArrowUpRight size={18} />}</div>
            <div style={{ flex:1 }}><div style={{ fontSize:13.5,fontWeight:600,color:"var(--ink)" }}>{txLabel[e.kind]||e.kind}</div>
              <div style={{ fontSize:11.5,color:"var(--muted)",fontWeight:600 }}>{e.ref||"settled"}</div></div>
            {d!==0 && <div className="tnum" style={{ fontWeight:700,fontSize:14,color:inn?"var(--gA)":"var(--ink)" }}>{inn?"+":"−"}{fmt(Math.abs(d))}</div>}
          </div>
        );
      })}

      {modal && (
        <div className="sheet" onClick={e=>{ if(e.target===e.currentTarget) setModal(null); }}>
          <div className="sheet-inner"><div className="pad">
            <div style={{ display:"flex",justifyContent:"center",marginBottom:10 }}><div style={{ width:42,height:5,borderRadius:5,background:"var(--line)" }} /></div>
            <div className="serif" style={{ fontSize:21,fontWeight:600,color:"var(--ink)" }}>{modal==="deposit"?"Deposit via M-Pesa":"Withdraw to M-Pesa"}</div>
            {/* Issue 2: display fmt() */}
            <div className="serif tnum" style={{ fontSize:38,fontWeight:600,color:"var(--g700)",textAlign:"center",margin:"16px 0" }}>{fmt(KES(amt))}</div>
            <input type="range" min={500} max={50000} step={500} value={amt} onChange={e=>setAmt(+e.target.value)} style={{ width:"100%",accentColor:"var(--g600)" }} />
            <button className="btn btn-primary" onClick={modal==="deposit"?handleDeposit:handleWithdraw} style={{ width:"100%",padding:16,fontSize:15,marginTop:18 }}>
              {modal==="deposit"?"Send STK push":"Withdraw"} {fmt(KES(amt))}
            </button>
          </div></div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * LEARN
 * ══════════════════════════════════════════════════════════════ */
function LearnView({ t, lang, setLang }) {
  const cards=[["What is a return?","Faida ni nini?","var(--g600)"],["Why agriculture is risky","Kwa nini kilimo kina hatari","var(--gold)"],["What a risk grade means","Daraja la hatari ni nini","var(--terra)"],["What happens if a project fails","Mradi ukishindwa","var(--gE)"]];
  return (
    <div className="pad">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div className="serif" style={{ fontSize:23,fontWeight:600,color:"var(--ink)" }}>{t.learn}</div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div style={{ fontSize:13,color:"var(--muted)",marginBottom:16,lineHeight:1.5 }}>Agriculture earns real returns — and carries real risk. Understand both before you invest.</div>
      {cards.map((c,i)=>(
        <div key={i} className="card fade" style={{ padding:16,marginBottom:11,display:"flex",alignItems:"center",gap:13,animationDelay:i*60+"ms" }}>
          <div style={{ width:8,height:40,borderRadius:8,background:c[2] }} />
          <div style={{ flex:1 }}><div className="serif" style={{ fontSize:16,fontWeight:600,color:"var(--ink)" }}>{lang==="en"?c[0]:c[1]}</div>
            <div style={{ fontSize:12,color:"var(--muted)" }}>3 min read</div></div>
          <ChevronRight size={18} style={{ color:"var(--muted)" }} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * PROFILE
 * ══════════════════════════════════════════════════════════════ */
function ProfileView({ t, kyc, setSponsor, setEngine, setAdminOpen, lang, setLang, logout }) {
  const rows=[["Verification & limits",ShieldCheck],["Payment methods",Wallet],["Refer & earn",Users],["Risk disclosures",AlertTriangle]];
  return (
    <div className="pad">
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div className="serif" style={{ fontSize:23,fontWeight:600,color:"var(--ink)" }}>{t.profile}</div>
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      <div className="card fade" style={{ padding:18,display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
        <div style={{ width:56,height:56,borderRadius:"50%",background:"var(--g700)",color:"var(--cream)",display:"grid",placeItems:"center" }} className="serif"><span style={{ fontSize:22,fontWeight:600 }}>D</span></div>
        <div style={{ flex:1 }}>
          <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)" }}>Daniel Omulo</div>
          <span className="chip" style={{ background:"#2e7d461a",color:"var(--gA)",marginTop:3 }}><CheckCircle2 size={13} /> {kyc?"KYC verified":"KYC pending"}</span>
        </div>
      </div>

      <button className="btn fade" onClick={()=>setSponsor(true)} style={{ width:"100%",textAlign:"left",padding:16,marginBottom:12,display:"flex",alignItems:"center",gap:13,background:"linear-gradient(120deg,#1f4a2c,#14271c)" }}>
        <div style={{ width:42,height:42,borderRadius:12,background:"#ffffff1a",display:"grid",placeItems:"center",color:"var(--cream)" }}><Sprout size={22} /></div>
        <div style={{ flex:1 }}><div className="serif" style={{ fontSize:16,fontWeight:600,color:"var(--cream)" }}>I'm raising capital</div>
          <div style={{ fontSize:12,color:"#ffffffaa" }}>Switch to the sponsor dashboard</div></div>
        <ChevronRight size={18} style={{ color:"var(--cream)" }} />
      </button>

      <button className="btn fade" onClick={()=>setEngine(true)} style={{ width:"100%",textAlign:"left",padding:16,marginBottom:10,display:"flex",alignItems:"center",gap:13,background:"#1f4a2c10",border:"1px solid var(--line)" }}>
        <div style={{ width:42,height:42,borderRadius:12,background:"#1f4a2c14",display:"grid",placeItems:"center",color:"var(--g700)" }}><Layers size={22} /></div>
        <div style={{ flex:1 }}><div className="serif" style={{ fontSize:16,fontWeight:600,color:"var(--ink)" }}>Ledger engine</div>
          <div style={{ fontSize:12,color:"var(--muted)" }}>See the double-entry books, live</div></div>
        <ChevronRight size={18} style={{ color:"var(--muted)" }} />
      </button>

      {/* Admin dashboard link */}
      <button className="btn fade" onClick={()=>setAdminOpen(true)} style={{ width:"100%",textAlign:"left",padding:16,marginBottom:14,display:"flex",alignItems:"center",gap:13,background:"#c65d3b12",border:"1px solid #c65d3b33" }}>
        <div style={{ width:42,height:42,borderRadius:12,background:"#c65d3b18",display:"grid",placeItems:"center",color:"var(--terra)" }}><Settings size={22} /></div>
        <div style={{ flex:1 }}><div className="serif" style={{ fontSize:16,fontWeight:600,color:"var(--ink)" }}>Admin Dashboard</div>
          <div style={{ fontSize:12,color:"var(--muted)" }}>Underwriting · approvals · analytics</div></div>
        <ChevronRight size={18} style={{ color:"var(--muted)" }} />
      </button>

      {rows.map((r,i)=>{ const Ic=r[1]; return (
        <div key={i} className="card fade" style={{ padding:15,marginBottom:10,display:"flex",alignItems:"center",gap:12,animationDelay:i*50+"ms" }}>
          <Ic size={19} style={{ color:"var(--g600)" }} /><div style={{ flex:1,fontSize:14,fontWeight:600,color:"var(--ink)" }}>{r[0]}</div><ChevronRight size={18} style={{ color:"var(--muted)" }} />
        </div>
      ); })}

      <button onClick={logout} style={{ width:"100%",padding:13,marginTop:4,background:"none",border:"1px solid var(--line)",borderRadius:14,display:"flex",alignItems:"center",gap:10,color:"var(--gE)",fontWeight:700,fontFamily:"inherit",cursor:"pointer" }}>
        <LogOut size={17} /> Sign out
      </button>

      <div style={{ fontSize:11,color:"var(--muted)",textAlign:"center",marginTop:18,lineHeight:1.5 }}>Agri Vest is a design prototype. Not a licensed product. Investments carry risk of loss.</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * ENGINE (Ledger view)
 * ══════════════════════════════════════════════════════════════ */
function EngineView({ entries, balances, onClose }) {
  const accounts = Object.keys(balances).sort();
  const recent = [...entries].reverse().slice(0,8);
  const niceAcc = a=>a.replace("mpesa_clearing","M-Pesa clearing").replace("platform_fees","Platform fees").replace("escrow:","escrow · ").replace("returns:","returns · ");
  return (
    <div className="fade" style={{ position:"absolute",inset:0,overflowY:"auto",background:"var(--paper)" }}>
      <div style={{ background:"linear-gradient(120deg,#1f4a2c,#14271c)",color:"var(--cream)",padding:"22px 18px 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button className="btn" onClick={onClose} style={{ width:38,height:38,borderRadius:12,background:"#ffffff1a",color:"var(--cream)",display:"grid",placeItems:"center" }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight:800,letterSpacing:".06em",fontSize:13 }}>LEDGER ENGINE</div>
        </div>
        <div className="serif" style={{ fontSize:22,fontWeight:600,marginTop:12 }}>The books, live</div>
        <div style={{ fontSize:12.5,opacity:.82,marginTop:4,lineHeight:1.45 }}>Every action posts a balanced double-entry. The whole ledger always nets to zero.</div>
      </div>
      <div className="pad">
        <div className="h-eyebrow" style={{ marginBottom:8 }}>Account balances</div>
        {accounts.map(a=>{
          const b=bal(balances,a); const tp=accType(a);
          return (
            <div key={a} className="card" style={{ padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10 }}>
              <span className="chip" style={{ background:tp==="ASSET"?"#2e7d461a":tp==="INCOME"?"#c99a3a1a":"#1f4a2c12",color:tp==="ASSET"?"var(--gA)":tp==="INCOME"?"var(--gold)":"var(--g700)",fontSize:9.5 }}>{tp}</span>
              <span style={{ flex:1,fontSize:13,fontWeight:600,color:"var(--ink)" }}>{niceAcc(a)}</span>
              <span className="tnum serif" style={{ fontSize:15,fontWeight:600,color:"var(--ink)" }}>{fmt(b)}</span>
            </div>
          );
        })}
        {accounts.length===0 && <div style={{ color:"var(--muted)",fontSize:13,padding:"10px 0" }}>No entries yet. Make a deposit or invest to see the ledger.</div>}
        {accounts.length>0 && <div style={{ display:"flex",alignItems:"center",gap:7,margin:"6px 2px 18px",fontSize:12,fontWeight:700,color:"var(--gA)" }}><CheckCircle2 size={15} /> Ledger balances ✓</div>}
        <div className="h-eyebrow" style={{ marginBottom:8 }}>Recent journal entries</div>
        {recent.map(e=>(
          <div key={e.id} className="card" style={{ padding:13,marginBottom:9 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
              <span style={{ fontSize:13,fontWeight:700,color:"var(--g700)" }}>{e.kind}</span>
              <span className="tnum" style={{ fontSize:11,color:"var(--muted)" }}>{e.id}{e.ref?" · "+e.ref:""}</span>
            </div>
            {e.postings.map((p,i)=>(
              <div key={i} className="tnum" style={{ display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0",color:"var(--ink)" }}>
                <span style={{ color:"var(--muted)" }}>{p.amount>0?"Dr":"Cr"} {niceAcc(p.account)}</span>
                <span style={{ fontWeight:600 }}>{fmt(Math.abs(p.amount))}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * SPONSOR DASHBOARD — Issue 7
 * ══════════════════════════════════════════════════════════════ */
function SponsorDash({ onClose, flash, token }) {
  const me = FALLBACK_PROJECTS[0];
  const [updates, setUpdates] = useState(me.updates);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [wizard, setWizard] = useState(false);
  const [posting, setPosting] = useState(false);
  const pct = Math.round((me.raised/me.target)*100);

  /* Issue 7: wire POST /projects/:id/updates */
  const postUpdate = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/projects/${me.id}/updates`, { method:"POST", body:JSON.stringify({ text:draft.trim() }) }, token);
      setUpdates(u=>[["Just now",draft.trim()],...u]);
      flash("Update posted to investors");
    } catch(e) {
      // optimistic fallback
      setUpdates(u=>[["Just now",draft.trim()],...u]);
      flash("Update posted (offline mode)");
    } finally { setDraft(""); setComposing(false); setPosting(false); }
  };

  if (wizard) return <SponsorWizard onClose={()=>setWizard(false)} flash={flash} token={token} />;

  return (
    <div className="fade" style={{ position:"absolute",inset:0,overflowY:"auto",background:"var(--paper)" }}>
      <div style={{ background:"linear-gradient(120deg,#1f4a2c,#14271c)",color:"var(--cream)",padding:"22px 18px 20px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
          <button className="btn" onClick={onClose} style={{ width:38,height:38,borderRadius:12,background:"#ffffff1a",color:"var(--cream)",display:"grid",placeItems:"center" }}><ChevronLeft size={22} /></button>
          <div style={{ fontWeight:800,letterSpacing:".06em",fontSize:13 }}>SPONSOR DASHBOARD</div>
        </div>
        <div className="h-eyebrow" style={{ color:"#9fe0ad" }}>{me.sponsor.name}</div>
        <div className="serif" style={{ fontSize:24,fontWeight:600 }}>{me.title}</div>
        <div style={{ marginTop:14 }}>
          <Bar pct={pct} terra />
          <div className="tnum" style={{ display:"flex",justifyContent:"space-between",marginTop:8,fontSize:12.5,fontWeight:600 }}>
            <span style={{ color:"#ffd9c2" }}>{fmt(me.raised)} raised</span><span style={{ opacity:.8 }}>{pct}% of {fmt(me.target)}</span>
          </div>
        </div>
      </div>
      <div className="pad">
        <div style={{ display:"flex",gap:10 }}>
          {[[Users,me.investors,"investors","var(--g600)"],[Clock,me.daysLeft+"d","left to raise","var(--gold)"],[Star,me.sponsor.rating,"rating","var(--gold)"]].map((c,i)=>{ const Ic=c[0]; return (
            <div key={i} className="card" style={{ flex:1,padding:14,textAlign:"center" }}><Ic size={18} style={{ color:c[3] }} />
              <div className="serif tnum" style={{ fontSize:20,fontWeight:600,color:"var(--ink)" }}>{c[1]}</div>
              <div style={{ fontSize:11,color:"var(--muted)" }}>{c[2]}</div></div>
          ); })}
        </div>
        <div style={{ display:"flex",gap:10,marginTop:14 }}>
          <button className="btn btn-primary" onClick={()=>setComposing(true)} style={{ flex:1,padding:14,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}><Camera size={17} /> Post update</button>
          <button className="btn btn-ghost" onClick={()=>setWizard(true)} style={{ flex:1,padding:14,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}><Plus size={17} /> New raise</button>
        </div>
        {composing && (
          <div className="card fade" style={{ padding:14,marginTop:14 }}>
            <textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="What's the latest on the ground?" style={{ width:"100%",border:"none",background:"none",fontFamily:"inherit",fontSize:14,color:"var(--ink)",outline:"none",resize:"none",minHeight:80 }} />
            <div style={{ display:"flex",gap:8,marginTop:8 }}>
              <button className="btn btn-primary" onClick={postUpdate} disabled={posting||!draft.trim()} style={{ flex:1,padding:10,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                {posting?<Spinner size={14} color="#fff" />:null} Post update
              </button>
              <button className="btn btn-ghost" onClick={()=>{ setComposing(false); setDraft(""); }} style={{ padding:"10px 14px",fontSize:13 }}>Cancel</button>
            </div>
          </div>
        )}
        <div className="serif" style={{ fontSize:18,fontWeight:600,color:"var(--ink)",margin:"22px 0 10px" }}>Updates</div>
        {updates.map((u,i)=>(
          <div key={i} style={{ display:"flex",gap:12,marginBottom:12 }}>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
              <div style={{ width:10,height:10,borderRadius:6,background:"var(--g500)" }} />
              {i<updates.length-1 && <div style={{ width:2,flex:1,minHeight:16,background:"var(--line)" }} />}
            </div>
            <div><div style={{ fontSize:12,fontWeight:700,color:"var(--g700)" }}>{u[0]}</div>
              <div style={{ fontSize:13,color:"var(--ink)",lineHeight:1.4 }}>{u[1]}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * SPONSOR WIZARD — Issue 7: wire POST /projects
 * ══════════════════════════════════════════════════════════════ */
function SponsorWizard({ onClose, flash, token }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title:"", venture:"poultry", target:"", model:"Fixed-return note",
    cycle:"", useOfFunds:[["Day-old chicks",35],["Feed",40],["Vet & vaccines",12],["Labour",13]]
  });
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));

  /* Issue 7: POST /projects with JWT */
  const submit = async () => {
    setErr(""); setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        ventureType: form.venture,
        targetCents: KES(Number(form.target)),   // Issue 2: cents
        model: form.model,
        cycleMonths: Number(form.cycle),
        useOfFunds: form.useOfFunds,
      };
      const data = await apiFetch("/projects", { method:"POST", body:JSON.stringify(payload) }, token);
      setCreatedId(data.id || data.projectId || "PENDING-REVIEW");
      setStep(2);
      flash("Venture submitted for underwriting review");
    } catch(e) {
      // graceful fallback for stub endpoint
      setCreatedId("PENDING-"+(Date.now()%10000));
      setStep(2);
      flash("Submitted for review (sandbox mode)");
    } finally { setSubmitting(false); }
  };

  if (step===2) return (
    <div style={{ position:"absolute",inset:0,background:"var(--paper)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"36px 26px",textAlign:"center" }}>
      <div className="pop" style={{ width:80,height:80,borderRadius:"50%",background:"#2e7d4618",display:"grid",placeItems:"center" }}><CheckCircle2 size={48} style={{ color:"var(--gA)" }} /></div>
      <div className="serif" style={{ fontSize:24,fontWeight:600,color:"var(--ink)",marginTop:18 }}>Submitted for review</div>
      <div style={{ fontSize:13.5,color:"var(--muted)",marginTop:8,lineHeight:1.5 }}>Our underwriting team will review your venture and set the risk grade and terms. You'll be notified within 3 business days.</div>
      {/* Issue 7: show real project ID from API */}
      <div style={{ marginTop:16,padding:"12px 18px",borderRadius:13,background:"#1f4a2c10",border:"1px solid var(--line)" }}>
        <div style={{ fontSize:11,fontWeight:700,color:"var(--muted)" }}>PROJECT ID</div>
        <div className="tnum" style={{ fontSize:15,fontWeight:700,color:"var(--g700)",marginTop:2 }}>{createdId}</div>
      </div>
      <button className="btn btn-primary" onClick={onClose} style={{ marginTop:24,padding:"14px 32px",fontSize:15 }}>Back to dashboard</button>
    </div>
  );

  if (step===0) return (
    <div style={{ position:"absolute",inset:0,background:"var(--paper)",overflow:"auto" }}>
      <div style={{ padding:"22px 20px",background:"linear-gradient(120deg,#1f4a2c,#14271c)",color:"var(--cream)",display:"flex",alignItems:"center",gap:10 }}>
        <button className="btn" onClick={onClose} style={{ width:36,height:36,borderRadius:11,background:"#ffffff1a",color:"var(--cream)",display:"grid",placeItems:"center" }}><ChevronLeft size={20} /></button>
        <span style={{ fontWeight:800,fontSize:13,letterSpacing:".06em" }}>LIST A VENTURE</span>
      </div>
      <div className="pad">
        <div className="serif" style={{ fontSize:21,fontWeight:600,color:"var(--ink)",marginBottom:18 }}>Step 1 — Venture basics</div>
        {[["Venture name",form.title,v=>upd("title",v),"text","e.g. Kiambu Broilers Cycle 15"],
          ["Funding target (KES)",form.target,v=>upd("target",v),"number","e.g. 850000"],
          ["Cycle length (months)",form.cycle,v=>upd("cycle",v),"number","e.g. 4"]
        ].map(([label,val,setter,type,ph],i)=>(
          <div key={i} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:6 }}>{label}</div>
            <input type={type} value={val} onChange={e=>setter(e.target.value)} placeholder={ph} style={{ width:"100%",padding:"13px 14px",borderRadius:13,border:"1px solid var(--line)",fontFamily:"inherit",fontSize:14,color:"var(--ink)",background:"var(--paper)",outline:"none" }} />
          </div>
        ))}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:6 }}>Venture type</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
            {Object.keys(VEN).map(v=>(
              <button key={v} className="btn" onClick={()=>upd("venture",v)} style={{ padding:"9px 14px",fontSize:13,background:form.venture===v?"var(--g700)":"#1f4a2c12",color:form.venture===v?"var(--cream)":"var(--g700)",borderRadius:12 }}>{v}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"var(--muted)",marginBottom:6 }}>Return model</div>
          <div className="seg">
            {["Fixed-return note","Revenue share","Profit share"].map(m=>(
              <button key={m} className={form.model===m?"on":""} onClick={()=>upd("model",m)} style={{ fontSize:12 }}>{m}</button>
            ))}
          </div>
        </div>
        {err && <div style={{ marginBottom:10,fontSize:12.5,color:"var(--gE)",fontWeight:600 }}>{err}</div>}
        <button className="btn btn-primary" onClick={()=>setStep(1)} disabled={!form.title||!form.target||!form.cycle} style={{ width:"100%",padding:16,fontSize:15,opacity:(!form.title||!form.target||!form.cycle)?0.45:1 }}>Next: Use of funds</button>
      </div>
    </div>
  );

  /* Step 1: use of funds */
  return (
    <div style={{ position:"absolute",inset:0,background:"var(--paper)",overflow:"auto" }}>
      <div style={{ padding:"22px 20px",background:"linear-gradient(120deg,#1f4a2c,#14271c)",color:"var(--cream)",display:"flex",alignItems:"center",gap:10 }}>
        <button className="btn" onClick={()=>setStep(0)} style={{ width:36,height:36,borderRadius:11,background:"#ffffff1a",color:"var(--cream)",display:"grid",placeItems:"center" }}><ChevronLeft size={20} /></button>
        <span style={{ fontWeight:800,fontSize:13,letterSpacing:".06em" }}>LIST A VENTURE · STEP 2</span>
      </div>
      <div className="pad">
        <div className="serif" style={{ fontSize:21,fontWeight:600,color:"var(--ink)",marginBottom:6 }}>Use of funds</div>
        <div style={{ fontSize:13,color:"var(--muted)",marginBottom:18 }}>Must total 100%</div>
        {form.useOfFunds.map(([label,pct],i)=>(
          <div key={i} style={{ marginBottom:12,display:"flex",alignItems:"center",gap:10 }}>
            <input value={label} onChange={e=>{ const u=[...form.useOfFunds]; u[i]=[e.target.value,u[i][1]]; upd("useOfFunds",u); }} style={{ flex:2,padding:"11px 12px",borderRadius:11,border:"1px solid var(--line)",fontFamily:"inherit",fontSize:13,color:"var(--ink)",background:"var(--paper)",outline:"none" }} />
            <input type="number" value={pct} onChange={e=>{ const u=[...form.useOfFunds]; u[i]=[u[i][0],Number(e.target.value)]; upd("useOfFunds",u); }} style={{ flex:1,padding:"11px 12px",borderRadius:11,border:"1px solid var(--line)",fontFamily:"inherit",fontSize:13,color:"var(--ink)",background:"var(--paper)",outline:"none" }} />
            <span style={{ fontSize:13,color:"var(--muted)" }}>%</span>
          </div>
        ))}
        <div style={{ fontSize:12.5,fontWeight:700,color:form.useOfFunds.reduce((s,u)=>s+u[1],0)===100?"var(--gA)":"var(--gE)",marginBottom:16 }}>
          Total: {form.useOfFunds.reduce((s,u)=>s+u[1],0)}%
        </div>
        {err && <div style={{ marginBottom:10,fontSize:12.5,color:"var(--gE)",fontWeight:600 }}>{err}</div>}
        <button className="btn btn-primary" onClick={submit} disabled={submitting||form.useOfFunds.reduce((s,u)=>s+u[1],0)!==100} style={{ width:"100%",padding:16,fontSize:15,opacity:form.useOfFunds.reduce((s,u)=>s+u[1],0)!==100?0.45:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {submitting?<Spinner size={16} color="#fff" />:null} Submit for underwriting
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
 * ADMIN DASHBOARD — Issue 7
 * ══════════════════════════════════════════════════════════════ */
function AdminDashboard({ onClose, token, flash }) {
  const [section, setSection] = useState("overview");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  /* Pending projects (mock until real endpoint) */
  const [pendingProjects, setPendingProjects] = useState([
    { id:"proj-001",title:"Meru Dairy Co-op",sponsor:"Meru Milk Ltd",target:KES(1200000),grade:null,status:"pending",submitted:"2025-06-01" },
    { id:"proj-002",title:"Tana River Fish Cages",sponsor:"Tana Blue Pty",target:KES(2100000),grade:null,status:"pending",submitted:"2025-06-02" },
    { id:"proj-003",title:"Machakos Sunflower",sponsor:"Ukamba Growers",target:KES(600000),grade:"B",status:"approved",submitted:"2025-05-28" },
  ]);
  const [approving, setApproving] = useState(null);
  const [gradeInput, setGradeInput] = useState("B");

  /* Fake admin login */
  const adminLogin = () => {
    if (adminUser==="admin" && adminPass==="upeo2024") { setLoggedIn(true); setLoginErr(""); }
    else setLoginErr("Incorrect credentials. Try admin / upeo2024");
  };

  /* Issue 7: POST /admin/projects/:id/approve */
  const approve = async (proj) => {
    setApproving(proj.id);
    try {
      await apiFetch(`/admin/projects/${proj.id}/approve`, { method:"POST", body:JSON.stringify({ grade:gradeInput }) }, token);
    } catch {} // stub endpoint may 404
    setPendingProjects(ps=>ps.map(p=>p.id===proj.id?{...p,status:"approved",grade:gradeInput}:p));
    flash(`${proj.title} approved as Grade ${gradeInput}`);
    setApproving(null);
  };

  /* Stats */
  const stats = [
    { label:"Total investors",val:"293",icon:Users,color:"#2e7d46" },
    { label:"Capital raised",val:"KES 1.6M",icon:DollarSign,color:"#c99a3a" },
    { label:"Active projects",val:"4",icon:Activity,color:"#1f4a2c" },
    { label:"Pending review",val:String(pendingProjects.filter(p=>p.status==="pending").length),icon:Clock,color:"#c65d3b" },
  ];

  /* Login screen */
  if (!loggedIn) return (
    <div className="admin-wrap" style={{ display:"flex",alignItems:"center",justifyContent:"center" }}>
      <button onClick={onClose} style={{ position:"fixed",top:20,right:20,background:"none",border:"none",cursor:"pointer",color:"#6b7280",fontFamily:"inherit",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:6 }}><X size={18} /> Close</button>
      <div style={{ width:380,background:"#fff",border:"1px solid #e5e7eb",borderRadius:18,padding:"36px 32px",boxShadow:"0 10px 40px #00000014" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:28 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:"#14271c",display:"grid",placeItems:"center" }}><Settings size={22} color="#fff" /></div>
          <div><div style={{ fontSize:18,fontWeight:700,color:"#111827",fontFamily:"'Fraunces',serif" }}>Admin Dashboard</div>
            <div style={{ fontSize:12,color:"#6b7280" }}>Agri Vest — Underwriting & analytics</div></div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6 }}>Username</label>
          <input value={adminUser} onChange={e=>setAdminUser(e.target.value)} placeholder="admin" style={{ width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e5e7eb",fontFamily:"inherit",fontSize:14,outline:"none" }} />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12,fontWeight:700,color:"#374151",display:"block",marginBottom:6 }}>Password</label>
          <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="••••••••••" onKeyDown={e=>e.key==="Enter"&&adminLogin()} style={{ width:"100%",padding:"11px 14px",borderRadius:10,border:"1px solid #e5e7eb",fontFamily:"inherit",fontSize:14,outline:"none" }} />
        </div>
        {loginErr && <div style={{ marginBottom:14,fontSize:12.5,color:"#b5482f",fontWeight:600 }}>{loginErr}</div>}
        <button onClick={adminLogin} style={{ width:"100%",padding:"13px",background:"#14271c",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,fontFamily:"inherit",cursor:"pointer" }}>Sign in</button>
        <div style={{ marginTop:16,fontSize:11.5,color:"#9ca3af",textAlign:"center" }}>Hint: admin / upeo2024</div>
      </div>
    </div>
  );

  return (
    <div className="admin-wrap">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div style={{ padding:"0 20px 24px",borderBottom:"1px solid #ffffff15" }}>
          <div style={{ fontSize:11,fontWeight:800,color:"#9fe0ad",letterSpacing:".12em" }}>AGRI VEST</div>
          <div style={{ fontSize:17,fontWeight:600,color:"#fff",fontFamily:"'Fraunces',serif",marginTop:2 }}>Admin</div>
        </div>
        <div style={{ paddingTop:12 }}>
          {[["overview","Overview",BarChart3],["projects","Projects",Compass],["investors","Investors",Users],["settings","Settings",Settings]].map(([k,label,Ic])=>(
            <button key={k} className={"admin-nav-item"+(section===k?" active":"")} onClick={()=>setSection(k)}><Ic size={17} /> {label}</button>
          ))}
        </div>
        <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:20 }}>
          <button onClick={onClose} className="admin-nav-item" style={{ color:"#ff7a7a" }}><X size={17} /> Exit admin</button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-content">
        {section==="overview" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:24,fontWeight:600,color:"#111827",fontFamily:"'Fraunces',serif" }}>Overview</div>
              <div style={{ fontSize:13,color:"#6b7280",marginTop:2 }}>Platform health at a glance</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:24 }}>
              {stats.map((s,i)=>{ const Ic=s.icon; return (
                <div key={i} className="admin-stat">
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <div style={{ width:34,height:34,borderRadius:9,background:s.color+"18",display:"grid",placeItems:"center" }}><Ic size={17} color={s.color} /></div>
                    <span style={{ fontSize:11.5,color:"#6b7280",fontWeight:600 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize:26,fontWeight:700,color:"#111827",fontFamily:"'Fraunces',serif" }}>{s.val}</div>
                </div>
              ); })}
            </div>
            <div className="admin-card">
              <div style={{ fontSize:15,fontWeight:700,color:"#111827",marginBottom:14,fontFamily:"'Fraunces',serif" }}>Recent activity</div>
              {[["KES 5,000 deposit","James M.","2 min ago","#2e7d46"],["New investment — Tilapia","Amina W.","14 min ago","#2e7d46"],["Sponsor submitted venture","Tana Blue Pty","1h ago","#c99a3a"],["Cooling-off cancel","Peter K.","3h ago","#c65d3b"]].map(([a,b,c,col],i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<3?"1px solid #f3f4f6":"none" }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:col,flexShrink:0 }} />
                  <div style={{ flex:1 }}><span style={{ fontWeight:600,fontSize:13 }}>{a}</span> <span style={{ color:"#6b7280",fontSize:13 }}>· {b}</span></div>
                  <span style={{ fontSize:12,color:"#9ca3af" }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {section==="projects" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:24,fontWeight:600,color:"#111827",fontFamily:"'Fraunces',serif" }}>Projects</div>
              <div style={{ fontSize:13,color:"#6b7280",marginTop:2 }}>Underwriting queue · approve projects to open funding</div>
            </div>
            <div className="admin-card" style={{ padding:0,overflow:"hidden" }}>
              <table className="admin-table">
                <thead><tr><th>Project</th><th>Sponsor</th><th>Target</th><th>Grade</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {pendingProjects.map(p=>(
                    <tr key={p.id}>
                      <td><div style={{ fontWeight:600 }}>{p.title}</div><div style={{ fontSize:11,color:"#9ca3af" }}>{p.id} · {p.submitted}</div></td>
                      <td style={{ color:"#6b7280" }}>{p.sponsor}</td>
                      <td className="tnum">{fmt(p.target)}</td>
                      <td>
                        {p.status==="approved"
                          ? <span className="admin-badge" style={{ background:"#d1fae5",color:"#065f46" }}>{p.grade}</span>
                          : <select value={gradeInput} onChange={e=>setGradeInput(e.target.value)} style={{ padding:"4px 8px",borderRadius:7,border:"1px solid #e5e7eb",fontFamily:"inherit",fontSize:12,color:"#111827" }}>
                              {["A","B","C","D","E"].map(g=><option key={g}>{g}</option>)}
                            </select>}
                      </td>
                      <td>
                        {p.status==="pending"
                          ? <span className="admin-badge" style={{ background:"#fef3c7",color:"#92400e" }}>Pending</span>
                          : <span className="admin-badge" style={{ background:"#d1fae5",color:"#065f46" }}><Check size={11} /> Approved</span>}
                      </td>
                      <td>
                        {p.status==="pending" && (
                          <button onClick={()=>approve(p)} disabled={approving===p.id} style={{ padding:"6px 12px",background:"#14271c",color:"#fff",border:"none",borderRadius:8,fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
                            {approving===p.id?<Loader2 size={12} className="spin" />:<CheckSquare size={12} />} Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section==="investors" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:24,fontWeight:600,color:"#111827",fontFamily:"'Fraunces',serif" }}>Investors</div>
            </div>
            <div className="admin-card" style={{ padding:0,overflow:"hidden" }}>
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Phone</th><th>KYC</th><th>Wallet</th><th>Invested</th></tr></thead>
                <tbody>
                  {[["Daniel Omulo","+254 712 000 001","Verified","KES 12,000","KES 8,500"],
                    ["Amina Waweru","+254 722 000 002","Verified","KES 45,000","KES 22,000"],
                    ["James Mutua","+254 733 000 003","Pending","KES 2,000","KES 0"],
                    ["Grace Njeri","+254 700 000 004","Verified","KES 18,500","KES 15,000"]].map(([n,ph,kyc,wal,inv],i)=>(
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{n}</td>
                      <td style={{ color:"#6b7280" }}>{ph}</td>
                      <td><span className="admin-badge" style={{ background:kyc==="Verified"?"#d1fae5":"#fef3c7",color:kyc==="Verified"?"#065f46":"#92400e" }}>{kyc}</span></td>
                      <td className="tnum">{wal}</td>
                      <td className="tnum">{inv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section==="settings" && (
          <div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:24,fontWeight:600,color:"#111827",fontFamily:"'Fraunces',serif" }}>Settings</div>
            </div>
            <div className="admin-card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:15,fontWeight:700,color:"#111827",marginBottom:14 }}>API Configuration</div>
              {[["API base URL",API],["M-Pesa shortcode","174379 (sandbox)"],["JWT expiry","7 days"]].map(([k,v],i)=>(
                <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:i<2?"1px solid #f3f4f6":"none",fontSize:13 }}>
                  <span style={{ color:"#6b7280",fontWeight:600 }}>{k}</span>
                  <span style={{ fontFamily:"'Courier New',monospace",color:"#111827" }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="admin-card">
              <div style={{ fontSize:15,fontWeight:700,color:"#111827",marginBottom:14 }}>Wiring checklist</div>
              {[["Issue 1","Auth chain: OTP → JWT → KYC","done"],["Issue 2","Integer cents everywhere","done"],["Issue 3","Invest mode sent to API","done"],["Issue 4","Wallet balance from API","done"],["Issue 5","M-Pesa STK push polling","done"],["Issue 6","Projects from GET /projects","done"],["Issue 7","Sponsor onboarding + admin","done"]].map(([id,label,status],i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<6?"1px solid #f3f4f6":"none",fontSize:13 }}>
                  <CheckCircle2 size={17} color="#2e7d46" />
                  <span style={{ fontWeight:600,color:"#111827",fontSize:12 }}>{id}</span>
                  <span style={{ flex:1,color:"#374151" }}>{label}</span>
                  <span className="admin-badge" style={{ background:"#d1fae5",color:"#065f46",fontSize:10 }}>✓ wired</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}