---
phase: 1
slug: security-data-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x + @testing-library/react + jsdom |
| **Config file** | `vite.config.ts` (test block) — Wave 0 creates |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --run --reporter=dot`
- **After every plan wave:** Run `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Filled in by planner after plans are created. Each requirement below must have an associated test command and task ID.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | Test infra | setup | `npm run test -- --run` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-01 | integration | `npm run test -- --run src/routes/__tests__/adminGuard.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-02 | integration | `npm run test -- --run src/__tests__/rlsAdminOnly.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-03 | unit+integration | `npm run test -- --run src/lib/__tests__/uploadValidation.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-04 | unit | `npm run test -- --run src/lib/__tests__/supabaseClient.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-05 | integration | `npm run test -- --run src/__tests__/rlsNonAdmin.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-06 | unit | `npm run test -- --run supabase/functions/__tests__/promptSanitize.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | SEC-07 | unit | `npm run test -- --run supabase/functions/__tests__/htmlScan.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | DATA-01..06 | migration | `supabase db reset && supabase db diff` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom` as devDependencies
- [ ] Add `test`, `test:watch`, `test:ci` scripts to `package.json`
- [ ] Extend `vite.config.ts` with `test` block (`globals: true`, `environment: 'jsdom'`, `setupFiles`)
- [ ] Create `src/test/setup.ts` with `@testing-library/jest-dom` matchers
- [ ] Stub test files so Dimension 8 sampling continuity is possible:
  - [ ] `src/routes/__tests__/adminGuard.test.ts`
  - [ ] `src/__tests__/rlsAdminOnly.test.ts`
  - [ ] `src/__tests__/rlsNonAdmin.test.ts`
  - [ ] `src/lib/__tests__/uploadValidation.test.ts`
  - [ ] `src/lib/__tests__/supabaseClient.test.ts`
  - [ ] `supabase/functions/__tests__/promptSanitize.test.ts`
  - [ ] `supabase/functions/__tests__/htmlScan.test.ts`
- [ ] Provision a dedicated Supabase test project (or document DB reset pattern) for RLS integration tests
- [ ] Add `.env.test` with test-project URL + service role key (gitignored)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Supabase Storage bucket config for `logos` accepts only image MIMEs | SEC-03 | Supabase bucket state not easily asserted from Vitest without service role; verify via Dashboard or `supabase storage get-bucket` | Open Supabase Dashboard → Storage → logos bucket → confirm allowed MIME types restrict to image/* and max file size is 5MB |
| POPIA consent timestamp + IP captured at signup | DATA-03 | Requires real signup flow with live Supabase auth; integration test covers column existence, manual verifies wire-up | Sign up a test user via `/signup`, then query `profiles` table for `popia_consent_at` and `popia_consent_ip` — both non-null |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
