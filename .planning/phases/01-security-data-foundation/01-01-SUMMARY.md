---
phase: 01-security-data-foundation
plan: 01
subsystem: testing
tags: [vitest, testing-library, jsdom, jest-dom, test-infrastructure]

# Dependency graph
requires: []
provides:
  - Vitest 4.1.4 test harness with jsdom environment wired into vite.config.ts
  - Seven test stub files at exact paths referenced by 01-VALIDATION.md Wave 1+ tasks
  - npm scripts: test, test:watch, test:ci
  - src/test/setup.ts loading jest-dom matchers
  - .env.test.example template for RLS integration test credentials
  - .gitignore entries blocking .env.test secret leak
affects: [01-02, 01-03, 01-04]

# Tech tracking
tech-stack:
  added:
    - vitest@4.1.4
    - "@vitest/ui@4.1.4"
    - "@testing-library/react@16.3.2"
    - "@testing-library/jest-dom@6.9.1"
    - "@testing-library/user-event@14.6.1"
    - jsdom@29.0.2
  patterns:
    - Test stubs use it.todo() not it.skip() to avoid empty-suite failures in strict mode
    - RLS integration test excluded from default vitest run; reserved for dedicated test:rls script
    - vite.config.ts uses defineConfig from vitest/config (not vite) for proper test block types
    - fileParallelism:false replaces poolOptions.forks.singleFork (removed in vitest v4)

key-files:
  created:
    - vite.config.ts (extended with test block)
    - src/test/setup.ts
    - src/routes/__tests__/adminGuard.test.ts
    - src/__tests__/rlsAdminOnly.test.ts
    - src/__tests__/rlsNonAdmin.test.ts
    - src/lib/__tests__/uploadValidation.test.ts
    - src/lib/__tests__/supabaseClient.test.ts
    - supabase/functions/__tests__/promptSanitize.test.ts
    - supabase/functions/__tests__/htmlScan.test.ts
    - .env.test.example
  modified:
    - package.json (added test scripts and devDependencies)
    - .gitignore (added .env.test entries)

key-decisions:
  - "Use defineConfig from vitest/config instead of vite to resolve TypeScript type conflict with tsconfig.node.json types:[node]"
  - "Replace poolOptions.forks.singleFork with fileParallelism:false — vitest v4 removed the nested poolOptions.forks API"
  - "Use it.todo() in stubs, not it.skip() — ensures vitest reports stubs without marking as failures in strict mode"

patterns-established:
  - "Test setup: all new test files import describe/it from vitest explicitly"
  - "RLS integration tests excluded from default run via exclude array in vite.config.ts"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 01 Plan 01: Test Infrastructure Setup Summary

**Vitest 4.1.4 installed with jsdom environment, seven SEC-0x stub test files at exact VALIDATION.md paths, all passing in 2.4 seconds**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-09T20:23:40Z
- **Completed:** 2026-04-09T20:27:49Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Installed vitest 4.1.4 and full testing-library suite (react, jest-dom, user-event, jsdom) as devDependencies
- Wired vite.config.ts test block with globals, jsdom, setupFiles, include for src + supabase/functions, exclude for rlsNonAdmin
- Created seven test stubs at exact paths specified in 01-VALIDATION.md so Wave 1 tasks have real file targets
- `npm run test:ci` exits 0 in 2.4 seconds with 6 todo tests reported

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest dependencies and add npm scripts** - `ae7a61b` (chore)
2. **Task 2: Wire vite.config.ts test block and create setup file** - `85e932f` (chore)
3. **Task 3: Create test file stubs and .env.test.example** - `b4b5451` (chore)

## Files Created/Modified

- `package.json` - Added test/test:watch/test:ci scripts and 6 devDependencies
- `package-lock.json` - Updated with 122 new packages
- `vite.config.ts` - Extended with Vitest test block
- `src/test/setup.ts` - Loads jest-dom matchers via @testing-library/jest-dom/vitest
- `src/routes/__tests__/adminGuard.test.ts` - Stub for SEC-01 admin route guard
- `src/__tests__/rlsAdminOnly.test.ts` - Stub for SEC-02 admin-scoped query enforcement
- `src/__tests__/rlsNonAdmin.test.ts` - Stub for SEC-05 non-admin RLS isolation (excluded from default run)
- `src/lib/__tests__/uploadValidation.test.ts` - Stub for SEC-03 file upload validator
- `src/lib/__tests__/supabaseClient.test.ts` - Stub for SEC-04 supabase client env-var requirement
- `supabase/functions/__tests__/promptSanitize.test.ts` - Stub for SEC-06 prompt sanitizer
- `supabase/functions/__tests__/htmlScan.test.ts` - Stub for SEC-07 generated HTML scanner
- `.env.test.example` - Template with TEST_SUPABASE_URL placeholder
- `.gitignore` - Added .env.test and .env.test.local entries

## Decisions Made

- Used `defineConfig` from `vitest/config` (not `vite`) for the vite.config.ts default export. The project's `tsconfig.node.json` has `"types": ["node"]` which prevents the triple-slash `/// <reference types="vitest" />` from resolving the `test` property. Importing from `vitest/config` properly types the `test` block.
- Replaced `poolOptions: { forks: { singleFork: true } }` with `fileParallelism: false`. The `poolOptions.forks` nested API was removed in vitest v4 — `fileParallelism: false` achieves the same sequential file execution behavior.
- Used `it.todo()` in all stubs instead of `it.skip()` with empty body. Vitest treats `it.skip` with no callback as a passthrough but `it.todo` correctly marks stubs as pending without risking "no tests found" failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched from vite defineConfig to vitest/config defineConfig**
- **Found during:** Task 2 (Wire vite.config.ts test block)
- **Issue:** `tsc -b` reported `'test' does not exist in type 'UserConfigExport'` because `tsconfig.node.json` has `types: ["node"]` which prevents the triple-slash reference from expanding vitest types
- **Fix:** Changed `import { defineConfig } from 'vite'` to `import { defineConfig } from 'vitest/config'` — this properly types the `test` block without requiring tsconfig changes
- **Files modified:** `vite.config.ts`
- **Verification:** `tsc -b` exits 0
- **Committed in:** `85e932f` (Task 2 commit)

**2. [Rule 1 - Bug] Replaced removed poolOptions.forks.singleFork with fileParallelism:false**
- **Found during:** Task 2 (Wire vite.config.ts test block)
- **Issue:** `tsc -b` reported `'poolOptions' does not exist in type 'InlineConfig'` — the nested pool options API was removed in vitest v4
- **Fix:** Replaced `pool: 'forks', poolOptions: { forks: { singleFork: true } }` with `pool: 'forks', fileParallelism: false`
- **Files modified:** `vite.config.ts`
- **Verification:** `tsc -b` exits 0; `npm run test:ci` exits 0
- **Committed in:** `85e932f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — API compatibility with installed vitest v4)
**Impact on plan:** Both fixes required for TypeScript compatibility and vitest v4 API alignment. No scope creep. Behavior is identical to what the plan specified.

## Issues Encountered

None beyond the two auto-fixed API deviations above.

## User Setup Required

None — no external service configuration required at this stage.
`.env.test.example` is the template for Plan 04 RLS integration tests; no credentials needed until then.

## Next Phase Readiness

- Wave 0 complete: test harness exists, all 7 stub files are at exact VALIDATION.md paths
- Plans 02-04 can now reference test files in their `<automated>` verification commands
- Plan 02 (Admin RLS policies) can write real test bodies into the stub files
- No blockers for Wave 1 execution

---
*Phase: 01-security-data-foundation*
*Completed: 2026-04-09*

## Self-Check: PASSED

All files present. All commits found (ae7a61b, 85e932f, b4b5451). `npm run test:ci` exits 0 in 2.35s. `tsc -b` passes clean.
