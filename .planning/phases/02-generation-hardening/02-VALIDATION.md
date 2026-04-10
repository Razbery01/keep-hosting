---
phase: 2
slug: generation-hardening
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-09
last_verified: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + jsdom + @testing-library/react (installed in Phase 1) |
| **Config file** | `vite.config.ts` — includes `src/**` and `supabase/functions/**` |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~8s wall clock; ~130+ tests (2× `it.todo` placeholders remain) |
| **App build (`npm run build`)** | `tsconfig.app.json` **excludes `src/test`** so contract tests using `node:fs` / `readFileSync` on Edge sources are **Vitest-only**, not part of `tsc -b` for the Vite app |

**Do NOT reinstall Vitest or remove the `src/test` exclude from `tsconfig.app.json` without adding `@types/node` to the app project or moving contract tests to a separate tsconfig reference.**

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
| GEN-01 | 02-04 | 1 | Forced `tool_use` / SDK shape | unit (source scan) | `npm run test:ci -- src/test/gen01.test.ts` | ✅ | ✅ green |
| GEN-02 | 02-04 | 1 | No client Anthropic keys | unit | `npm run test:ci -- src/test/gen02.test.ts` | ✅ | ✅ green |
| GEN-03 | 02-04 | 1 | Token caps + retry ladder | unit | `npm run test:ci -- src/test/gen03.test.ts` | ✅ | ✅ green |
| GEN-04 | 02-02 / 02-04 | 1 | Viewport hard check + mobile soft warnings | unit | `npm run test:ci -- supabase/functions/_shared/html-scanner.test.ts` | ✅ | ✅ green |
| GEN-04 (SEC-07 baseline) | 02-02 | 1 | Allowlist scripts, iframe, javascript:, data: | unit | `npm run test:ci -- supabase/functions/__tests__/htmlScan.test.ts` | ✅ | ✅ green |
| GEN-05 | 02-04 | 1 | Queue columns / orchestrator wiring | unit | `npm run test:ci -- src/test/gen05.test.ts` | ✅ | ✅ green |
| GEN-06 | 02-02 | 1 | Industry hints | unit | `npm run test:ci -- supabase/functions/_shared/industry-hints.test.ts` | ✅ | ✅ green |
| GEN-07 | 02-02 | 1 | Cost helpers | unit | `npm run test:ci -- supabase/functions/_shared/cost-calc.test.ts` | ✅ | ✅ green |
| GEN-08 | 02-04 | 1 | Function layout / entry smoke | unit | `npm run test:ci -- src/test/gen08.test.ts` | ✅ | ✅ green |
| GEN-09 | 02-03 | 1 | `useBuildStatus` Realtime + fallback | unit+RTL | `npm run test:ci -- src/test/gen09.test.ts` | ✅ | ✅ green |
| CUST-05 | 02-03 | 1 | Onboarding submit / auth timing | unit+RTL | `npm run test:ci -- src/test/cust05.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### GEN-03 / GEN-04 notes (implementation truth)

- **`PACKAGE_MAX_TOKENS`** in `supabase/functions/generate-site/index.ts` is **4096 / 6000 / 8000** (Haiku + Edge budget), not 12k/24k/48k. Tests assert the implemented map.
- **`scanGeneratedHtml`** (Phase 2): allowlisted **external** `<script src>`, **inline** `<script>`, and **inline event handlers** when input is trusted post–SEC-06 sanitization; **hard** failures include missing **viewport** meta, **iframe**, **javascript:** URLs, **large `data:`** in `src`, and untrusted external JS hosts. See `html-scanner.ts` header comments and `htmlScan.test.ts`.

---

## Wave 0 Requirements

Wave 0 scaffolding is **done** — all targets below exist and are exercised by `npm run test:ci`.

- [x] `supabase/functions/_shared/html-scanner.test.ts` — viewport meta + mobile soft warnings + Phase 2 inline-script contract
- [x] `supabase/functions/_shared/cost-calc.test.ts`
- [x] `supabase/functions/_shared/industry-hints.test.ts`
- [x] `supabase/functions/_shared/prompts.test.ts`
- [x] `src/test/gen01.test.ts`
- [x] `src/test/gen02.test.ts`
- [x] `src/test/gen03.test.ts`
- [x] `src/test/gen05.test.ts`
- [x] `src/test/gen08.test.ts`
- [x] `src/test/gen09.test.ts`
- [x] `src/test/cust05.test.ts`
- [x] `supabase/functions/__tests__/htmlScan.test.ts` — SEC-07 / allowlist coverage (companion to `html-scanner.test.ts`)

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

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: automated verify on each GEN/CUST row above
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags in CI command (`vitest run`)
- [x] Feedback latency under 10s for `npm run test:ci`
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** recorded 2026-04-10 — `npm run test:ci` and `npm run build` green on `master`.
