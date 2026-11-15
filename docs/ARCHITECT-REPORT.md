# Architect report: IsdaLink real system

## Decisions

1. **The cooperative is the seller of record, not the fisher.** It handles receipts and BIR, earns a fee share, and is our main defence against buyers going around us. The cost: coop politics become our problem.
2. **The lot (`ISL-<YYWW>-<SP3>-<NNNN>`) is the unit everything points at.** Each device holds a block of 50 lot numbers, so QR stickers print offline with no duplicates.
3. **Facts are append-only, and Postgres enforces it.** That covers trace events (hash-chained), readings, prices and a double-entry ledger. Stock is calculated, not stored. Only listings, orders and delivery status need sync conflict rules.
4. **Stack:** the existing React app becomes an offline PWA on Cloudflare Pages, backed by Neon Postgres, Neon Functions, Neon Managed Better Auth and Neon Object Storage. Neon is ₱0/month on Free for the pilot; total pilot tech cost is about ₱1,860/month, mostly SMS, and Launch adds roughly ₱850/month only after 1 GB storage or 100 CU-hours/month is exceeded.
   **This stack change comes from Ryn's owner decision in `OWNER-DECISIONS.md`, not a revision of my architectural judgement.**
5. **Forecasts are computed nightly on GitHub Actions.** Simple models stay in charge until XGBoost beats them by 10% for a species. Forecasts go out 7 days at most.
6. **Guardrails before publishing:** prices stay inside the 90-day range, no "hold" past shelf life, no advice near a typhoon, and the coop manager can override.
7. **Phase 0: one bangus coop in Dagupan.** Pond harvests are scheduled, so supply is predictable. Payments, dispatch and ID checks are manual, and every one is recorded in the ledger.
8. **SMS keywords instead of USSD.**

## Checks done

- `schema.sql` loads into a real Postgres 16, and 13 invariant tests pass.
- All 36 tables plus the view appear in both `schema.sql` and `domain-model.md`.
- All 4 Mermaid diagrams pass `mermaid.parse()`.

## Biggest risk

**Data completeness depends on one paid coop encoder.** If they stop recording, the trace claims become false and the forecast never gets enough data. We need a second trained encoder and grant funding before launch.
