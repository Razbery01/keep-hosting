---
phase: 03-deployment-pipeline
verified: 2026-04-09T19:30:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Real Netlify deploy/suspend/reactivate cycle"
    expected: "kh-{uuid8} site created, accessible via HTTPS; suspend shows branded placeholder; reactivate restores original content"
    why_human: "Confirmed by user during Plan 03 human-verify checkpoint — production infrastructure cannot be verified programmatically after the fact"
  - test: "Netlify pricing tier confirmed"
    expected: "Billing tier acceptable for expected launch volume"
    why_human: "Account-level decision confirmed by user during Plan 03 checkpoint"
  - test: "GITHUB_PAT removed from Supabase secrets"
    expected: "supabase secrets list shows NETLIFY_PAT + NETLIFY_TEAM_SLUG present, GITHUB_PAT absent"
    why_human: "Supabase cloud secrets not accessible from local CLI in this environment; confirmed in 03-03-SUMMARY.md by user"
  - test: "Edge Functions deployed to production"
    expected: "deploy-site, suspend-site, reactivate-site, persist-files, build-orchestrator all live in Supabase"
    why_human: "Deployment state is not readable from source; confirmed via supabase functions list during Plan 03"
---

# Phase 3: Deployment Pipeline Verification Report

**Phase Goal:** Customer sites are deployed directly to Netlify via zip-deploy API (no GitHub intermediary) with rate-limit awareness, idempotent retries, and the ability to suspend and reactivate sites programmatically
**Verified:** 2026-04-09T19:30:00Z
**Status:** passed (with human_verification items noted — all confirmed by user in Plan 03 checkpoint)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | deploy-site reads files from Storage, creates zip with JSZip, POSTs to Netlify zip-deploy API | VERIFIED | Lines 81-183 of deploy-site/index.ts: storage.from('client-sites').list, JSZip, fetch POST /sites/{id}/deploys |
| 2 | deploy-site creates Netlify site with kh-{uuid8} name under team account, writing netlify_site_id before zip deploy | VERIFIED | Lines 130-165: `kh-${siteId.slice(0, 8)}`, `${teamSlug}/sites`, DB update at line 164 precedes /deploys at line 173 |
| 3 | deploy-site checks rate limits via build_events (3/min, 100/day, warning at 80) | VERIFIED | Lines 41-78: oneMinuteAgo/oneDayAgo windows, `>= 3`, `>= 100`, `>= 80` + deploy_quota_warning event |
| 4 | deploy-site polls GET /api/v1/deploys/{deploy_id} until state=ready before marking deployed | VERIFIED | Lines 203-214: loop MAX_POLL_ATTEMPTS=12, 5s interval, state==='ready' break |
| 5 | suspend-site deploys branded placeholder page zip to existing Netlify site | VERIFIED | suspend-site/index.ts lines 50-67: JSZip('index.html', SUSPENDED_PAGE_HTML), POST /sites/{id}/deploys |
| 6 | reactivate-site re-deploys from Storage without calling Claude | VERIFIED | reactivate-site/index.ts: reads client-sites bucket, no anthropic/claude/generate-site references; confirmed by deploy05 test |
| 7 | persist-files chains to deploy-site via EdgeRuntime.waitUntil after successful Storage write | VERIFIED | persist-files/index.ts lines 65-70: EdgeRuntime.waitUntil(supabase.functions.invoke('deploy-site', ...)) |
| 8 | build-orchestrator polls deploy_failed rows and routes them to deploy-site | VERIFIED | build-orchestrator/index.ts line 22: .in('build_status', ['pending', 'retry', 'deploy_failed']); line 51: fn = 'deploy-site' when deploy_failed |
| 9 | All 6 DEPLOY test files have real source-scan assertions that pass | VERIFIED | `npx vitest run src/test/deploy0*.test.ts` — 19 tests passed, 0 failures |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/deploy-site/index.ts` | Netlify zip-deploy Edge Function (min 80 lines) | VERIFIED | 253 lines, substantive — rate limit, site create, JSZip, polling, error handling |
| `supabase/functions/suspend-site/index.ts` | Site suspension Edge Function (min 40 lines) | VERIFIED | 133 lines, substantive — placeholder zip-deploy, polling, build_status=suspended |
| `supabase/functions/reactivate-site/index.ts` | Site reactivation Edge Function (min 50 lines) | VERIFIED | 173 lines, substantive — Storage read, JSZip, zip-deploy, polling, build_status=deployed |
| `supabase/functions/_shared/suspended-page.ts` | Branded suspension HTML template exporting SUSPENDED_PAGE_HTML | VERIFIED | 169 lines, complete branded HTML5 page with keep-hosting #6366f1 accent, payment CTA |
| `supabase/functions/persist-files/index.ts` | Updated with EdgeRuntime.waitUntil chain | VERIFIED | Contains EdgeRuntime.waitUntil(invoke('deploy-site')) at lines 65-70 |
| `supabase/functions/build-orchestrator/index.ts` | Extended orchestrator with deploy_failed routing | VERIFIED | Contains deploy_failed in .in() query and conditional fn routing |
| `supabase/migrations/005_deploy_pipeline.sql` | Deploy pipeline schema with extended CHECK + indexes | VERIFIED | Idempotent: extends build_status CHECK to include deploying/deployed, adds idx_build_events_deploy_done, rebuilds idx_client_sites_queue |
| `src/types/database.ts` | build_status union includes deploying, deployed, deploy_failed | VERIFIED | All three definitions (Row, Insert, Update) include deploying, deployed, deploy_failed, suspended |
| `src/pages/DashboardPage.tsx` | BUILD_STEPS uses deploying/deployed (no GitHub), statusConfig includes deploy_failed/suspended | VERIFIED | BUILD_STEPS: pending, generating, generated, deploying, deployed, live — no pushing_github; statusConfig has deploy_failed (orange) and suspended (red) |
| `src/test/deploy01.test.ts` through `deploy06.test.ts` | 6 test files with real source-scan assertions | VERIFIED | 19 assertions across 6 files, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `supabase/functions/persist-files/index.ts` | `supabase/functions/deploy-site/index.ts` | EdgeRuntime.waitUntil(supabase.functions.invoke('deploy-site')) | WIRED | Line 66: `supabase.functions.invoke('deploy-site', { body: { siteId } })` inside EdgeRuntime.waitUntil |
| `supabase/functions/build-orchestrator/index.ts` | `supabase/functions/deploy-site/index.ts` | deploy_failed status routing (fn = 'deploy-site') | WIRED | Line 51: `const fn = row.build_status === 'deploy_failed' ? 'deploy-site' : 'generate-site'` |
| `supabase/functions/deploy-site/index.ts` | Netlify API | fetch POST /api/v1/sites/{id}/deploys with zip body | WIRED | Lines 172-182: fetch(`${NETLIFY_API}/sites/${netlifySiteId}/deploys`, {method: 'POST', body: zipBuffer}) |
| `supabase/functions/suspend-site/index.ts` | `supabase/functions/_shared/suspended-page.ts` | import SUSPENDED_PAGE_HTML | WIRED | Line 5: `import { SUSPENDED_PAGE_HTML } from '../_shared/suspended-page.ts'`; used at line 51 |
| `supabase/functions/reactivate-site/index.ts` | Supabase Storage client-sites bucket | storage.from('client-sites').list + download | WIRED | Lines 55-79: .from('client-sites').list(siteId), .download(filePath) loop |
| `supabase/migrations/005_deploy_pipeline.sql` | `src/types/database.ts` | build_status enum values match | WIRED | Migration CHECK: deploying, deployed, deploy_failed, suspended all match TypeScript union on all three type definitions |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEPLOY-01 | 03-01, 03-02, 03-03 | Remove GitHub-intermediated deployment; use Netlify direct zip-deploy API | SATISFIED | deploy-site POSTs to api.netlify.com/api/v1/sites/{id}/deploys; no GITHUB_PAT in any Edge Function source; build-site shim delegates to generate-site only |
| DEPLOY-02 | 03-01, 03-02, 03-03 | UUID-based site name inside single Netlify team account | SATISFIED | `kh-${siteId.slice(0, 8)}` pattern; uses NETLIFY_TEAM_SLUG in `/${teamSlug}/sites` create endpoint |
| DEPLOY-03 | 03-01, 03-02, 03-03 | Rate limits (3/min, 100/day) with token-bucket; alert at 80/day | SATISFIED | build_events count queries with oneMinuteAgo/oneDayAgo windows; deploy_quota_warning logged at >= 80; idx_build_events_deploy_done index added for efficiency |
| DEPLOY-04 | 03-01, 03-02, 03-03 | Site suspension — programmatically unpublish on payment failure | SATISFIED | suspend-site deploys SUSPENDED_PAGE_HTML zip to existing Netlify site; updates build_status=suspended + orders.status=suspended |
| DEPLOY-05 | 03-01, 03-02, 03-03 | Site reactivation — republish from Supabase Storage persisted files | SATISFIED | reactivate-site reads client-sites bucket, creates JSZip, deploys to existing netlify_site_id; no Claude call |
| DEPLOY-06 | 03-01, 03-02, 03-03 | Deploy failure triggers retry with idempotency; Storage files eliminate Claude re-call | SATISFIED | netlify_site_id written at line 164 BEFORE /deploys POST at line 173; deploy_failed triggers orchestrator retry to deploy-site; idx_client_sites_queue extended to include deploy_failed |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `supabase/functions/suspend-site/index.ts` | 49, 56, 103, 121 | "placeholder" in comments | Info | These are descriptive comments about the suspension page concept — not stub code. All surrounding code is fully implemented. |

No blockers or warnings found. The word "placeholder" appears exclusively in developer comments within suspend-site, correctly describing the branded placeholder page being deployed. All implementations are substantive.

### Human Verification Required

These items were confirmed by the user during the Plan 03 blocking human-verify checkpoint (`3f88a13`). They cannot be re-verified programmatically after the fact, but are documented as having been approved.

#### 1. Real Netlify deploy/suspend/reactivate cycle

**Test:** Invoke deploy-site with a test siteId that has files in Storage; then suspend-site; then reactivate-site
**Expected:** New `kh-{uuid8}` site appears in Netlify dashboard; accessible via HTTPS; suspend shows branded "temporarily unavailable" placeholder; reactivate restores original content
**Why human:** Production Netlify API and DNS propagation cannot be verified from source code alone

#### 2. Netlify pricing tier confirmation

**Test:** Review Netlify billing page for credit vs. legacy pricing
**Expected:** Budget is acceptable for expected launch volume; user accepts the placeholder-deploy credit cost for suspension UX
**Why human:** Account-level decision; plan-03 research noted post-Sep 2025 accounts have credit-based pricing

#### 3. GITHUB_PAT removed from Supabase secrets

**Test:** `npx supabase secrets list` — shows NETLIFY_PAT and NETLIFY_TEAM_SLUG present, GITHUB_PAT absent
**Expected:** No GitHub secrets remain; Netlify credentials active
**Why human:** Supabase cloud secrets list not accessible programmatically in this environment

#### 4. Edge Functions deployed to production Supabase

**Test:** `npx supabase functions list` — shows deploy-site, suspend-site, reactivate-site, persist-files, build-orchestrator
**Expected:** All 5 functions live with --no-verify-jwt flag
**Why human:** Deployment state is not readable from local source files

### Summary

All 9 observable truths verified directly against codebase. All 10 required artifacts exist and are substantive. All 6 key links wired. All 6 DEPLOY requirements satisfied by code evidence. 152 tests passing. 6 documented commits verified in git history. Human-verify checkpoint (Plan 03) confirmed by user as approved (commit `3f88a13`).

The phase goal is achieved: customer sites are deployed directly to Netlify via zip-deploy API with no GitHub intermediary, 3/min + 100/day rate-limit enforcement with 80/day warning, idempotent retry via netlify_site_id written before deploy, suspend via branded placeholder zip-deploy, and reactivate from Storage without Claude re-invocation.

---

_Verified: 2026-04-09T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
