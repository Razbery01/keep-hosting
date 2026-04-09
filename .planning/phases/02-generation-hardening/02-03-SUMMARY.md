---
phase: 02-generation-hardening
plan: "03"
subsystem: client-side
tags: [realtime, hooks, race-condition, bundle-security, testing]
dependency_graph:
  requires: [02-01]
  provides: [CUST-05, GEN-02, GEN-09]
  affects: [src/pages/OnboardingPage.tsx, src/pages/DashboardPage.tsx, src/hooks/useBuildStatus.ts]
tech_stack:
  added: [Supabase Realtime postgres_changes, useBuildStatus hook]
  patterns: [TDD source-grep tests, Realtime-with-polling-fallback, await-over-setTimeout]
key_files:
  created:
    - src/hooks/useBuildStatus.ts
  modified:
    - src/pages/OnboardingPage.tsx
    - src/pages/DashboardPage.tsx
    - src/test/cust05.test.ts
    - src/test/gen02.test.ts
    - src/test/gen09.test.ts
decisions:
  - "setTimeout band-aid removed in favor of await handleSubmit() — safe because handleSubmit already calls supabase.auth.getUser() at its first line"
  - "useBuildStatus uses 10s polling fallback only on CHANNEL_ERROR/TIMED_OUT — not as the primary mechanism"
  - "Admin setInterval(fetchOrders, 3000) preserved — explicitly out of Phase 2 scope per CONCERNS.md"
  - "GEN-02 test excludes src/test/ directory from scan to prevent self-reference false positives"
metrics:
  duration: 2min
  completed_date: "2026-04-09"
  tasks_completed: 4
  files_changed: 5
  files_created: 1
---

# Phase 02 Plan 03: Client-Side Hardening Summary

**One-liner:** Replaced `setTimeout(() => handleSubmit(), 500)` with `await handleSubmit()` (CUST-05), extracted `useBuildStatus` hook with Supabase Realtime + 10s polling fallback replacing 3s polling (GEN-09), and added automated bundle scan tests proving Anthropic API key never reaches the browser (GEN-02).

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Fix CUST-05 onboarding race + regression test | ad3a996 | OnboardingPage.tsx, cust05.test.ts |
| 2 | Create useBuildStatus hook + RTL tests | 1ceefa8 | src/hooks/useBuildStatus.ts, gen09.test.ts |
| 3 | Wire useBuildStatus into DashboardPage + bundle scan | 4fcde27 | DashboardPage.tsx, gen02.test.ts |
| 4 | Full suite smoke test | (no commit) | validation only |

## Verification Results

- `OnboardingPage.tsx` has `await handleSubmit()` in `handleAuth` — confirmed by cust05.test.ts
- No `setTimeout(() => handleSubmit)` pattern in src/ — confirmed by source-grep test
- `useBuildStatus` hook exists at `src/hooks/useBuildStatus.ts` (95 lines) with correct Realtime + polling fallback
- `DashboardPage.tsx` imports `useBuildStatus` and no longer has `setInterval(fetchLogs, 3000)`
- Bundle scan confirms: zero `VITE_ANTHROPIC`, zero `import.meta.env.ANTHROPIC_API_KEY`, zero `@anthropic-ai/sdk` imports in `src/`
- All 3 requirement test suites (cust05, gen02, gen09): 14 tests passing, zero `it.todo` remaining
- Phase 1 tests still passing (75 total passing, 29 `it.todo` stubs for future plans)

## Deviations from Plan

### Pre-existing Issue (Out of Scope — Logged to Deferred)

**`supabase/functions/_shared/prompts.test.ts` fails to resolve `./prompts`**
- Found during: Task 4 full suite run
- Issue: Plan 02's scaffolding created real tests in `prompts.test.ts` importing `./prompts.ts` which doesn't exist yet — this is Plan 02's (GEN-06/GEN-01) implementation task
- This failure pre-existed Plan 03 and was not introduced by it
- Action: Logged — will be resolved when Plan 02 implements `prompts.ts`
- Rule: Out of scope per deviation rules — pre-existing failure in unrelated file

No deviations from the plan itself. All 3 requirements (CUST-05, GEN-02, GEN-09) implemented as specified.

## Self-Check: PASSED

All created files exist on disk. All task commits verified in git log.

| Check | Result |
|-------|--------|
| src/hooks/useBuildStatus.ts exists | FOUND |
| src/test/cust05.test.ts exists | FOUND |
| src/test/gen02.test.ts exists | FOUND |
| src/test/gen09.test.ts exists | FOUND |
| Commit ad3a996 (Task 1) | FOUND |
| Commit 1ceefa8 (Task 2) | FOUND |
| Commit 4fcde27 (Task 3) | FOUND |
