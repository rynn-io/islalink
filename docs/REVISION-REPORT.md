# Revision report

Changed `system-architecture.md`, `mvp-scoping.md`, `schema.sql`, `risks-and-compliance.md`, `ARCHITECT-REPORT.md`, and one stale storage reference in `forecast-pipeline.md`; added `REVISION-REPORT.md`. `OWNER-DECISIONS.md` was read first and already states the authoritative decision; it needed no edit.

API host: Neon Functions, because it keeps the Hono API, Managed Better Auth, Postgres and Object Storage on one free pilot platform while Cloudflare remains the static and edge-cache layer.

Cost: about ₱3,300/month → about ₱1,860/month at the stated pilot assumptions; Neon itself is ₱0 on Free. Launch adds roughly ₱850/month only after Postgres storage exceeds 1 GB or compute exceeds 100 CU-hours/month.

Remaining Supabase mentions are deliberate: `OWNER-DECISIONS.md` records the rejected platform and rationale; `brief-architect-revise.md` preserves the revision brief; `architect.log` is the historical transcript; this report inventories those leftovers. No implementation work remains.
