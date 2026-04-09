# Testing: keep-hosting

## Current State

**There is no test infrastructure in this codebase.**

- No test files anywhere in `src/` (no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `__tests__/` folders)
- No test framework configured — Jest, Vitest, Mocha, and Playwright are all absent
- No test runner dependencies in `package.json`
- No test scripts (`test`, `test:watch`, `test:coverage`) in `package.json`
- No CI pipeline running tests (no `.github/workflows/`, no test step in any build script)
- No coverage tooling

## Framework

None. A decision needs to be made.

**Recommended for this stack (Vite + React + TS + Supabase):**

| Layer | Tool | Why |
|-------|------|-----|
| Unit / component | **Vitest** + **@testing-library/react** | Native Vite integration, fast, Jest-compatible API |
| DOM mocking | **jsdom** or **happy-dom** | Bundled easily with Vitest |
| E2E | **Playwright** | Cross-browser, can drive real Supabase test instance |
| Supabase mocking | Per-test `createClient` stubs, or use a local Supabase dev project | RLS-sensitive — mocks hide real policy bugs |

## Structure (Proposed)

When tests are introduced, co-locate them with source:

```
src/
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.test.ts        ← co-located
│   ├── useDomainSearch.ts
│   └── useDomainSearch.test.ts
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
├── pages/
│   ├── OnboardingPage.tsx
│   └── OnboardingPage.test.tsx  ← component tests
└── ...

e2e/                            ← separate Playwright tree
├── signup.spec.ts
├── onboarding.spec.ts
└── checkout.spec.ts
```

## Coverage

Zero. Every feature is currently verified by manual testing only.

## What Should Be Tested First (Priority Order)

Given the risks surfaced in CONCERNS.md, the highest-leverage tests to add first:

1. **Auth flows** — sign up, sign in, session persistence, reset password
2. **Admin authorization** — non-admin users cannot access `/admin*` routes or run admin queries (this is currently broken — tests would catch it)
3. **File upload validation** — MIME type, size limits, filename sanitization
4. **Domain search** — debouncing, caching, error states
5. **Onboarding happy path** — form submit → order created → build triggered
6. **Payment flow** — once integrated
7. **Supabase RLS policies** — integration tests hitting a real test Supabase project with different user roles

## Mocking Strategy

- **Unit tests:** Mock `src/lib/supabase.ts` — return fake `{ data, error }` shapes
- **Integration tests:** Use a dedicated Supabase test project with seeded fixtures + RLS enforced. Do NOT mock Supabase here — the point is to catch real RLS/schema drift.
- **E2E:** Run against a disposable Supabase project per test run; clean up in `afterAll`.

## Gaps / Risks from Having No Tests

- Admin authorization hole (see CONCERNS.md) has no automated detection
- RLS policy regressions would only surface in production
- Refactoring `OnboardingPage.tsx` is high-risk without a safety net
- No confidence in behavior across browser/device combinations
- Payment integration (when added) would ship without verification

## Action Items

Before shipping paid features:
1. Add Vitest + @testing-library/react
2. Add `test` script to `package.json`
3. Write smoke tests for auth, admin gate, and onboarding happy path
4. Wire tests into CI (GitHub Actions or similar)
5. Add Playwright for the critical signup → onboard → checkout flow
