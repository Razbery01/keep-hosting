---
phase: 01-security-data-foundation
plan: 02
subsystem: database
tags: [supabase, postgresql, rls, typescript, migrations]

# Dependency graph
requires:
  - phase: 01-security-data-foundation/01-01
    provides: vitest test harness and stub test files for the phase

provides:
  - supabase/migrations/003_security_data_phase1.sql — idempotent migration adding subscriptions table, POPIA consent columns, yoco_payment_id, generated_files, generation_cost, and suspended order status
  - src/types/database.ts — extended with Subscription interface and all new column types
  - client-assets storage bucket — MIME restricted to jpeg/png/webp, max 5 MB

affects:
  - 01-03 (file upload security — references client-assets bucket config verified in Task 3)
  - 02 (generation phase — writes to generation_cost and generated_files columns)
  - 03 (deployment — reads client_sites columns added here)
  - 04 (payment — inserts subscription rows, uses yoco_payment_id on orders)
  - 05 (domain/lifecycle — reads subscription.status for suspension logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Admin RLS policies use public.is_admin() SECURITY DEFINER — never inline subselects on profiles"
    - "Subscription status as TEXT + CHECK constraint (matches orders.status pattern)"
    - "JSONB for semi-structured generation data (generated_files, generation_cost)"
    - "Idempotent migration: IF NOT EXISTS / DROP POLICY IF EXISTS / DO $$ trigger check"

key-files:
  created:
    - supabase/migrations/003_security_data_phase1.sql
  modified:
    - src/types/database.ts
    - src/types/index.ts

key-decisions:
  - "Storage bucket MIME config deliberately excluded from migration 003 — handled via Supabase Dashboard in Task 3 checkpoint (research marked SQL bucket config as LOW confidence for managed projects)"
  - "generation_cost placed on client_sites (not orders) — a single order can have multiple build attempts; cost belongs on the build record"
  - "Subscription status uses TEXT + CHECK not ENUM — matches existing orders.status pattern in the codebase"
  - "Subscriptions RLS admin policies use public.is_admin() — never inline subselects on profiles (avoids infinite recursion)"
  - "Migration applied via supabase db push from a freshly linked local project (ref YOUR_PROJECT_REF) after creating local .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"

patterns-established:
  - "RLS admin helper: All admin policies must call public.is_admin() from migration 002, never subselect on profiles"
  - "Idempotent migrations: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE, trigger creation in DO $$ block"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06]

# Metrics
duration: 10min
completed: 2026-04-09
---

# Phase 1 Plan 02: Schema Migration & TypeScript Types Summary

**Single idempotent SQL migration (003) adding subscriptions table with RLS, POPIA consent columns, yoco_payment_id, generated_files/generation_cost JSONB, and suspended order status — applied to Supabase (ref YOUR_PROJECT_REF) and verified via Dashboard SQL editor; client-assets bucket hardened to jpeg/png/webp + 5 MB limit**

## Performance

- **Duration:** ~10 min (including human-verify checkpoint)
- **Started:** 2026-04-09T20:30:34Z
- **Completed:** 2026-04-09
- **Tasks completed:** 3 of 3
- **Files modified:** 3

## Accomplishments

- Migration 003 written as a single idempotent file covering all six DATA-xx requirements
- RLS on subscriptions uses `public.is_admin()` helper from migration 002 — no recursive subselects
- `src/types/database.ts` extended with `Subscription` interface and all new columns on existing tables
- `tsc -b` passes with zero errors after type additions
- `OrderStatus` in `index.ts` now includes `'suspended'` and `'payment_pending'`
- Migration applied to linked Supabase project via `supabase db push` with local .env created
- Schema verified: all 6 DATA-xx column sets confirmed present in `information_schema.columns`
- `client-assets` bucket configured: MIME restricted to jpeg/png/webp, max file size 5 MB (5242880 bytes)

## Task Commits

1. **Task 1: Write migration 003 SQL file** - `5299e3e` (feat)
2. **Task 2: Update TypeScript types** - `23129e2` (feat)
3. **Task 3: Apply migration + verify** - No code commit (human-verify checkpoint; verification outcomes documented below)

**Plan metadata:** See final docs commit (docs(01-02): complete plan after schema verification and bucket config)

## Schema Verification Results (Task 3)

Human verified via Supabase Dashboard SQL Editor against project ref `YOUR_PROJECT_REF`:

| Query | Expected | Actual |
|-------|----------|--------|
| `subscriptions` column count | 12 | 12 (subscription_cols = 12) |
| `client_sites` new columns | 2 | 2 (generated_files + generation_cost) |
| `profiles` new columns | 2 | 2 (popia_consent_at + popia_consent_ip) |
| `orders` new column | 1 | 1 (yoco_payment_id) |

All six DATA-xx schema changes confirmed present.

## Storage Bucket Configuration (Task 3)

`client-assets` bucket configured via Supabase Dashboard:
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB (5242880 bytes)

## Files Created/Modified

- `supabase/migrations/003_security_data_phase1.sql` — Full Phase 1 schema migration: subscriptions table with RLS, ADD COLUMNs for generated_files, generation_cost, popia_consent_at, popia_consent_ip, yoco_payment_id, extended orders.status constraint, and performance indexes
- `src/types/database.ts` — Added Subscription interface; added subscriptions to Database.Tables; extended profiles/orders/client_sites with new columns
- `src/types/index.ts` — Re-exports Subscription; OrderStatus union updated to include 'suspended' and 'payment_pending'

## Decisions Made

- Storage bucket MIME config excluded from migration 003. Research flagged SQL-based `UPDATE storage.buckets SET allowed_mime_types` as LOW confidence in managed Supabase projects. Handled via Dashboard in the Task 3 checkpoint.
- `generation_cost` placed on `client_sites`, not `orders`. A single order may trigger multiple build attempts; the cost belongs on the build record, not the order.
- Subscription status as `TEXT + CHECK` (not ENUM). Matches the existing `orders.status` pattern — easier to extend without `ALTER TYPE`.
- Admin RLS on subscriptions calls `public.is_admin()`. Never inline `SELECT role FROM profiles WHERE id = auth.uid()` — that would trigger RLS on profiles recursively.
- Migration applied via `supabase db push` after freshly linking the local project (ref YOUR_PROJECT_REF). A local `.env` was created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` matching previously-hardcoded credentials.

## Deviations from Plan

None — plan executed exactly as written. The SQL in the plan's `<action>` block was used verbatim. TypeScript types were added using Edit tool as instructed without rewriting existing content.

## Issues Encountered

None.

## User Setup Required

The migration has been applied. All external configuration is complete:
- Supabase project linked and `.env` created with correct credentials
- Migration 003 applied via `supabase db push`
- `client-assets` bucket MIME types and size limit configured in Dashboard

No further setup required for Phase 1 Plan 02.

## Next Phase Readiness

- Migration 003 is applied and verified on the production-linked Supabase project (ref YOUR_PROJECT_REF)
- All 6 DATA-xx requirements confirmed via Dashboard query output
- TypeScript types are complete and `tsc -b` passes
- Phase 2 (generation) can write to `generation_cost` and `generated_files` columns
- Phase 4 (payment) can insert subscription rows and use `yoco_payment_id` on orders
- Phase 5 (domain/lifecycle) can read `subscription.status` for suspension logic

---
*Phase: 01-security-data-foundation*
*Completed: 2026-04-09*
