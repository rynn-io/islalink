# Owner decisions (Ryn)

Standing decisions that override anything in the architect documents. Check this file before
re-opening a question — if it is here, it is settled.

---

## D1 — Neon, not Supabase (2026-11-15)

**Decision:** the Postgres host is **Neon**. Supabase is out.

**Why it is Ryn's call:** he retired Supabase on a previous project (RynOS) and does not want
it reintroduced. He is also deliberately cost-sensitive.

**What this actually changes** — Supabase was doing three jobs, not one:

| Job | Supabase did | On Neon |
| --- | --- | --- |
| Postgres database | Supabase Postgres | **Neon Postgres** — direct swap |
| API / edge functions | Supabase Edge Functions | **Neon Functions** (included on Free) |
| Auth (phone OTP) | Supabase Auth | **Managed Better Auth on Neon** (up to 60k MAU on Free), with the SMS hook pointed at a PH gateway |

**Verified facts** (neon.com/pricing, page last updated 2026-11-04):

- Free plan is **permanent, not a trial, no credit card**, $0/month.
- Free includes: 100 projects, 10 branches per project, **100 CU-hours/project** compute,
  autoscaling to 2 CU (8 GB RAM), scale-to-zero after 5 min, **1 GB Postgres storage** per
  project (20 GB per account), 5 GB egress per project, 6-hour history window, 1 manual snapshot.
- Free also includes, per project: **Functions** (10 active Capacity-Hours, 400 waiting
  Capacity-Hours, 1M invocations/month), **Auth up to 60k MAU**, **5 GB Object Storage**.
- Launch plan is pay-as-you-go, no monthly minimum; a small intermittent database is about
  **$15/month** typical.

**So the honest cost line is ₱0/month for the pilot and the demo**, moving to roughly $15/mo
(~₱850) only when load or storage outgrows the Free limits — not the ~₱3,300 the architect
originally wrote.

**Constraint that must not be broken:** `schema.sql` stays **plain Postgres**. That is why this
swap is cheap — the schema has **zero** Supabase-specific SQL (verified by grep: no
`row level security`, no `create policy`, no `auth.` schema references; the only default is
`gen_random_uuid()`, native in Postgres 13+). Never add RLS policies or `auth.*` grants that
only Supabase can run.

**Still open (architect to answer in the revision):** whether the Hono API runs on Neon
Functions or Cloudflare Workers — both are free at pilot scale, pick one and say why.
