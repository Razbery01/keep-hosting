---
phase: 03-deployment-pipeline
plan: "02"
subsystem: infra
tags: [netlify, jszip, edge-functions, supabase-storage, deploy-pipeline, rate-limiting]

requires:
  - phase: 03-01
    provides: "build_status extension (deploying, deployed, deploy_failed), DashboardPage updates, 6 deploy test stubs"
  - phase: 02-generation-hardening
    provides: "persist-files function writing to Supabase Storage client-sites bucket"

provides:
  - "deploy-site Edge Function: reads Storage, creates JSZip, creates Netlify site (kh-{uuid8}), zip-deploys, polls until ready"
  - "suspend-site Edge Function: deploys branded placeholder HTML zip to existing Netlify site"
  - "reactivate-site Edge Function: re-deploys from Storage without calling Claude"
  - "suspended-page.ts: branded keep-hosting suspension template with payment CTA"
  - "persist-files -> deploy-site fire-and-forget chain via EdgeRuntime.waitUntil"
  - "build-orchestrator: extended to poll deploy_failed rows and route to deploy-site"
  - "All 6 DEPLOY test files with 19 passing source-scan assertions"

affects:
  - "03-03-PLAN (Netlify account setup human checkpoint)"
  - "04-payment (Yoco webhook will invoke deploy-site directly)"
  - "05-domain (netlify-domain function attaches domain to netlify_site_id)"

tech-stack:
  added:
    - "npm:jszip — in-memory zip creation in Deno Edge Functions"
  patterns:
    - "Rate limit via build_events token-bucket: count deploy_done events in 60s/24h windows"
    - "Idempotency: write netlify_site_id to DB immediately after Netlify site creation, before zip deploy"
    - "Fire-and-forget chaining: EdgeRuntime.waitUntil(supabase.functions.invoke(...))"
    - "Conditional orchestrator routing: build_status === deploy_failed routes to deploy-site, else generate-site"
    - "Polling pattern: GET /api/v1/deploys/{id} with 5s interval, max 12 attempts"

key-files:
  created:
    - supabase/functions/deploy-site/index.ts
    - supabase/functions/suspend-site/index.ts
    - supabase/functions/reactivate-site/index.ts
    - supabase/functions/_shared/suspended-page.ts
  modified:
    - supabase/functions/persist-files/index.ts
    - supabase/functions/build-orchestrator/index.ts
    - src/test/deploy01.test.ts
    - src/test/deploy02.test.ts
    - src/test/deploy03.test.ts
    - src/test/deploy04.test.ts
    - src/test/deploy05.test.ts
    - src/test/deploy06.test.ts
    - src/test/gen05.test.ts

key-decisions:
  - "netlify_site_id written to DB IMMEDIATELY after Netlify site creation, BEFORE zip deploy — prevents orphan Netlify sites on deploy retry"
  - "Rate limit enforced via build_events token-bucket query: 3/min (60s window), 100/day, quota warning at 80/day"
  - "suspend-site uses JSZip placeholder deploy (not PUT /api/v1/sites/{id}/disable) per CONTEXT.md — preserves branded UX at cost of Netlify credits"
  - "reactivate-site reads from Supabase Storage directly — never calls Claude or generate-site"
  - "build-orchestrator routes deploy_failed rows to deploy-site, all other retries to generate-site"
  - "gen05.test.ts updated to reflect orchestrator now handles deploy_failed + multi-target routing"

patterns-established:
  - "Pattern: All deploy Edge Functions parse siteId from body before try/catch so it is available in catch block for error cleanup"
  - "Pattern: Edge Functions declare NETLIFY_API constant rather than inline strings — test assertions use constant name patterns"

requirements-completed:
  - DEPLOY-01
  - DEPLOY-02
  - DEPLOY-03
  - DEPLOY-04
  - DEPLOY-05
  - DEPLOY-06

duration: 5min
completed: 2026-04-10
---

# Phase 3 Plan 02: Core Deployment Pipeline Summary

**Netlify zip-deploy pipeline via JSZip + Storage read, with rate limiting (3/min, 100/day), idempotent site creation, branded suspension placeholder, and Storage-based reactivation — 19 source-scan tests all green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-10T10:19:01Z
- **Completed:** 2026-04-10T10:24:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created `deploy-site` Edge Function (253 lines): reads Storage files, creates JSZip buffer, creates Netlify site under team account with `kh-{uuid8}` name, writes `netlify_site_id` to DB before zip deploy, polls until `state=ready`, enforces 3/min + 100/day rate limits via `build_events` token-bucket, handles 429 with `next_retry_at`
- Created `suspend-site` + `reactivate-site` Edge Functions: suspension deploys branded placeholder HTML zip to preserve Netlify site ID and SSL; reactivation re-reads from Supabase Storage and re-deploys without calling Claude
- Created `suspended-page.ts` shared template: complete branded HTML5 page with indigo (#6366f1) accent, payment update CTA linking to keep-hosting.co.za/dashboard
- Wired `persist-files` → `deploy-site` fire-and-forget chain via `EdgeRuntime.waitUntil`
- Extended `build-orchestrator` to poll `deploy_failed` rows and route them to `deploy-site` (vs `generate-site` for generation retries)
- All 6 DEPLOY test files filled with 19 real source-scan assertions — all pass; full suite 152 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create deploy-site, suspended-page.ts, suspend-site, reactivate-site** - `9cc55e7` (feat)
2. **Task 2: Wire persist-files chain + extend orchestrator + fill test bodies** - `5bd825d` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `supabase/functions/deploy-site/index.ts` — Netlify zip-deploy Edge Function (253 lines): rate limit, site create, JSZip, zip-deploy, polling, error handling
- `supabase/functions/_shared/suspended-page.ts` — Branded HTML5 suspension template exported as `SUSPENDED_PAGE_HTML` string constant
- `supabase/functions/suspend-site/index.ts` — Deploys `SUSPENDED_PAGE_HTML` placeholder zip; updates `build_status=suspended` + `orders.status=suspended`
- `supabase/functions/reactivate-site/index.ts` — Re-reads from `client-sites` Storage bucket, zips, deploys to existing Netlify site; updates `build_status=deployed`
- `supabase/functions/persist-files/index.ts` — Added `EdgeRuntime.waitUntil(invoke('deploy-site'))` after successful Storage write
- `supabase/functions/build-orchestrator/index.ts` — Extended query to `['pending','retry','deploy_failed']`; conditional status claim (`deploying` vs `generating`); conditional fn routing
- `src/test/deploy01.test.ts` through `deploy06.test.ts` — 6 files with 19 passing source-scan assertions
- `src/test/gen05.test.ts` — Updated to reflect extended orchestrator (auto-fix deviation)

## Decisions Made

- `netlify_site_id` written to DB immediately after Netlify site creation, before zip deploy — this is the idempotency guarantee that prevents orphan Netlify sites on retry
- Suspension uses placeholder zip-deploy (not `PUT /api/v1/sites/{id}/disable`) per CONTEXT.md — costs Netlify credits but shows branded page instead of Netlify's generic "site offline" message
- Body is parsed before the try/catch block in all three new functions so `siteId` is available for error cleanup logging in catch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] gen05.test.ts assertions broke after orchestrator extension**
- **Found during:** Task 2 (fill test bodies + verify full suite)
- **Issue:** `gen05.test.ts` had two assertions that matched the pre-extension orchestrator exactly: `['pending', 'retry']` array literal and `functions.invoke('generate-site')` direct call — both now fail because orchestrator correctly uses `['pending', 'retry', 'deploy_failed']` and conditional routing
- **Fix:** Updated both assertions to match the new (correct) orchestrator behavior: check for `deploy_failed` presence; check for `generate-site` string presence (still true — it is still invoked for generation rows)
- **Files modified:** `src/test/gen05.test.ts`
- **Verification:** Full suite: 152 passed, 0 failed
- **Committed in:** `5bd825d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — existing test broke due to correct orchestrator extension)
**Impact on plan:** Necessary correctness fix. No scope creep. gen05 now accurately describes the extended orchestrator behavior.

## Issues Encountered

None — both tasks executed cleanly. Deviation was anticipated (the plan notes "adjust regex patterns as needed").

## User Setup Required

None — no external service configuration required in this plan. The Netlify account setup and secret injection (`NETLIFY_PAT`, `NETLIFY_TEAM_SLUG`) is the Plan 03 human checkpoint.

## Next Phase Readiness

- Entire deploy pipeline exists in code: `persist-files` → `deploy-site` → Netlify site create → zip-deploy → polling → `build_status=deployed`
- `suspend-site` and `reactivate-site` ready for Phase 4 Yoco webhook triggers
- `netlify_site_id` stored on `client_sites` — available for Phase 5 ZADOMAINS domain attachment
- **Plan 03 required next:** Netlify account setup human checkpoint — no deploys work until `NETLIFY_PAT` and `NETLIFY_TEAM_SLUG` are configured as Supabase secrets

---
*Phase: 03-deployment-pipeline*
*Completed: 2026-04-10*
