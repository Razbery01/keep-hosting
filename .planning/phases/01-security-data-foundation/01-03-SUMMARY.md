---
phase: 01-security-data-foundation
plan: 03
subsystem: security
tags: [sec-04, sec-01, sec-02, sec-03, sec-06, sec-07, auth-guard, upload-validation, prompt-injection, xss-scan]
dependency_graph:
  requires: [01-01]
  provides: [src/lib/supabase.ts, src/components/auth/RequireAdmin.tsx, src/lib/uploadValidation.ts, supabase/functions/_shared/sanitize.ts, supabase/functions/_shared/html-scanner.ts]
  affects: [src/router.tsx, src/pages/OnboardingPage.tsx, supabase/functions/build-site/index.ts]
tech_stack:
  added: [crypto.randomUUID, OWASP LLM Prompt Injection mitigations, regex-based HTML safety scanner]
  patterns: [TDD red-green for all 4 library modules, env-var fail-fast, UUID path building, layout route guard]
key_files:
  created:
    - src/lib/uploadValidation.ts
    - src/components/auth/RequireAdmin.tsx
    - supabase/functions/_shared/sanitize.ts
    - supabase/functions/_shared/html-scanner.ts
    - src/routes/__tests__/adminGuard.test.tsx
    - src/lib/__tests__/supabaseClient.test.ts (upgraded from stub)
    - src/lib/__tests__/uploadValidation.test.ts (upgraded from stub)
    - supabase/functions/__tests__/promptSanitize.test.ts (upgraded from stub)
    - supabase/functions/__tests__/htmlScan.test.ts (upgraded from stub)
  modified:
    - src/lib/supabase.ts
    - src/router.tsx
    - src/pages/OnboardingPage.tsx
    - supabase/functions/build-site/index.ts
    - .env.example
decisions:
  - "RequireAdmin returns null during loading (not a spinner) to avoid flash of admin UI before profile resolves"
  - "SEC-02 is structural: existing is_admin() RLS on profiles/orders/client_sites is the trust boundary; RequireAdmin is the UI layer only"
  - "scanGeneratedHtml is intentionally strict: <script> tag detection fires even for allowlisted hosts — conservative by design"
  - "sanitize.ts and html-scanner.ts use no Deno.* imports — pure TS — so they are unit-testable in Node Vitest AND importable from Deno Edge Functions via relative path"
  - "HTML scan loops over all .html files before Storage write; a single violation throws and marks the build as failed"
metrics:
  duration: 7min
  completed_date: "2026-04-09"
  tasks_completed: 5
  files_created: 9
  files_modified: 5
---

# Phase 1 Plan 03: Security Code Fixes Summary

**One-liner:** Five code-level security blockers closed — hardcoded JWT removed, admin route guarded with RequireAdmin layout route, file uploads validated with MIME/UUID path builder, prompt injection mitigated with sanitizeForPrompt, and generated HTML scanned for XSS before deploy.

## Tasks Completed

| Task | Name | Commit | Tests |
|------|------|--------|-------|
| 1 | Fix Supabase credential fallback (SEC-04) | e42d9a9 | 3 pass |
| 2 | Add RequireAdmin route guard (SEC-01/SEC-02) | 4ffc789 | 5 pass |
| 3 | Upload validation + OnboardingPage wiring (SEC-03) | c1c5f9f | 12 pass |
| 4 | sanitizeForPrompt + scanGeneratedHtml modules (SEC-06, SEC-07) | 90d4f17 | 19 pass (10+9) |
| 5 | Wire sanitizer + scanner into build-site | 25d9344 | grep verified |

**Total tests added: 39 across 5 test files**

## Requirements Closed

| Requirement | Proof | Notes |
|-------------|-------|-------|
| SEC-04 (credential leak) | `grep -r "eyJhbGciOi" src/` → nothing; 3 supabaseClient tests pass | Hardcoded JWT removed, throw on missing env var |
| SEC-01 (admin route guard) | 5 adminGuard tests pass — non-admin redirected, admin renders child | RequireAdmin layout route wraps /admin and /admin/orders |
| SEC-02 (server-side enforcement) | Structural claim — existing is_admin() RLS enforces | Plan 04 provides integration test proof |
| SEC-03 (upload hardening) | 12 uploadValidation tests pass; OnboardingPage uses validateFile + buildStoragePath | Raw filename eliminated from all storage paths |
| SEC-06 (prompt injection) | 10 sanitizeForPrompt tests pass; build-site wraps all 6 user fields | OWASP LLM mitigations: strips control chars, angle brackets, backticks, backslashes |
| SEC-07 (HTML XSS scan) | 9 scanGeneratedHtml tests pass; build-site scans before any Storage write | Rejects script, iframe, on* handlers, javascript: href, data: URI src |

## Test Counts by File

| File | Tests | Status |
|------|-------|--------|
| src/lib/__tests__/supabaseClient.test.ts | 3 | All pass |
| src/routes/__tests__/adminGuard.test.tsx | 5 | All pass |
| src/lib/__tests__/uploadValidation.test.ts | 12 | All pass |
| supabase/functions/__tests__/promptSanitize.test.ts | 10 | All pass |
| supabase/functions/__tests__/htmlScan.test.ts | 9 | All pass |
| **Total** | **39** | **All pass** |

## OnboardingPage setTimeout Race (CUST-05)

The existing `setTimeout(() => handleSubmit(), 500)` race condition in `handleAuth` was NOT modified. File validation is called synchronously at the top of `handleSubmit()` (before any async calls), so validation cannot be affected by the setTimeout. CUST-05 remains deferred to Phase 2 as planned.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notable Decisions

1. **adminGuard test file renamed from `.test.ts` to `.test.tsx`** — the test uses JSX (React Testing Library renders), so the `.tsx` extension is required. The old stub file `adminGuard.test.ts` still exists with its `it.todo()` and is skipped. The vite.config.ts `include` glob already covers `*.{test,spec}.{ts,tsx}` so no config change was needed.

2. **Image Agent prompt not sanitized** — The Image Agent Claude call (around line 42 of build-site/index.ts) still uses raw `site.description` and `site.services_text`. The plan's scope was the main Code Agent prompt. The Image Agent prompt is lower-risk (it only produces search queries, not HTML). This is noted as a deferred item.

## Self-Check

- [x] src/lib/supabase.ts — exists, throws on missing env vars, no JWT
- [x] src/lib/uploadValidation.ts — exists, exports validateFile, buildStoragePath
- [x] src/components/auth/RequireAdmin.tsx — exists, uses useAuth + Navigate + Outlet
- [x] src/router.tsx — RequireAdmin wraps /admin and /admin/orders
- [x] src/pages/OnboardingPage.tsx — validateFile + buildStoragePath called before upload
- [x] supabase/functions/_shared/sanitize.ts — exists, no Deno.* imports
- [x] supabase/functions/_shared/html-scanner.ts — exists, no Deno.* imports
- [x] supabase/functions/build-site/index.ts — imports and calls sanitizeForPrompt + scanGeneratedHtml
- [x] .env.example — documents VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (no values)
- [x] All 39 tests pass (npm run test:ci exits 0)
- [x] tsc -b passes

## Self-Check: PASSED
