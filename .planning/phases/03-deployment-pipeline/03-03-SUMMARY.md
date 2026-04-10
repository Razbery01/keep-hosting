---
phase: 03-deployment-pipeline
plan: "03"
subsystem: infra
tags: [netlify, supabase, edge-functions, migration, secrets, deploy-pipeline, human-verify]

requires:
  - phase: 03-02
    provides: "deploy-site, suspend-site, reactivate-site Edge Functions + test suite (152 tests)"
  - phase: 03-01
    provides: "migration 005 schema (build_status deploying/deployed), DashboardPage pipeline steps"

provides:
  - "Migration 005 applied to live Supabase database (build_status CHECK includes deploying/deployed)"
  - "All 5 Edge Functions deployed to production Supabase: deploy-site, suspend-site, reactivate-site, persist-files, build-orchestrator"
  - "NETLIFY_PAT and NETLIFY_TEAM_SLUG secrets configured as Supabase secrets"
  - "GITHUB_PAT removed from Supabase secrets"
  - "Real Netlify deploy verified: site created with kh-{uuid8} name, accessible via HTTPS"
  - "Suspend verified: branded placeholder page shown at same Netlify URL"
  - "Reactivate verified: original site content restored from Supabase Storage"
  - "Dashboard pipeline steps verified: deploying/deployed steps render correctly"
  - "Full test suite confirmed green: 152 tests passing"
  - "Netlify pricing tier confirmed acceptable"

affects:
  - "04-payment (Yoco webhook triggers deploy-site — pipeline now live and verified)"
  - "05-domain (netlify_site_id stored for ZADOMAINS domain attachment)"

tech-stack:
  added: []
  patterns:
    - "Human-verify gate: real infrastructure verification before phase advancement"
    - "Secret rotation: GITHUB_PAT removed, Netlify credentials injected into Supabase secrets"
    - "Go/no-go checkpoint: Phase 3 deploy pipeline validated against production Netlify API"

key-files:
  created: []
  modified:
    - supabase/functions/deploy-site/index.ts (deployed to production)
    - supabase/functions/suspend-site/index.ts (deployed to production)
    - supabase/functions/reactivate-site/index.ts (deployed to production)
    - supabase/functions/persist-files/index.ts (deployed to production)
    - supabase/functions/build-orchestrator/index.ts (deployed to production)

key-decisions:
  - "Netlify account confirmed on acceptable pricing tier — budget is acceptable for launch volume"
  - "Placeholder-deploy approach for suspension confirmed: branded UX justified at Netlify credit cost"
  - "GITHUB_PAT permanently removed — no Edge Function references it; Netlify credentials replace GitHub-based deploy approach"

patterns-established:
  - "Pattern: Human-verify gate at end of infra phase confirms production readiness before payment integration"
  - "Pattern: Supabase secrets rotation — remove old (GITHUB_PAT), add new (NETLIFY_PAT, NETLIFY_TEAM_SLUG)"

requirements-completed:
  - DEPLOY-01
  - DEPLOY-02
  - DEPLOY-03
  - DEPLOY-04
  - DEPLOY-05
  - DEPLOY-06

duration: ~15min (including human verification)
completed: 2026-04-09
---

# Phase 3 Plan 03: Deploy Pipeline Verification Summary

**Migration 005 applied, all 5 Edge Functions deployed to production, GITHUB_PAT removed, NETLIFY_PAT+NETLIFY_TEAM_SLUG configured, and a real deploy/suspend/reactivate cycle verified against live Netlify infrastructure — 152 tests green, Phase 3 complete**

## Performance

- **Duration:** ~15 min (including human verification round-trip)
- **Started:** 2026-04-09T00:00:00Z
- **Completed:** 2026-04-09T00:15:00Z
- **Tasks:** 2 (Task 1: auto; Task 2: human-verify checkpoint)
- **Files modified:** 0 new files — all changes were infrastructure deployment, secret configuration, and DB migration

## Accomplishments

- Applied migration 005 to the live Supabase database: `build_status` CHECK constraint now includes `deploying` and `deployed` states; `idx_client_sites_queue` rebuilt to include `deploy_failed`
- Deployed all 5 Edge Functions to production Supabase: `deploy-site`, `suspend-site`, `reactivate-site`, `persist-files`, `build-orchestrator` (all with `--no-verify-jwt`)
- Configured production secrets: `NETLIFY_PAT` and `NETLIFY_TEAM_SLUG` set; `GITHUB_PAT` permanently removed
- Human verification confirmed the complete deploy/suspend/reactivate cycle works against real Netlify infrastructure: kh-{uuid8} site created, HTTPS accessible, suspension shows branded placeholder, reactivation restores original content
- Dashboard pipeline steps render correctly (no GitHub step, deploying/deployed steps present)
- Full test suite confirmed green: 152 tests passing post-deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply migration 005+006, deploy Edge Functions, set/unset secrets** - `3f88a13` (chore)
2. **Task 2: Human-verify checkpoint** - No separate commit (human verification only; approved by user)

**Plan metadata:** See final docs commit below.

## Files Created/Modified

No source files were created or modified in this plan. All work was infrastructure:

- **Supabase DB:** Migration 005 applied (`build_status` CHECK includes `deploying`/`deployed`, queue index rebuilt)
- **Supabase Edge Functions (deployed):** `deploy-site`, `suspend-site`, `reactivate-site`, `persist-files`, `build-orchestrator`
- **Supabase Secrets (configured):** `NETLIFY_PAT` set, `NETLIFY_TEAM_SLUG` set, `GITHUB_PAT` removed

## Decisions Made

- Netlify pricing tier confirmed acceptable — user reviewed billing page and accepted the credit/deploy budget for expected launch volume
- Suspension placeholder-deploy approach confirmed as the right trade-off: branded UX outweighs Netlify credit cost at expected suspension frequency
- `GITHUB_PAT` permanently removed — the GitHub-based deploy approach was superseded by direct Netlify zip-deploy in Phase 3; no rollback needed

## Deviations from Plan

None — plan executed exactly as written. Task 1 followed the 6-step sequence precisely (migration, deploy functions, set secrets, unset GITHUB_PAT, verify secrets, run tests). Human checkpoint approved all 5 verification tests.

## Issues Encountered

None.

## User Setup Required

The following was configured during this plan (now complete — no further action needed):

- **NETLIFY_PAT** — Created via Netlify User Settings > Applications > Personal Access Tokens
- **NETLIFY_TEAM_SLUG** — Obtained from Netlify Dashboard URL (`app.netlify.com/teams/{slug}`)
- **Netlify pricing tier** — Reviewed and confirmed acceptable

All secrets are now configured in Supabase. No further external service setup is needed for Phase 4 (payment integration will trigger deploy-site directly via the existing pipeline).

## Next Phase Readiness

Phase 3 is complete. The full deploy pipeline is live:

- `persist-files` → `deploy-site` → Netlify site creation → zip-deploy → `build_status=deployed`
- `suspend-site` and `reactivate-site` are deployed and verified — ready for Phase 4 Yoco webhook triggers
- `netlify_site_id` is stored on `client_sites` — available for Phase 5 ZADOMAINS domain attachment
- **Phase 4 prerequisite:** Contact Yoco to confirm recurring billing capability (PAY-01 blocker noted in STATE.md) before Phase 4 planning begins

---
*Phase: 03-deployment-pipeline*
*Completed: 2026-04-09*
