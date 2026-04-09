---
phase: 02-generation-hardening
plan: "01"
subsystem: testing
tags: [vitest, test-stubs, scaffolding, tdd]

# Dependency graph
requires:
  - phase: 01-security-data-foundation
    provides: Vitest harness installed, vite.config.ts glob includes both src/ and supabase/functions/, it.todo() pattern established

provides:
  - 11 Vitest stub files covering all Wave 1+ tasks in Phase 2
  - 4 _shared/ stubs alongside Edge Function modules (GEN-04, GEN-06, GEN-07, prompts)
  - 7 src/test/ stubs for GEN-01, GEN-02, GEN-03, GEN-05, GEN-08, GEN-09, CUST-05
  - npm run test:ci exits 0 after scaffolding (no regressions)

affects:
  - 02-02-PLAN.md (GEN-01 structured output — targets gen01.test.ts)
  - 02-03-PLAN.md (GEN-02 browser bundle — targets gen02.test.ts)
  - 02-04-PLAN.md (GEN-03 retry ladder — targets gen03.test.ts)
  - 02-05-PLAN.md (GEN-04 viewport meta — targets html-scanner.test.ts)
  - 02-06-PLAN.md (GEN-05 queue state — targets gen05.test.ts)
  - 02-07-PLAN.md (GEN-06 industry hints — targets industry-hints.test.ts)
  - 02-08-PLAN.md (GEN-07 cost calc — targets cost-calc.test.ts)
  - 02-09-PLAN.md (GEN-08 Edge Function split — targets gen08.test.ts)
  - 02-10-PLAN.md (GEN-09 Realtime hook — targets gen09.test.ts)
  - 02-11-PLAN.md (CUST-05 onboarding race — targets cust05.test.ts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "it.todo() stubs in describe blocks — used throughout Phase 2 for Nyquist sampling contract"
    - "_shared/ test files placed alongside modules (supabase/functions/_shared/*.test.ts)"
    - "src/test/ for product-logic stubs requiring jsdom environment"

key-files:
  created:
    - supabase/functions/_shared/html-scanner.test.ts
    - supabase/functions/_shared/cost-calc.test.ts
    - supabase/functions/_shared/industry-hints.test.ts
    - supabase/functions/_shared/prompts.test.ts
    - src/test/gen01.test.ts
    - src/test/gen02.test.ts
    - src/test/gen03.test.ts
    - src/test/gen05.test.ts
    - src/test/gen08.test.ts
    - src/test/gen09.test.ts
    - src/test/cust05.test.ts
  modified: []

key-decisions:
  - "No production code imported in stubs — all 11 files use pure it.todo() to avoid import-resolution failures on not-yet-created modules"
  - "it.todo() chosen over it.skip() per Phase 1 precedent — prevents empty-suite strict mode failures"

patterns-established:
  - "Nyquist stub pattern: create it.todo() stubs before Wave 1 tasks to satisfy automated verify requirements"

requirements-completed: []

# Metrics
duration: 2min
completed: "2026-04-09"
---

# Phase 2 Plan 01: Generation Hardening Stub Scaffolding Summary

**11 Vitest it.todo() stub files scaffolded across _shared/ and src/test/ giving every Wave 1+ Phase 2 task a concrete automated-verify target with npm run test:ci exiting 0**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-09T22:22:07Z
- **Completed:** 2026-04-09T22:23:55Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Created 4 stub files in supabase/functions/_shared/ covering GEN-04 (viewport meta), GEN-06 (industry hints), GEN-07 (cost calculation), and prompts module
- Created 7 stub files in src/test/ covering GEN-01 through GEN-09 (excluding already-covered tasks) and CUST-05
- Full suite runs clean: 39 passing (Phase 1 unchanged), 61 todos, 0 failures, exit 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Edge-Function-adjacent shared-module stubs (4 files)** - `0993ac8` (test)
2. **Task 2: Create src/test/ stubs (7 files) for GEN-01..09 and CUST-05** - `55b8eae` (test)
3. **Task 3: Full suite smoke** - (no new files — verification only, no commit needed)

**Plan metadata:** (docs commit — below)

## Files Created/Modified

- `supabase/functions/_shared/html-scanner.test.ts` - GEN-04 viewport meta + mobile warning todos
- `supabase/functions/_shared/cost-calc.test.ts` - GEN-07 calcCostUsd / usdToZar / pricing constant todos
- `supabase/functions/_shared/industry-hints.test.ts` - GEN-06 industry key + fallback todos
- `supabase/functions/_shared/prompts.test.ts` - CODE_AGENT_SYSTEM + buildCodeAgentPrompt todos
- `src/test/gen01.test.ts` - GEN-01 tool_choice forced tool use todos
- `src/test/gen02.test.ts` - GEN-02 browser-bundle scan todos
- `src/test/gen03.test.ts` - GEN-03 per-package token caps + retry ladder todos
- `src/test/gen05.test.ts` - GEN-05 queue state transition todos
- `src/test/gen08.test.ts` - GEN-08 Edge Function split existence todos
- `src/test/gen09.test.ts` - GEN-09 useBuildStatus Realtime hook todos
- `src/test/cust05.test.ts` - CUST-05 OnboardingPage slow signUp race todos

## Decisions Made

- No production code imported in any stub — all 11 files use pure it.todo() to avoid import-resolution failures on not-yet-created modules (cost-calc.ts, industry-hints.ts, prompts.ts do not exist yet)
- it.todo() chosen over it.skip() per Phase 1 precedent (empty it.skip() bodies can fail in strict mode)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 11 stub files are in place; Wave 1 tasks (02-02 through 02-11) can now declare automated verify commands that target these stubs
- npm run test:ci exits 0 — the Nyquist sampling contract is satisfied for Phase 2 start
- No blockers for Wave 1 execution

---
*Phase: 02-generation-hardening*
*Completed: 2026-04-09*
