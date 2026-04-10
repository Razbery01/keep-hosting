---
phase: 3
slug: deployment-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (installed in Phase 1 — do NOT reinstall) |
| **Config file** | `vite.config.ts` (already includes `src/**` and `supabase/functions/**`) |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~10 seconds (Phase 1+2 baseline ~130 tests + Phase 3 adds ~20) |

---

## Sampling Rate

- **After every task commit:** `npm run test:ci`
- **After every plan wave:** `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | Test stubs | scaffolding | `npm run test:ci` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-01 | unit (source scan) | `npm run test:ci -- src/test/deploy01.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-02 | unit (source scan) | `npm run test:ci -- src/test/deploy02.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-03 | unit (logic) | `npm run test:ci -- src/test/deploy03.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-04 | unit (source scan) | `npm run test:ci -- src/test/deploy04.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-05 | unit (source scan) | `npm run test:ci -- src/test/deploy05.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DEPLOY-06 | unit (source scan) | `npm run test:ci -- src/test/deploy06.test.ts` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/test/deploy01.test.ts` — DEPLOY-01: no GitHub calls, persist-files chains to deploy-site
- [ ] `src/test/deploy02.test.ts` — DEPLOY-02: site name pattern `kh-{8chars}`, team account endpoint
- [ ] `src/test/deploy03.test.ts` — DEPLOY-03: rate limit logic (3/min, 100/day blocking)
- [ ] `src/test/deploy04.test.ts` — DEPLOY-04: suspend-site deploys single-file zip
- [ ] `src/test/deploy05.test.ts` — DEPLOY-05: reactivate-site reads Storage, no Claude call
- [ ] `src/test/deploy06.test.ts` — DEPLOY-06: idempotency, deploy_failed on error, orchestrator retries

Follow `it.todo()` stub pattern from Phase 2. Do NOT import production modules in stubs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real zip-deploy to Netlify returns `state: ready` | DEPLOY-01 | Requires real NETLIFY_PAT + team account + deploy credits | Deploy a test site via `supabase functions invoke deploy-site --body '{"siteId":"..."}'; check Netlify dashboard for new site |
| Rate limit 429 triggers Retry-After handling | DEPLOY-03 | Can't safely hit rate limits in automated test | Manually trigger 4+ deploys in 60s, verify build_events shows `deploy_rate_limited` and `next_retry_at` set |
| Suspended site shows placeholder page | DEPLOY-04 | Requires real deployed site to suspend | After a successful deploy, invoke suspend-site, visit the Netlify URL, confirm branded placeholder |
| Reactivated site restores original content | DEPLOY-05 | Requires suspended site | After suspend, invoke reactivate-site, visit URL, confirm original site content restored |
| Netlify credit pricing tier confirmed | All | Account-specific billing info | Dashboard → Billing → confirm legacy or credit-based plan; if credit-based, budget deploys accordingly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
