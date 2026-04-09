---
phase: 2
slug: generation-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + jsdom + @testing-library/react (installed in Phase 1) |
| **Config file** | `vite.config.ts` — already includes `src/**` and `supabase/functions/**` |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~5 seconds (current 39 tests pass in ~2.4s; Phase 2 adds ~25 more) |

**Do NOT reinstall Vitest or touch `vite.config.ts` test block.** Phase 1's Wave 0 handled that.

---

## Sampling Rate

- **After every task commit:** `npm run test:ci --reporter=dot`
- **After every plan wave:** `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

Filled in by planner after plans are created.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | Test stubs | scaffolding | `npm run test:ci` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-01 | unit | `npm run test:ci -- src/test/gen01.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-02 | unit | `npm run test:ci -- src/test/gen02.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-03 | unit | `npm run test:ci -- src/test/gen03.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-04 | unit | `npm run test:ci -- supabase/functions/_shared/html-scanner.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-05 | unit | `npm run test:ci -- src/test/gen05.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-06 | unit | `npm run test:ci -- supabase/functions/_shared/industry-hints.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-07 | unit | `npm run test:ci -- supabase/functions/_shared/cost-calc.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-08 | unit | `npm run test:ci -- src/test/gen08.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | GEN-09 | unit+RTL | `npm run test:ci -- src/test/gen09.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | CUST-05 | unit+RTL | `npm run test:ci -- src/test/cust05.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test infra is already installed. Wave 0 for this phase only creates stub test files so Wave 1 tasks have targets for their `<automated>` verify commands.

- [ ] `supabase/functions/_shared/html-scanner.test.ts` — extend existing scanner tests with viewport meta assertion + hardcoded-width soft warning
- [ ] `supabase/functions/_shared/cost-calc.test.ts` — `calcCostUsd()` + `usdToZar()` stubs
- [ ] `supabase/functions/_shared/industry-hints.test.ts` — stubs per industry key + unknown fallback
- [ ] `supabase/functions/_shared/prompts.test.ts` — CODE_AGENT_SYSTEM snapshot + industry hint injection stub
- [ ] `src/test/gen01.test.ts` — mocked `@anthropic-ai/sdk` streaming with `tool_choice` — asserts `tool_use` block extraction
- [ ] `src/test/gen02.test.ts` — file scan: no `VITE_ANTHROPIC` or `import.meta.env.ANTHROPIC_API_KEY` in `src/`
- [ ] `src/test/gen03.test.ts` — retry ladder + per-package token cap logic
- [ ] `src/test/gen05.test.ts` — queue state transitions (`retry_count`, `next_retry_at`)
- [ ] `src/test/gen08.test.ts` — existence checks for `supabase/functions/generate-site/`, `persist-files/`, `build-orchestrator/` with minimal smoke on their entry points
- [ ] `src/test/gen09.test.ts` — `useBuildStatus` hook: Realtime subscribe, INSERT event handling, 10s fallback polling, cleanup on unmount
- [ ] `src/test/cust05.test.ts` — `OnboardingPage` slow-`signUp` regression: assert `handleSubmit` called once, no `setTimeout` usage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Claude call returns valid `tool_use` block with real API key | GEN-01 | Requires real ANTHROPIC_API_KEY + network; unit tests mock the SDK | From an admin test account, trigger a real build and confirm `client_sites.generated_files` is populated and no regex fallback is taken (grep `build_events` for absence of `parse_fallback`) |
| Generated site passes Lighthouse mobile score ≥ 70 | GEN-04 | Requires real browser + deployed site | After Phase 3 deploys a site, run Lighthouse in Chrome DevTools → Mobile tab |
| `generate-site` Edge Function completes under 120s for Enterprise package | GEN-08 | Requires real Claude + Pexels calls | Trigger an Enterprise build via admin and check `build_events` duration |
| Realtime events fire within 2s of `build_events` INSERT | GEN-09 | Requires real Supabase Realtime channel | Open customer dashboard, trigger a build in another tab, observe UI update latency |
| Cost telemetry accurate vs Anthropic dashboard | GEN-07 | Requires reconciliation with real Anthropic usage | Compare `client_sites.generation_cost.lifetime_total_usd` with Anthropic console "Usage" page for the same day |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
