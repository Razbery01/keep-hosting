---
phase: 03-deployment-pipeline
plan: 01
subsystem: database, testing, ui
tags: [netlify, deploy, vitest, postgres, react, typescript]

# Dependency graph
requires:
  - phase: 02-generation-hardening
    provides: build_status CHECK constraint, build_events table, migration 004 queue columns

provides:
  - 6 it.todo() test stub files for DEPLOY-01 through DEPLOY-06
  - Migration 005 extending build_status to include deploying + deployed
  - Partial index idx_build_events_deploy_done for rate-limit queries
  - Extended idx_client_sites_queue catching deploy_failed for retry
  - Updated TypeScript build_status union in database.ts (Row/Insert/Update)
  - Updated DashboardPage BUILD_STEPS reflecting direct Netlify deploy pipeline
  - statusConfig entries for deploy_failed and suspended
  - Polling update catching deployed status transition to live

affects:
  - 03-02: Plan 02 (core implementation) builds Edge Functions against these stubs + schema
  - 03-03 onwards: All DEPLOY plans inherit the migration 005 state machine

# Tech tracking
tech-stack:
  added: []
  patterns:
    - it.todo() Nyquist stubs before Wave 1 implementation (Phase 3 pattern inherited from Phase 2)
    - Idempotent migration: DO $$ IF EXISTS DROP CONSTRAINT ... END $$ then ADD CONSTRAINT

key-files:
  created:
    - src/test/deploy01.test.ts
    - src/test/deploy02.test.ts
    - src/test/deploy03.test.ts
    - src/test/deploy04.test.ts
    - src/test/deploy05.test.ts
    - src/test/deploy06.test.ts
    - supabase/migrations/005_deploy_pipeline.sql
  modified:
    - src/types/database.ts
    - src/pages/DashboardPage.tsx

key-decisions:
  - "Migration 005 adds deploying and deployed as new states; deploy_failed and suspended were already in migration 004 CHECK"
  - "BUILD_STEPS replaces pushing_github+deploying_netlify with deploying+deployed — no GitHub step in Phase 3 deploy pipeline"
  - "idx_client_sites_queue rebuilt (DROP+CREATE) to add deploy_failed — same idempotent pattern as migration 004"
  - "GitBranch icon removed from DashboardPage imports — no longer referenced after BUILD_STEPS update"

patterns-established:
  - "Wave 0 stubs: create it.todo() test files for entire phase before any Edge Function code"
  - "Polling includes deployed status: orders transitioning deployed -> live continue to poll"

requirements-completed: [DEPLOY-01, DEPLOY-03]

# Metrics
duration: 2min
completed: 2026-04-10
---

# Phase 03 Plan 01: Deploy Pipeline Wave 0 Foundations Summary

**Six DEPLOY test stub files, migration 005 extending build_status to deploying/deployed, and DashboardPage updated to reflect direct Netlify zip-deploy pipeline replacing GitHub push**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-10T10:14:18Z
- **Completed:** 2026-04-10T10:16:40Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Created 18 it.todo() stubs across 6 files covering all DEPLOY-01 through DEPLOY-06 requirements
- Migration 005 extends build_status CHECK to include `deploying` and `deployed`, adds partial index on build_events for rate limiting (DEPLOY-03), and extends orchestrator queue index to catch `deploy_failed` retries (DEPLOY-06)
- Updated database.ts build_status union in Row, Insert, and Update definitions; updated DashboardPage BUILD_STEPS to reflect direct Netlify deploy (no GitHub), added deploy_failed/suspended to statusConfig, polling now catches `deployed` transitioning to `live`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Wave 0 test stubs for DEPLOY-01 through DEPLOY-06** - `e153e78` (test)
2. **Task 2: Migration 005 — extend build_status CHECK + deploy indexes** - `7392470` (chore)
3. **Task 3: Update TypeScript types + DashboardPage status rendering** - `ef2d5be` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/test/deploy01.test.ts` - 4 it.todo() stubs for DEPLOY-01 (no GitHub, direct zip-deploy)
- `src/test/deploy02.test.ts` - 2 it.todo() stubs for DEPLOY-02 (UUID site naming)
- `src/test/deploy03.test.ts` - 3 it.todo() stubs for DEPLOY-03 (rate limiting)
- `src/test/deploy04.test.ts` - 3 it.todo() stubs for DEPLOY-04 (suspension)
- `src/test/deploy05.test.ts` - 3 it.todo() stubs for DEPLOY-05 (reactivation)
- `src/test/deploy06.test.ts` - 3 it.todo() stubs for DEPLOY-06 (retry/idempotency)
- `supabase/migrations/005_deploy_pipeline.sql` - Deploy pipeline schema: extended CHECK, idx_build_events_deploy_done, updated idx_client_sites_queue
- `src/types/database.ts` - Added deploying/deployed to build_status union in Row/Insert/Update
- `src/pages/DashboardPage.tsx` - Updated BUILD_STEPS, statusConfig, polling condition; removed GitBranch import

## Decisions Made

- BUILD_STEPS replaces `pushing_github` + `deploying_netlify` with `deploying` + `deployed` — aligns UI progress tracker with the actual Phase 3 direct Netlify zip-deploy pipeline
- `GitBranch` import removed from DashboardPage (no longer used after BUILD_STEPS update)
- `idx_client_sites_queue` uses DROP+CREATE pattern (not `IF NOT EXISTS` alone) to update WHERE clause to include `deploy_failed`
- Polling now includes `deployed` status so orders transitioning `deployed` -> `live` continue to refresh without user manual action

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — full test suite passed with 133 tests, 20 todo stubs, 0 failures. The pre-existing `act()` warning in gen09.test.ts is out of scope for this plan.

## User Setup Required

Manual steps required after this plan (from migration 005 footer):
1. Apply migration: `supabase db push`
2. Deploy new Edge Functions: deploy-site, suspend-site, reactivate-site (built in Plan 02)
3. Set secrets: `NETLIFY_PAT`, `NETLIFY_TEAM_SLUG`
4. Remove: `supabase secrets unset GITHUB_PAT`

These steps are deferred until Plan 02 builds the actual Edge Functions.

## Next Phase Readiness

- Schema state machine is locked: `deploying`, `deployed`, `deploy_failed`, `suspended` all defined
- Test stubs provide the acceptance criteria that Plan 02 Edge Function implementation must satisfy
- TypeScript types are aligned with migration 005 — no drift between DB and application layer
- DashboardPage renders the correct 6-step pipeline progress for the direct Netlify deploy flow

---
*Phase: 03-deployment-pipeline*
*Completed: 2026-04-10*
