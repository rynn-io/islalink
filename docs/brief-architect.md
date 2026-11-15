# Brief: IsdaLink — real system architecture

You are the **Architect**. Ryn (solo founder, ex-UX designer, Philippines) has a working
React demo of IsdaLink and needs the *real system* designed behind it. Not a redesign of
the demo UI — that is someone else's job. Your deliverable is architecture, data model,
the forecast pipeline, MVP scoping, and risk. Docs only.

## The startup
IsdaLink is a digital fisheries platform connecting small-scale fishers and fish farmers
with buyers (restaurants, wholesalers, public markets, consumers) in the Philippines.
Goals: better fisher income, less post-harvest loss, better seafood distribution,
traceable seafood.

Five product pillars:
1. **Fishery marketplace** — fishers post species, volume, price, landing location; buyers order.
2. **AI price prediction** — forecast selling prices from historical prices, supply, demand, season.
3. **Catch & inventory management** — volumes, stocks, sales, inventory per fisher/farm.
4. **Cold chain & delivery coordination** — ice suppliers, cold storage, delivery providers.
5. **QR seafood traceability** — buyer scans to see source, catch date, location, handling record.

Business model: transaction fee, premium subscription (commercial sellers), delivery
coordination fee, B2B procurement subscription, data/analytics reports to authorised orgs.

## What already exists (do not rebuild, do not edit `src/`)
Working demo at **/projects/islalink** (Vite + React 18, zero UI dependencies):

- `src/lib/forecast.js` — deterministic price-forecast engine. Exports `SPECIES` (9 PH species:
  bangus, tilapia, galunggong, tamban, lapulapu, hipon, alimasag, pusit, tahong, each with
  `basePrice` ₱/kg), `getForecast(speciesId, {days, today})` → history/forecast/confidence/
  recommendation/drivers, `getMarketSummary(today)`, `getDemandHeat(today)`.
  Seeded PRNG (mulberry32) — no real data. This is the *stand-in* for the ML model.
- `src/lib/trace.js` — deterministic lot generator: `makeLot({species, boat, fisher, lbs,
  landedAt, lotId, now})` → lot id `ISL-<YYWW>-<SP3>-<NNNN>`, QR-like matrix, ordered
  handling `events[]`, `freshness`, `coldChain` (min/max °C, breach flag), plus `verifyLot(lotId)`
  audit checks and `makeLots(n, now)`.
- `src/views/` — Marketplace, Prices, Inventory, Logistics, Traceability. Roles: buyer / fisher.
- Seeded data in `src/data/market.js` (5 landing ports: Navotas, Dagupan, Batangas, Roxas, GenSan).
- Live build served via Cloudflare quick tunnel; `npm run build` must stay green.

Read those files before writing so your design plugs into real shapes rather than
inventing parallel ones.

## Deliverables (write these files, nothing else)
Create **/projects/islalink/docs/** with:

1. **system-architecture.md** — context + container diagrams in Mermaid (`graph TD` /
   `flowchart`), component responsibilities, request/data flows for each of the 5 pillars,
   sync model for low-connectivity landing sites (offline-first, conflict rules), the SMS/USSD
   or lightweight channel for feature phones, notifications, background jobs, hosting choice
   (free/cheap tier first — this founder pays for tools himself), and a "what breaks first at
   10x" scaling note.

2. **domain-model.md** — entities and relationships with the reasoning behind each. Must cover
   at minimum: person/role, fisher, boat/vessel, fish farm/pond, cooperative, landing site,
   lot (the traceability unit), catch/per-harvest record, listing, order + order line, bid/offer,
   delivery, cold-chain reading, traceability event (append-only), price observation (the ML
   label source), model run/version, payout + fee ledger, KYC/verification, buyer org.
   Include a Mermaid `erDiagram`.

3. **schema.sql** — Postgres DDL for the above. Real column types, PK/FK, useful indexes,
   constraints that encode invariants (e.g. a lot's landed_at cannot be after its delivery),
   append-only traceability table, soft-delete strategy where needed. Add short SQL comments
   explaining non-obvious columns.

4. **forecast-pipeline.md** — the actual ML design replacing the stand-in:
   - label definition (ex-vessel price per species × port × day; how to normalise grade/size)
   - feature list grounded in PH reality (landing volumes, fuel price, PAGASA weather/typhoon
     signals, liturgical calendar + fiestas + holidays, day-of-week, supply shocks, imports)
   - cold-start for a new port/species, minimum data thresholds, MAPE targets per species
   - XGBoost baseline vs simpler alternatives; when the simple model wins
   - retraining cadence, drift monitoring, backtest protocol, serving latency/cost
   - **guardrails**: never publish a price band the market cannot bear; human override;
     how the recommendation is surfaced to a fisher with low literacy; liability wording
     (this is decision support, not a price guarantee)

5. **mvp-scoping.md** — ruthless phase cut. Phase 0 pilot (pick ONE port + ONE cooperative and
   justify it), what ships in 90 days vs deferred, success metrics (income lift %, post-harvest
   loss %, repeat buyer rate, data completeness), per-user running cost, what must be manual
   behind the curtain at first, and the grant/partnership angle (BFAR, DA, LGU, cooperatives).

6. **risks-and-compliance.md** — Data Privacy Act (NPC) handling of fisher personal data,
   BFAR/DA permits and LGU requirements, food safety (traceability claims you must not make
   without cold-chain evidence), middleman/cooperative politics, cold-chain liability, seasonal
   cash flow, and the specific failure mode where buyers bypass the platform after first contact
   (and the design countermeasures).

7. **ARCHITECT-REPORT.md** — ≤300 words: the 6–8 decisions you made and the single biggest risk.

## Rules
- Docs live in `docs/`. **Do not modify `src/`, `package.json`, or `vite.config.js`.**
- Do not run `npm run build` or restart the server — the demo is live for the founder right now.
- Match the existing lot-id format, species ids, and money format (₱, whole pesos, per kg).
- Be specific and opinionated. No consultant filler, no "consider evaluating" language.
  State the choice and the trade-off in one sentence.
- Every table in `schema.sql` must appear in `domain-model.md` (and vice versa) — check it
  before you finish, and say in the report that you checked.
- Mermaid must be syntactically valid: no parentheses or colons inside node labels, quote
  any label containing spaces/punctuation.
- Plain simple English. Ryn is technical but self-taught; explain jargon on first use.

When done, reply with: file list, the 6–8 decisions in one line each, and anything in the
current demo that contradicts your design.
