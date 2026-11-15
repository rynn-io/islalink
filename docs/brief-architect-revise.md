# Brief: revise the stack decision — Neon instead of Supabase

**Small, bounded revision of documents you already wrote. Do not redo the architecture.**

You wrote IsdaLink's system docs in `/projects/islalink/docs/` (system-architecture.md,
domain-model.md, schema.sql, forecast-pipeline.md, mvp-scoping.md, risks-and-compliance.md,
ARCHITECT-REPORT.md). Ryn has made an owner decision that overrides your backend choice.
Read `/projects/islalink/docs/OWNER-DECISIONS.md` first — it is authoritative and it explains
why.

## The decision
**Neon replaces Supabase.** He retired Supabase on a previous project and will not reintroduce
it, and his cost line matters.

## Verified facts you may rely on (neon.com/pricing, page last updated 2026-11-04)
- Free plan: **permanent, no credit card, $0/month**.
- Free per project: 100 projects, 10 branches, **100 CU-hours** compute, autoscale to 2 CU
  (8 GB RAM), scale-to-zero after 5 min (cannot be disabled on Free), **1 GB Postgres storage**
  (20 GB per account), 5 GB egress, 6-hour history window, 1 manual snapshot.
- Free also includes, per project: **Functions** (10 active Capacity-Hours, 400 waiting,
  1M invocations/month), **Auth up to 60k MAU**, **5 GB Object Storage**.
- Launch: pay-as-you-go, no monthly minimum, small intermittent database ≈ **$15/month**.

Re-verify anything you quote that is not in the list above; say where you checked.

## What to change (this is the whole job)
1. **`system-architecture.md`** — rewrite the stack table: Neon Postgres, Neon Functions (or
   Cloudflare Workers — **pick one and justify it in one sentence**), Neon Managed Better Auth
   with the SMS hook pointed at a PH gateway (Semaphore). Update the Mermaid container diagram
   so the Supabase node becomes Neon and the edge/API node is labelled correctly. Fix every
   sentence that assumes Supabase Auth/RLS/Edge Functions.
2. **`mvp-scoping.md`** — replace the cost table with real numbers: ₱0/month on Free for the
   pilot, and state the exact trigger that forces the move to Launch (~$15/mo) — e.g. storage
   past 1 GB, or compute past 100 CU-hours/month. Keep the ₱-per-month framing Ryn uses.
3. **`schema.sql`** — it is already plain Postgres (that is why this is cheap). Confirm rather
   than rewrite: the file must contain **no** `row level security`, **no** `create policy`, and
   **no** `auth.*` references. Update only the header comment (it currently says
   "e.g. Supabase"). If you find anything Supabase-only, remove it.
4. **`risks-and-compliance.md`** — update vendor-lock-in and data-residency points from Supabase
   to Neon. Note the extra risk Neon adds: **scale-to-zero on Free means a cold start** after
   5 minutes idle, which matters for the QR trace page and for a fisher opening the app at
   5am. Say what absorbs it (edge cache, or a keep-warm ping).
5. **`ARCHITECT-REPORT.md`** — update decision 4 (stack) and the cost figure, and add one line
   saying the change came from an owner decision, not your judgement.

## Rules
- **Docs only.** Do not touch `src/`, `package.json`, or `vite.config.js` — a live demo is
  served from this repo and another agent is editing `src/` right now.
- Do not run `npm run build` or start/stop any server.
- Keep the writing style you used: specific, opinionated, trade-off in one sentence.
- Keep it proportionate — this is a stack swap, not a re-architecture. Do not rewrite the
  domain model or the forecast pipeline.
- Every Supabase mention that survives must be deliberate. Grep the folder for `supabase`
  before you finish and list what is left and why.

## Stop clause
If you run out of time, finish `system-architecture.md` and `OWNER-DECISIONS.md` alignment
first, and say exactly what remains in `REVISION-REPORT.md` (≤150 words: files changed, the
API host you chose and why, cost line before → after, anything left).
