---
phase: 02-generation-hardening
plan: "02"
subsystem: api
tags: [claude, cost-calc, industry-hints, prompts, html-scanner, vitest, typescript]

# Dependency graph
requires:
  - phase: 02-generation-hardening
    provides: Vitest stub test files created in Plan 01 (Wave 0 scaffolding)
  - phase: 01-security-data-foundation
    provides: html-scanner.ts SEC-07 baseline, sanitize.ts pure-TS pattern
provides:
  - "SONNET_4_6_PRICING constants + calcCostUsd + usdToZar in cost-calc.ts"
  - "IndustryHint interface + INDUSTRY_HINTS record (8 verticals) + getIndustryHints() in industry-hints.ts"
  - "CODE_AGENT_SYSTEM (extracted + mobile enforcement + {industry_hints} slot) + buildCodeAgentPrompt() in prompts.ts"
  - "Viewport meta hard check (violation #6) + scanForMobileWarnings() soft check in html-scanner.ts"
affects:
  - 02-04 (generate-site refactor consumes all four shared modules)
  - 02-03 (html-scanner used by build scanner)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-TS shared module pattern (no Deno.* imports — testable in Node Vitest AND importable from Deno Edge Functions)"
    - "TDD Red-Green-Refactor: write failing test first, implement to pass"
    - "Hardcoded exchange rate constant with documented review trigger"

key-files:
  created:
    - supabase/functions/_shared/cost-calc.ts
    - supabase/functions/_shared/industry-hints.ts
    - supabase/functions/_shared/prompts.ts
  modified:
    - supabase/functions/_shared/html-scanner.ts
    - supabase/functions/_shared/cost-calc.test.ts
    - supabase/functions/_shared/industry-hints.test.ts
    - supabase/functions/_shared/prompts.test.ts
    - supabase/functions/_shared/html-scanner.test.ts
    - supabase/functions/__tests__/htmlScan.test.ts

key-decisions:
  - "ZAR exchange rate hardcoded at 18.85 per 02-CONTEXT.md — Phase 6 admin can swap for live feed"
  - "Output format JSON section removed from CODE_AGENT_SYSTEM — Plan 04 uses tool_choice: { type: 'tool', name: 'deliver_site_files' }"
  - "Viewport meta check added as hard violation #6 in scanGeneratedHtml() — missing viewport fails the build"
  - "Phase 1 __tests__/htmlScan.test.ts 'clean HTML' fixture updated to include viewport meta (Rule 1 auto-fix — clean HTML must satisfy GEN-04)"
  - "getIndustryHints() is case-insensitive and never throws — unknown industries fall back to 'other'"

patterns-established:
  - "Pure-TS shared-module contract: zero Deno.* references, importable via './module' in Vitest and '../_shared/module.ts' in Deno"
  - "TDD with it.todo replacement: stub files from Plan 01 become real passing test suites in Plan 02"
  - "Soft vs hard scanner checks: violations[] = deploy-blocking; MobileWarnings = warning-only separate type"

requirements-completed:
  - GEN-04
  - GEN-06
  - GEN-07

# Metrics
duration: 7min
completed: 2026-04-09
---

# Phase 2 Plan 02: Generation Shared Modules Summary

**Four pure-TypeScript shared modules (cost-calc, industry-hints, prompts, html-scanner extension) with 50+ passing tests replacing all Plan 01 it.todo stubs for GEN-04, GEN-06, GEN-07**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-09T22:26:01Z
- **Completed:** 2026-04-09T22:33:00Z
- **Tasks:** 5 of 5
- **Files modified:** 9

## Accomplishments

- Created `cost-calc.ts` with verified Sonnet 4.6 pricing constants (GEN-07), `calcCostUsd()`, and `usdToZar()` with hardcoded 18.85 ZAR rate per 02-CONTEXT.md
- Created `industry-hints.ts` with all 8 SA SMME verticals typed, populated (no hardcoded SA locations), and `getIndustryHints()` with case-insensitive fallback (GEN-06)
- Created `prompts.ts` extracting `CODE_AGENT_SYSTEM` verbatim from build-site/index.ts with: mobile enforcement line added, `{industry_hints}` slot injected, OUTPUT FORMAT JSON section removed for Plan 04's tool_choice pattern
- Extended `html-scanner.ts` with viewport meta hard check (violation #6, blocks deploy) and new `scanForMobileWarnings()` returning soft `MobileWarnings` type (GEN-04)
- Full Vitest suite: 103 tests passing, 23 todo stubs remaining (from other plans), zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: cost-calc.ts + GEN-07 tests** - `821d8e5` (feat)
2. **Task 2: industry-hints.ts + GEN-06 tests** - `f0f95aa` (feat)
3. **Task 3: prompts.ts + tests** - `8db5b3f` (feat)
4. **Task 4: html-scanner.ts extension + GEN-04 tests** - `0e8a695` (feat)
5. **Task 5: full suite smoke** - no new files (verification only)

## Files Created/Modified

- `supabase/functions/_shared/cost-calc.ts` — SONNET_4_6_PRICING, calcCostUsd, usdToZar (min 40 lines)
- `supabase/functions/_shared/industry-hints.ts` — IndustryHint, INDUSTRY_HINTS, getIndustryHints (8 verticals)
- `supabase/functions/_shared/prompts.ts` — CODE_AGENT_SYSTEM + buildCodeAgentPrompt + formatHintBlock
- `supabase/functions/_shared/html-scanner.ts` — +viewport check #6, +MobileWarnings, +scanForMobileWarnings
- `supabase/functions/_shared/cost-calc.test.ts` — 8 GEN-07 tests (all it.todo replaced)
- `supabase/functions/_shared/industry-hints.test.ts` — 14 GEN-06 tests (all it.todo replaced)
- `supabase/functions/_shared/prompts.test.ts` — 14 prompts tests (all it.todo replaced)
- `supabase/functions/_shared/html-scanner.test.ts` — 14 GEN-04 tests (all it.todo replaced)
- `supabase/functions/__tests__/htmlScan.test.ts` — Phase 1 fixture updated with viewport meta (Rule 1 auto-fix)

## Key Links (for Plan 04 context)

- `prompts.ts` imports from `./industry-hints.ts` via `getIndustryHints` — Plan 04 passes `site.industry` from onboarding data
- `html-scanner.ts` exports both `scanGeneratedHtml` (hard, safe=false) and `scanForMobileWarnings` (soft, separate type) — Plan 04 calls both after generation
- `cost-calc.ts` exports `calcCostUsd` and `usdToZar` — Plan 04 uses these to record to `client_sites.generation_cost` JSONB

## Decisions Made

- ZAR exchange rate hardcoded at 18.85 per 02-CONTEXT.md decision — document says "admin Phase 6 can swap"
- `CODE_AGENT_SYSTEM` OUTPUT FORMAT section removed because Plan 04 uses `tool_choice: { type: 'tool', name: 'deliver_site_files' }` — JSON inline emission instructions would confuse the model with forced tool use
- `build-site/index.ts` intentionally NOT modified — Plan 04 handles the refactor when splitting into generate-site

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Phase 1 'clean HTML' test fixture to include viewport meta**
- **Found during:** Task 4 (html-scanner.ts extension)
- **Issue:** `supabase/functions/__tests__/htmlScan.test.ts` had a "passes clean semantic HTML" test with a fixture that lacked `<meta name="viewport">`. After adding the viewport hard check, clean HTML MUST include the viewport meta — otherwise "clean HTML" is contradictory.
- **Fix:** Added `<meta name="viewport" content="width=device-width, initial-scale=1">` to the clean HTML fixture. Updated the test name to clarify GEN-04 requirement.
- **Files modified:** `supabase/functions/__tests__/htmlScan.test.ts`
- **Verification:** Both html-scanner test files pass (23 tests total)
- **Committed in:** `0e8a695` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in Phase 1 test fixture made invalid by new hard check)
**Impact on plan:** Necessary for correctness. The Phase 1 fixture was describing "clean HTML" but lacked a required mobile-responsive attribute. No scope creep.

## Issues Encountered

None — all tasks executed cleanly.

## User Setup Required

None — no external service configuration required. All modules are pure TypeScript.

## Next Phase Readiness

- All four shared modules are ready for Plan 04 (generate-site refactor) to consume
- `prompts.ts → industry-hints.ts` import chain works and is tested
- `scanGeneratedHtml` and `scanForMobileWarnings` both exported and tested
- `calcCostUsd` and `usdToZar` ready for cost tracking in Plan 04
- `supabase/functions/build-site/index.ts` unchanged — Plan 04 will split it into generate-site

## Self-Check: PASSED

- cost-calc.ts: FOUND
- industry-hints.ts: FOUND
- prompts.ts: FOUND
- html-scanner.ts (extended): FOUND
- 02-02-SUMMARY.md: FOUND
- Commit 821d8e5: FOUND (cost-calc)
- Commit f0f95aa: FOUND (industry-hints)
- Commit 8db5b3f: FOUND (prompts)
- Commit 0e8a695: FOUND (html-scanner)

---
*Phase: 02-generation-hardening*
*Completed: 2026-04-09*
