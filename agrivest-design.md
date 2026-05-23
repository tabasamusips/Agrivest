# Agri Vest — Platform Design & Architecture

*A mobile-first agricultural investment platform for Kenya & East Africa*

**Document type:** Product + architecture design, decision-ready
**Assumed primary market:** Kenya at launch; Uganda, Tanzania, Rwanda on the roadmap
**One-line:** Ndovu's accessibility, applied to real agricultural ventures with honestly-graded risk and transparent harvest-cycle returns.

> **Stated assumptions up front.** (1) Agri Vest intends to operate the marketplace itself rather than be a pure listing board, which means it falls under Kenya's investment-crowdfunding regime. (2) The founding team can raise the regulatory capital required (see §5). (3) Android-primary, M-Pesa-native, users often financially inexperienced and on intermittent connectivity. Where a recommendation hinges on an unverified business choice, it is flagged.

---

## 1. Product strategy

### 1.1 Thesis
Smallholder and SME agriculture in East Africa is chronically under-capitalised: banks treat farming as high-risk and collateral-light, while ordinary savers have no clean way to put money into the sector and earn a return. Meanwhile platforms like Ndovu have proven that Kenyans *will* invest from KES 500 on their phones via M-Pesa when the product is simple, regulated, and trustworthy. Agri Vest sits in that gap: it lets everyday investors fund vetted agricultural projects — solo or pooled — and lets farmers/agri-SMEs raise structured capital they otherwise can't access. The hard part is not the app; it is **honest underwriting and disciplined fund custody.** That is where the product must be excellent.

### 1.2 The problem, per side
- **Investors:** No accessible, regulated way to invest in agriculture. The alternatives are informal "send money to a relative's farm" arrangements (no protection, no transparency) or formal capital markets that ignore the sector entirely. They lack the tools to judge agri-risk.
- **Farmers / sponsors:** Bank loans demand collateral they don't have and carry rates that biological cycles can't service. They need patient, cycle-aligned capital and are willing to share upside for it.

### 1.3 Personas
| Persona | Who | Primary need | Design implication |
|---|---|---|---|
| **First-time retail investor** | 25–40, salaried/hustle income, has used M-Pesa & maybe Ndovu | Start small, not lose money, understand what they're buying | Radical simplicity; risk shown plainly; small minimums |
| **Diaspora investor** | Kenyan/EA abroad, USD income, emotional tie to "back home" | Invest in home agriculture, trust it's real | Strong evidence/tracking; USD funding; remote KYC |
| **Experienced investor** | Has a portfolio, wants yield + diversification | Higher allocations, data, secondary exit | Deeper analytics; larger tranches; portfolio tools |
| **Sponsor / farmer-SME** | Agri-SME or organised cooperative seeking KES 0.5M–100M | Raise cycle-aligned capital, prove themselves | Onboarding + reporting tooling; reputation that compounds |

### 1.4 How Agri Vest differs
- **vs. Ndovu:** Ndovu sells *regulated financial instruments* (MMFs, ETFs, bonds, stocks) where the underlying is liquid and priced by markets. Agri Vest's underlying is a **biological, illiquid, weather-exposed real asset**. That changes everything: returns are cycle-based not continuous, exit is hard, and risk disclosure is a first-class product surface, not fine print.
- **vs. donation crowdfunding (M-Changa etc.):** Investors expect a *return*, which puts Agri Vest squarely under CMA investment-crowdfunding rules (§5).
- **vs. informal agri-financing:** Adds vetting, custody, insurance, evidence-based tracking, and legal recourse.

The defensible moat over time is **proprietary underwriting data** — every completed cycle teaches the platform what actually predicts repayment in East African agriculture.

---

## 2. Marketplace & ROI mechanics

This section is the product. Get it right and the app is a skin over it.

### 2.1 Listing lifecycle (sponsor side)
1. **Apply** → sponsor submits business, the venture, amount sought, cycle length, intended use of funds.
2. **Underwrite** → Agri Vest's credit/agronomy team scores the project (§2.4). This is human-led at launch, data-assisted later. *Do not automate this early; it is the risk core.*
3. **Structure** → choose return model (§2.2), set the raise target, tranche/pool structure, milestone disbursement schedule, required insurance/collateral.
4. **List** → published to the marketplace with a standardised disclosure pack.
5. **Fund** → solo or pooled commitments accumulate until target met (or window closes).
6. **Disburse** → on a successful round, the custodian releases funds to the sponsor **against milestones**, never as a lump sum, where the structure allows.
7. **Operate & report** → sponsor posts mandatory progress updates with evidence (§4.5).
8. **Payout** → returns flow back to investors per the model and schedule.
9. **Close & rate** → cycle closes; sponsor and investors are rated; reputation updates.

**What investors see on a project (standardised, every time):** venture type, location, sponsor track record, amount sought / raised, **projected ROI and the basis for it**, cycle length, payout schedule, **risk grade and the top 3 risk drivers**, insurance & collateral in place, use-of-funds breakdown, and the explicit downside ("what happens if this fails").

### 2.2 Return models (support these four)
| Model | Mechanic | Risk to investor | Best for |
|---|---|---|---|
| **Fixed-return note** | Debt-like: sponsor repays principal + fixed % over the cycle | Lower (but sponsor default risk remains) | Established sponsors, short cycles, working-capital needs (e.g. poultry restock) |
| **Revenue / profit-share** | Investor gets a % of revenue or net profit at harvest/sale | Medium–high; upside and downside both real | Horticulture, fish, where output value varies |
| **Harvest-cycle payout** | Single payout at end of biological cycle (a special case of either above) | Tied to one event → concentrated | Maize, beans, single-harvest crops |
| **Equity-style** | Ownership stake in the venture, returns via dividends/exit | Highest, longest | Scaling agri-SMEs, agroforestry, multi-year |

**Setting a "fair but competitive" ROI honestly.** Anchor every projection to real reference rates so it is defensible, not aspirational:
- **Floor reference:** Kenyan money-market funds and T-bills (broadly ~10–14% nominal in recent conditions — *the model must pull live rates, not hardcode*). If an agri project can't credibly beat a risk-free-ish MMF, it shouldn't be listed — the investor has a better safe option.
- **Premium for risk:** the projected return must exceed the floor by a margin proportionate to the project's risk grade. Higher grade risk → higher *projected* return, never a higher *guaranteed* one.
- **Honest framing rule:** show returns as **ranges with a clearly-labelled "expected" and "downside" scenario**, never a single hero number, and **never** the word "guaranteed" unless the return is genuinely capital-guaranteed by a third party.

### 2.3 Solo vs. pooled (the core mechanic)
- **Solo:** one investor funds a whole project or a defined tranche. Full proportional return, full proportional risk. Higher minimums. Optional "sole sponsor" recognition.
- **Pooled (crowdfunding):** many investors buy fractional units of one project. Minimum entry targeted at **~KES 500** so anyone can participate. Each investor holds a `Position` = units × unit-economics of the project.
- **Shared vs. divergent flows:** discovery, project detail, KYC, wallet, tracking, and payout are **shared components**. They diverge at the **commitment step**: solo presents tranche sizing and a single-funder confirmation; pooled presents a units slider, live funding-progress bar, "X investors so far," and partial-fill handling (what happens if the round under-fills — refund vs. proceed at reduced scale, decided at structuring time and disclosed).

### 2.4 Risk framework
**Grade every project A–E** (A = lowest risk). Inputs:
- Sponsor track record on-platform + verifiable history off-platform.
- Venture type's intrinsic volatility (e.g. broiler poultry cycle ≠ rain-fed maize ≠ multi-year agroforestry).
- Weather/climate exposure and whether index-based insurance is attached.
- Disease/biological risk and mitigation (vet cover, certified inputs).
- Market/price risk (offtake agreement in place? buyer secured?).
- Collateral and guarantees.

**Disclosure pattern:** the grade is a single letter *plus* the three biggest drivers in plain language ("Rain-dependent — no irrigation," "First-time sponsor," "Buyer not yet contracted"). Never let the letter stand alone.

**Protections to build in:**
- **Index-based crop/livestock insurance** via established East African providers (e.g. ACRE Africa, Pula) — attach at structuring, surface to investors.
- **Milestone escrow disbursement** so funds aren't fully exposed day one.
- **Offtake / buyer agreements** captured as a risk-reducer.
- **Collateral / personal guarantees** where available.
- **Diversification nudges in-app**: warn when a user concentrates too heavily in one project/venture-type/region; suggest spreading.

### 2.5 Secondary liquidity — be honest
Biological assets mid-cycle are genuinely illiquid; you cannot sell half a growing maize crop. Options, in order of honesty:
1. **Hold-to-maturity default** (most truthful). Set expectations hard at commitment: "Your money is committed until [date]."
2. **Regulatory cooling-off exit:** the CMA-mandated **48-hour cooling-off** window is the one clean, penalty-free exit and must be implemented exactly.
3. **Peer secondary market (later phase):** a board where an investor can offer their `Position` to another investor at a negotiated/discounted price. Real, but builds liquidity slowly and adds compliance complexity — defer past MVP.
4. **Sponsor/platform buyback (rare):** only where a sponsor or a liquidity facility opts in; do not promise it generally.

**Recommendation:** ship hold-to-maturity + cooling-off for MVP, message illiquidity bluntly, and treat a secondary market as a Phase-3 differentiator — not a launch promise.

---

## 3. UX / UI design

### 3.1 Information architecture
Five-tab bottom nav (thumb-reachable, the dominant pattern users already know):
1. **Home / Portfolio** — net worth, returns to date, next payout, holdings, alerts.
2. **Discover** — browse & filter projects.
3. **Wallet** — deposit, withdraw, transaction history (M-Pesa-centric).
4. **Learn** — education hub (the trust engine for a novel asset class).
5. **Profile** — KYC status, settings, referrals, support.

A persistent, unmissable **"Invest"** action lives on the Discover and project-detail surfaces.

### 3.2 Key screens (build-ready descriptions)

**Onboarding + KYC**
- 3-screen value intro (skippable), phone-number + OTP signup (M-Pesa-aligned identity).
- Tiered KYC: browse freely; **invest only after ID verification** (national ID/passport, selfie liveness). Diaspora: passport + proof of address path.
- Progress shown as steps; never a blank wall. Save-and-resume because connectivity drops.
- Default language English with a one-tap **Swahili** toggle from screen one.

**Home / Portfolio dashboard**
- Top: total invested, current value, returns earned (with the honest caveat that agri value is *projected* until realised).
- "Next payout" card with date and amount.
- Holdings list: each shows project, venture icon, grade, status (Funding / Active / Harvest / Paid), progress.
- Empty state coaches a first KES 500 investment.

**Discover + filters**
- Card per project: hero photo, venture type, location, **risk grade chip**, projected-return range, % funded (pooled) with progress bar, days left, min entry.
- Filters: venture type, region/county, risk grade, return model, cycle length, min investment, funding status. (Scrollable checkbox lists, not fiddly dropdowns — better on low-end touch.)
- Sort: ending soon, newest, highest projected return, lowest risk.

**Project detail (the conversion + trust surface)**
- Hero media (photo/video of the actual site/sponsor).
- Snapshot bar: grade • projected return range • cycle length • min entry • % funded.
- Sections: The Venture · The Sponsor (track record, past cycles, ratings) · **The Numbers** (use-of-funds, expected vs. downside scenarios, payout schedule) · **The Risks** (top drivers in plain language) · Protections (insurance/collateral/offtake) · Updates feed (once active).
- Sticky bottom **Invest** button → mode selector (Solo / Join the pool).

**Investment flow**
- *Pooled:* amount slider/stepper from KES 500 → live "you'd own X units, projected return KES Y," running funding bar, investor count → review → **M-Pesa STK push** → confirmation with the 48-hour cooling-off clearly stated.
- *Solo:* tranche selection or full-project → same review → confirm.
- Review screen restates the **downside** and illiquidity before commit — friction here is a feature.

**Wallet (M-Pesa-native)**
- Balance + deposit (STK push) + withdraw (to M-Pesa).
- Transaction history with clear states (Pending / Held / Invested / Returned).
- Show settlement timing honestly (deposits instant; returns arrive on cycle dates).

**Education hub**
- Bite-size, Swahili-available: "What is a return?", "Why agriculture is risky," "What a risk grade means," "What happens if a project fails." This is not marketing fluff — for a novel asset class it is the difference between informed investors and angry ones.

### 3.3 Visual direction
- **Tone:** earthy, grounded, trustworthy — *not* slick-crypto, *not* charity. Confident and calm.
- **Palette:** deep agricultural green + warm soil/terracotta accent + high-contrast neutrals. Crucially, **WCAG-AA contrast and high luminance** because users will be reading outdoors in bright sun on cheap screens.
- **Typography:** one humanist sans, large base size, generous line height. Numbers tabular and prominent.
- **Iconography:** simple, literal venture icons (cow, fish, bee, leaf) — aids low-literacy and fast scanning.
- **Imagery:** real photos of real sponsors/sites. Authenticity is the brand. Stock farm photos quietly erode trust.
- **Risk visualization:** colour-coded grade chips (A green → E amber/red) **paired with text**, never colour alone (colour-blindness + the "red = avoid" misread).

### 3.4 Trust & transparency patterns (asset-class specific)
- **Scenario, not single number:** always expected + downside.
- **"What if it fails?"** as a standing, expandable element on every project — normalise the question.
- **Evidence-forward:** dated photos/video and milestone check-marks in the updates feed.
- **Reputation everywhere:** sponsor completion history and investor ratings.
- **No urgency dark-patterns.** Countdown timers state facts ("Funding closes 12 May"), never manufacture panic. Trust compounds; cheap conversion tricks burn it.

### 3.5 Accessibility, localization, low-bandwidth
- English + **Swahili** at launch; architecture ready for Luganda/Kinyarwanda/French (Rwanda).
- Large tap targets, screen-reader labels, colour-independent status.
- **Low-bandwidth/offline tolerance:** cache portfolio & viewed projects for offline read; compress and lazy-load media; queue actions and sync on reconnect; degrade gracefully to a data-light mode. Treat 3G-on-a-good-day as the baseline, not the exception.

---

## 4. Full-stack architecture

### 4.1 Architecture (text diagram)
```
                 ┌─────────────────────────────┐
                 │  Mobile app (Android-first)  │   React Native + Expo
                 │  + thin web portal           │   (TypeScript)
                 └───────────────┬──────────────┘
                                 │ HTTPS / REST (+ OpenAPI)
                 ┌───────────────▼──────────────┐
                 │        API Gateway / BFF      │
                 └───────────────┬──────────────┘
        ┌────────────────┬───────┴────────┬─────────────────┐
        ▼                ▼                ▼                 ▼
  ┌──────────┐    ┌────────────┐   ┌────────────┐    ┌────────────┐
  │  Auth /  │    │  Core      │   │  Ledger /  │    │  Payments  │
  │  KYC     │    │  Marketplace│  │  Wallet    │    │  (M-Pesa,  │
  │  service │    │  service    │  │  service   │    │  PSP)      │
  └────┬─────┘    └─────┬──────┘   └─────┬──────┘    └─────┬──────┘
       │                │                │                 │
       └────────────────┴──────┬─────────┴─────────────────┘
                                ▼
                   ┌────────────────────────┐
                   │  PostgreSQL (primary)   │  ← double-entry ledger lives here
                   │  Redis (cache, queues)  │
                   │  Object store (media)   │
                   └────────────────────────┘
                                ▲
        ┌───────────────────────┴────────────────────────┐
        │  Ops/Admin console (underwriting, KYC review,    │
        │  payouts, CMA reporting)   +  Background workers  │
        └──────────────────────────────────────────────────┘
```
Start as a **modular monolith** (services as modules in one deployable), not microservices — a lean team ships faster and a money-moving system benefits from transactional simplicity. Split out services only when scale demands.

### 4.2 Recommended stack (with rationale)
| Layer | Recommendation | Why | Alternative |
|---|---|---|---|
| Mobile | **React Native + Expo (TypeScript)** | One codebase, Android-first, large talent pool in Nairobi, shares types/skills with backend | Flutter (best raw perf on low-end Android — pick if team is Dart-strong) |
| Backend | **NestJS (TypeScript)** | Structured, testable, shared types with the app, strong for a money system | Django (gives a free admin — strong if team is Python-first) |
| DB | **PostgreSQL** | Transactional integrity, constraints, the ledger needs ACID | — |
| Cache/queues | **Redis** | Sessions, rate-limits, job queues (payout cron) | — |
| Media | Object storage (S3-compatible) + CDN | Cheap, scalable, offload images/video | — |
| Admin/ops | Internal console (or Django admin / Retool early) | Underwriting + payouts + CMA reporting must be operable day one | — |

**Data-residency note:** Kenya's Data Protection Act (2019) and CMA expectations push toward a **region-local or Kenya-resident primary datastore**. Verify hosting/residency before committing infra — flagged as an open question.

### 4.3 Core data models
- **User** (investor/sponsor/admin roles), `kyc_status`, locale.
- **KycRecord** — id docs, liveness, verification status, audit trail.
- **Sponsor** — profile, track record, ratings, linked bank/M-Pesa for disbursement.
- **Project** — venture type, location, return model, risk grade + drivers, cycle dates, target amount, use-of-funds, insurance/collateral, status.
- **Tranche / Pool** — for pooled: total units, unit price, units sold, min entry, partial-fill rule.
- **Investment / Position** — user ↔ project, amount, units, status, projected & realised return.
- **Transaction (ledger entry)** — append-only, double-entry (debit/credit), references wallet accounts.
- **Payout** — scheduled & executed returns to positions.
- **Wallet** — per-user balance derived from the ledger, not stored as a mutable number.

### 4.4 Ledger & fund custody (the non-negotiable core)
- **Double-entry, append-only ledger** in PostgreSQL. A user's balance is the **sum of their ledger entries**, never an editable field. Every money movement is two balanced entries. This is how you stay reconcilable and audit-clean — and pooled investor money makes it mandatory, not optional.
- **Segregated custody:** under CMA rules the platform must **appoint a custodian**; pooled funds are held in a **custodial/escrow account separate from company operating funds**, released to the sponsor only on a successful round and (where structured) against milestones. Build the ledger to mirror this separation explicitly.
- **Idempotency + reconciliation:** every M-Pesa callback is idempotent (the same callback can't double-credit); a daily reconciliation job matches ledger ↔ M-Pesa ↔ custodian statements and alerts on any drift.

### 4.5 Payments & project tracking
- **M-Pesa Daraja:** STK Push (deposits/investing), C2B (inbound), **B2C (payouts to investors)**. A PSP aggregator adds cards/bank for diaspora; multi-currency wallet for USD.
- **Project tracking / evidence:** sponsor app posts dated updates with **photo/video, milestone check-ins, and geotag**; admin verifies milestones before the next escrow release. Phase-in optional **satellite/NDVI or IoT sensor** data for higher-value projects as objective signal.

### 4.6 Notifications, jobs, observability
- Push + SMS (SMS is the reliable channel in EA) for: funding milestones, payouts, cooling-off expiry, project updates, KYC outcomes.
- Background workers: payout scheduling, cooling-off timers, reconciliation, CMA monthly report generation, cron health-checks (self-healing, alert on miss).
- Observability: structured logs (PII-redacted), metrics, error tracking, and a money-movement audit trail retained per regulation.

---

## 5. Compliance, trust & operations

> Not legal advice. These are the questions and constraints a founder must resolve **with a Kenyan capital-markets lawyer before writing production code.**

### 5.1 Regulatory posture — Kenya
Agri Vest, by offering investors a return on pooled/solo capital into ventures, is **investment-based crowdfunding** under the **Capital Markets (Investment-Based Crowdfunding) Regulations, 2022** (gazetted Sept 2022). Direct, load-bearing constraints:
- **Operator licence from CMA required**; the platform itself must be CMA-approved.
- **Capital:** company limited by shares, **min paid-up capital KES 5,000,000** and **min liquid capital KES 10,000,000** (or 8% of liabilities, whichever is higher).
- **Issuer cap:** an issuer may raise at most **KES 100,000,000 per 12 months** on the platform (above this, apply to CMA for a no-objection).
- **48-hour cooling-off:** investors can withdraw penalty-free within 48 hours; funds released back within 48 hours of request. (Maps directly to §2.5.)
- **Custodian mandatory;** funds to issuer only on a successful round.
- **Reporting:** monthly reports to CMA (issuers, offers, use of funds, investors, amounts), quarterly management accounts, audited accounts within four months.
- **Disclosure & investor caps:** full risk disclosure with warnings; investor limits apply (notably for retail/non-sophisticated investors — confirm current thresholds with counsel).
- **Penalties for non-compliance are severe** (fines up to KES 10M for companies, plus disgorgement). Compliance is existential, not optional.

**Implication:** the regulatory layer (licence, custodian, capital, reporting) is the **critical path to launch — longer than the build.** Sequence legal/licensing in parallel with, or ahead of, engineering.

### 5.2 Cross-border expansion
- **Tanzania:** has its own regime — Capital Markets and Securities (Investment-Based Crowdfunding) Guidelines, 2023 — requiring a CMSA licence and local incorporation.
- **Uganda / Rwanda:** different (and evolving) frameworks; treat each as a separate licensing project. Targeting a country's investors from outside can itself trigger that country's rules, so expansion is jurisdiction-by-jurisdiction, not a flag-flip.

### 5.3 KYC/AML, fraud, fund protection
- Tiered KYC (browse → verified-to-invest); ID + liveness; sanctions/PEP screening; transaction monitoring.
- Sponsor due diligence is the bigger fraud surface than investor KYC — a fake project is worse than a fake investor. Verify sponsor existence, the venture's reality (site visits early on), and bank/M-Pesa ownership.
- Segregated custody (§4.4) protects investor funds from platform insolvency.

### 5.4 When a project underperforms or fails
Design this *before* it happens — it will happen.
- **Define default/underperformance** per return model and disclose it on the project page.
- **Recovery waterfall:** insurance payout → collateral → guarantee → partial recovery → write-down. Distribute recoveries pro-rata across pooled investors via the ledger.
- **Communicate fast and plainly.** Silence is what turns a loss into a scandal. Proactive "this project is behind, here's why and what we're doing" updates.
- **Dispute resolution:** clear in-app process and an escalation path; log everything.
- **Don't socialise losses or quietly backstop** failures — it's likely non-compliant and definitely unsustainable. Honesty about risk (§2, §3.4) is what makes losses survivable for the brand.

---

## 6. MVP & roadmap

### 6.1 MVP — validate the model at minimum risk
**Goal:** prove that (a) investors will fund vetted agri projects via M-Pesa and (b) sponsors repay, with real custody and real underwriting — at small scale.

In scope:
- Phone+OTP signup, tiered KYC, English + Swahili.
- A **handful of hand-underwritten projects** (manual underwriting — no automation).
- **Pooled investing from KES 500** + solo for one or two projects.
- M-Pesa deposit / invest / payout; **double-entry ledger + segregated custody from day one** (never skip this).
- Project detail with full honest disclosure; updates feed with photo evidence.
- Hold-to-maturity + **48-hour cooling-off**.
- Ops console for underwriting, KYC review, milestone verification, payouts, CMA reporting.
- **Regulatory:** operator licence / sandbox path resolved *before* taking public money. (A CMA regulatory-sandbox entry is a credible lower-stakes starting point — confirm with counsel.)

Explicitly **out** of MVP: secondary market, equity-style deals, IoT/satellite, multi-country, cards (M-Pesa only first).

### 6.2 Phased roadmap & riskiest assumptions
| Phase | Adds | Riskiest assumption to test |
|---|---|---|
| **0 — Pre-build** | Licence/sandbox, custodian, legal, capital | *Can we even be licensed and capitalised?* (kills or greenlights everything) |
| **1 — MVP** | Pooled+solo, M-Pesa, manual underwriting, hold-to-maturity | *Will investors fund agri projects, and do sponsors repay?* |
| **2 — Trust & scale** | More return models, insurance integration, diaspora USD + cards, richer analytics, sponsor reputation | *Does demand scale beyond early adopters without underwriting quality dropping?* |
| **3 — Differentiation** | Secondary market, equity deals, satellite/IoT signals, partial automation of underwriting | *Can we add liquidity & automation without adding systemic risk?* |
| **4 — Regional** | Tanzania, Uganda, Rwanda (each its own licence) | *Does the model survive a different regulatory + agronomic context?* |

---

## Open questions & risks the team must resolve before code

1. **Licensing path & timeline.** Full operator licence vs. CMA regulatory sandbox first? This gates everything and is likely the longest pole.
2. **Capital.** Can the team meet KES 5M paid-up / KES 10M liquid capital? If not, the regulated-operator model isn't viable as designed.
3. **Custodian.** Which CMA-approved custodian, on what terms, and how does the ledger mirror the custody arrangement?
4. **Underwriting capability.** Who does agronomy + credit underwriting? This human expertise is the actual product risk — not the app.
5. **Insurance partners.** Confirm index-based crop/livestock insurance availability and cost (ACRE Africa / Pula or similar) — it materially changes risk grades.
6. **Investor caps & suitability.** Current retail investor limits and suitability/appropriateness requirements under the 2022 Regulations — confirm exact thresholds with counsel.
7. **Data residency.** Where must the primary datastore live to satisfy the Data Protection Act and CMA expectations?
8. **Default economics.** Model expected default rates by venture type; if recoveries are weak, the honest projected returns may not clear the MMF floor — which would mean rethinking which ventures are listable at all.
9. **Unit/return accounting for partial fills and early sponsor exit** — define precisely before pooled money moves.

---

*This is a design and architecture brief, not legal, financial, or investment advice. Every regulatory figure here should be confirmed against the current gazetted regulations and with a licensed Kenyan capital-markets advocate before launch.*
