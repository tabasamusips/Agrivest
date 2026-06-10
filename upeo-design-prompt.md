# Master Prompt — Design "Agri Vest"

> Paste everything below the line into a capable AI model. Edit the bracketed `[ ]` choices first if you want to constrain scope; otherwise the model will make sensible defaults.

---

## ROLE

You are a **senior product designer and full-stack architect** with deep experience shipping regulated fintech in East Africa. You understand the Kenyan capital-markets environment (CMA licensing, mobile-money rails, KYC/AML), agricultural value chains, and mobile-first UX for users on mid-range Android devices and intermittent connectivity. Design with the rigor of someone who will actually have to build, license, and operate this.

## THE PRODUCT

Design **Agri Vest** — a mobile-first agricultural investment platform for the **Kenyan and East African market** (Kenya, Uganda, Tanzania, Rwanda; design for expansion).

The mental model is **Ndovu (ndovu.co.ke), but exclusively for agriculture.** Where Ndovu democratizes access to stocks, ETFs, MMFs and bonds with M-Pesa integration, low minimums, and a 3-minute KYC flow, Agri Vest does the same for **real agricultural ventures with a clear, competitive ROI**: crop farming, livestock, fish farming (aquaculture), beekeeping, horticulture, aquaponics, agroforestry, poultry, dairy, and any viable agri-venture that can be underwritten and tracked to a return.

The UX/UI must feel **as polished as Ndovu and meaningfully better** — calmer, more transparent about risk, and built for first-time investors who have never bought a financial product before.

## TWO INVESTMENT MODES (core mechanic — design both)

1. **Solo investor** — an individual funds a whole project (or a defined tranche) on their own and receives the full proportional return.
2. **Crowdfunding / pooled** — many investors pool capital into a single project, each owning a fractional share of the project and its returns. Low minimum entry (target ~KES 500) so anyone can participate.

Design the full lifecycle for both: discovery → due diligence view → commitment → funding via mobile money → active project tracking → payout/return → reinvest or withdraw. Make pooled and solo flows share components where sensible but differ where the economics demand it.

## WHAT TO DESIGN — DELIVER ALL SECTIONS

### 1. Product strategy
- One-paragraph product thesis and the specific problem Agri Vest solves for (a) investors and (b) farmers/project sponsors.
- Target personas (at minimum: first-time retail investor, diaspora investor, experienced investor, and the farmer/sponsor raising capital).
- How Agri Vest differs from Ndovu and from existing agri-financing models, and why the difference matters.

### 2. Marketplace & ROI mechanics
- How a project gets listed: sponsor onboarding, vetting/underwriting, and the data shown to investors (ROI projection, cycle length, risk grade, collateral/insurance, sponsor track record, use of funds).
- Return models to support: fixed-return notes, revenue/profit-share, harvest-cycle payouts, and equity-style ownership. Be explicit about how returns are calculated, when they pay out, and how a "fair but competitive ROI" is set and communicated honestly.
- Risk framework: how each project is risk-graded, how weather/disease/market risk is disclosed, and what protections exist (insurance, escrow, collateral, guarantees, diversification nudges).
- Secondary liquidity: can an investor exit before a cycle ends? Design a secondary market or buyback mechanism, or clearly state why not.

### 3. UX / UI design
- Full information architecture and primary navigation.
- Key screens described in detail (layout, hierarchy, components, states): onboarding + KYC, home/portfolio dashboard, project discovery & filters, project detail page, the solo-vs-pool investment flow, wallet/deposit/withdraw (M-Pesa), payouts, and an education hub.
- A visual design direction: tone, color system, typography, iconography, imagery approach — earthy and trustworthy, optimized for low-end Android and bright outdoor sunlight readability. Explain the rationale.
- Trust & transparency patterns specific to a *novel, riskier* asset class than Ndovu's: how to show risk without scaring users, how to set expectations, and how to avoid over-promising returns.
- Accessibility, localization (English + Swahili, expandable), low-bandwidth and offline-tolerant behavior.

### 4. Full-stack architecture
- System architecture diagram (described in text) and a recommended tech stack with justification, suitable for a lean team building for Android-first East Africa.
- Core data models: User/Investor, Sponsor/Farmer, Project, Tranche/Pool, Investment/Position, Transaction, Payout, KYC record, Wallet.
- API surface: key endpoints/services for auth, KYC, project lifecycle, investing, wallet, payouts, and notifications.
- Payments & wallet: M-Pesa (Daraja / STK push), bank, and card integration; ledger design and reconciliation; how pooled funds are held and disbursed safely (custodial/escrow accounts segregated from company funds).
- Project tracking: how real-world progress is captured and shown (sponsor updates, photo/video evidence, milestone verification, geolocation, optional IoT/sensor or satellite data).
- Notifications, background jobs (payout cycles, cron), and observability.

### 5. Compliance, trust & operations
- Regulatory posture for Kenya (CMA and any relevant agri/crowdfunding regulation) and a note on cross-border expansion. Flag what legal/licensing questions a founder must resolve before launch — do not pretend regulatory questions are settled.
- KYC/AML approach, fraud prevention, and protection of investor funds.
- What happens when a project underperforms or fails: default handling, partial returns, communication, and dispute resolution.

### 6. MVP & roadmap
- A focused MVP scope (what ships first to validate the model with the least risk).
- A phased roadmap from MVP to full platform, with the riskiest assumptions to test at each phase.

## CONSTRAINTS & PRINCIPLES
- **Mobile-first**, Android-primary, M-Pesa-native. Assume many users are financially inexperienced.
- **Honesty over hype.** Agriculture carries real risk (weather, disease, price swings). Never present guaranteed or unrealistic returns; design the product and the language to be truthful about risk.
- Be **concrete and decision-ready** — make specific recommendations and state the trade-offs, rather than listing generic options.
- Where you make an assumption, state it explicitly.

## OUTPUT FORMAT
Produce a structured design document with clear section headers matching the deliverables above. Use diagrams-as-text and tables where they aid clarity. Where you'd build a screen, describe it concretely enough that a designer could mock it and a developer could build it. End with the open questions and risks the founding team must resolve before writing code.
