---
phase: 04-payment-integration
plan: 02
subsystem: payments
tags: [payfast, subscriptions, itn, webhooks, deno, edge-functions, react]

# Dependency graph
requires:
  - phase: 04-01
    provides: payfast.ts shared signature module, migration 007 DB schema, config.toml JWT bypass, type definitions, 8 test stubs

provides:
  - create-payfast-order Edge Function (server-side signed PayFast checkout param generation)
  - payfast-itn Edge Function (ITN webhook with form-urlencoded parsing, signature verification, full lifecycle handling)
  - cancel-subscription Edge Function (customer-initiated cancel via PayFast API with signed headers)
  - OnboardingPage redirects to PayFast via hidden form POST (no direct build trigger)
  - DashboardPage subscription status display, Cancel Subscription + Reactivate UI
  - 8 PAY test files with real source-scan assertions (all green)

affects:
  - 05-domain-lifecycle
  - 06-compliance-tests-ops

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Form-urlencoded ITN body parsing via URLSearchParams in Deno Edge Functions
    - Server-side signature generation — passphrase never leaves Edge Function secrets
    - Fire-and-forget function chaining (generate-site / reactivate-site / suspend-site) via .catch(() => {})
    - Source-scan TDD for Deno modules (fs.readFileSync assertions — no Deno runtime import)
    - Self-referential false-positive exclusion for test directory scans (src/test/ excluded)
    - Hidden form POST pattern for PayFast checkout redirect from React SPA

key-files:
  created:
    - supabase/functions/create-payfast-order/index.ts
    - supabase/functions/payfast-itn/index.ts
    - supabase/functions/cancel-subscription/index.ts
  modified:
    - src/pages/OnboardingPage.tsx
    - src/pages/DashboardPage.tsx
    - src/test/pay02-checkout.test.ts
    - src/test/pay03-itn-signature.test.ts
    - src/test/pay04-itn-idempotency.test.ts
    - src/test/pay05-itn-build-trigger.test.ts
    - src/test/pay06-recurring.test.ts
    - src/test/pay07-failed-cancelled.test.ts
    - src/test/pay08-resubscribe.test.ts
    - src/test/pay09-secrets.test.ts

key-decisions:
  - "OnboardingPage order insert status changed from 'pending' to 'payment_pending' to reflect new PayFast redirect flow (aligns with ITN handler expectations)"
  - "pay09 secrets scan excludes src/test/ directory to prevent self-referential false positives — same pattern established in deploy01.test.ts bundle scan"
  - "Resubscribe detection in payfast-itn queries client_sites to find prior order, then checks subscriptions for cancelled/suspended status — if found, invokes reactivate-site instead of generate-site"
  - "cancel-subscription verifies user JWT and ownership before calling PayFast API — prevents unauthorized cancellations"
  - "DashboardPage subscription UI fetches most-recent subscription via .maybeSingle() — handles no-subscription state gracefully"

patterns-established:
  - "Pattern: PayFast hidden form redirect — React invokes Edge Function for signed params, then auto-submits hidden form; form.submit() handles redirect; no navigate() needed"
  - "Pattern: ITN always returns 200 — even on errors, to prevent PayFast retry loops on permanent failures"
  - "Pattern: Fire-and-forget with .catch(() => {}) for async function chaining (generate-site, reactivate-site, suspend-site)"

requirements-completed: [PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08]

# Metrics
duration: 15min
completed: 2026-04-09
---

# Phase 04 Plan 02: Payment Integration Core Implementation Summary

**Full PayFast payment flow code-complete: OnboardingPage hidden form redirect -> create-payfast-order server-side signature -> PayFast ITN webhook with COMPLETE/FAILED/CANCELLED lifecycle, idempotency, and resubscribe detection -> generate-site or reactivate-site triggered; DashboardPage shows subscription status with cancel/reactivate actions**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-09T16:30:00Z
- **Completed:** 2026-04-09T16:45:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Three PayFast Edge Functions created: create-payfast-order (server-side signed checkout param generation), payfast-itn (full ITN lifecycle: COMPLETE initial/recurring/resubscribe, FAILED grace period, CANCELLED suspend), cancel-subscription (JWT-authed with PayFast API call)
- OnboardingPage no longer invokes build-site directly; instead invokes create-payfast-order then auto-submits hidden form POST to PayFast checkout; ITN COMPLETE is the exclusive build trigger
- DashboardPage subscription management UI: status badges for all subscription states, Cancel Subscription button (calls cancel-subscription function), Reactivate button navigates to /onboarding?reactivate={siteId}
- All 8 PAY test files filled with real source-scan assertions — 178 tests pass, 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: create-payfast-order + payfast-itn + cancel-subscription Edge Functions** - `37c4566` (feat)
2. **Task 2: OnboardingPage PayFast redirect + DashboardPage subscription UI + all test bodies** - `3a12682` (feat)

**Plan metadata:** committed with SUMMARY.md (docs: complete plan)

## Files Created/Modified

- `supabase/functions/create-payfast-order/index.ts` - Server-side checkout param generation; reads PAYFAST_* secrets; generates signature via generatePayFastSignature; updates order to payment_pending; returns {params, payfast_url}
- `supabase/functions/payfast-itn/index.ts` - ITN webhook handler; form-urlencoded parsing; signature verification; idempotency check; COMPLETE (initial vs recurring vs resubscribe detection); FAILED (grace_period + failed_charge_count); CANCELLED (suspend-site); always returns 200
- `supabase/functions/cancel-subscription/index.ts` - JWT-authed cancel; verifies user owns subscription; calls PayFast PUT /subscriptions/{token}/cancel with signed headers; sets status to 'cancelling'
- `src/pages/OnboardingPage.tsx` - Removed build-site invoke; added create-payfast-order invoke + hidden form POST redirect; order status now 'payment_pending'
- `src/pages/DashboardPage.tsx` - Added Subscription type import, fetchSubscription(), subscription status badges (all 5 states), Cancel Subscription + Reactivate buttons, handleCancelSubscription() + handleReactivate()
- `src/test/pay02-checkout.test.ts` - Source-scan: payfast_url returned, subscription_type/frequency/cycles params, custom_str1 siteId, generatePayFastSignature called
- `src/test/pay03-itn-signature.test.ts` - Added itnSource verifyPayFastSignature call check + md5 import assertion
- `src/test/pay04-itn-idempotency.test.ts` - Source-scan: m_payment_id check, duplicate/skipped return
- `src/test/pay05-itn-build-trigger.test.ts` - Source-scan: generate-site invoked, no build-site in OnboardingPage, create-payfast-order invoked
- `src/test/pay06-recurring.test.ts` - Source-scan: next_charge_at updated, existingSub check for initial vs recurring
- `src/test/pay07-failed-cancelled.test.ts` - Source-scan: FAILED handler, CANCELLED triggers suspend-site, failed_charge_count referenced
- `src/test/pay08-resubscribe.test.ts` - Source-scan: reactivate-site invoked, cancelled/suspended check, Reactivate + cancel-subscription in DashboardPage
- `src/test/pay09-secrets.test.ts` - Scans src/ (excluding src/test/) for PAYFAST_PASSPHRASE literal; checks config.toml verify_jwt=false for payfast-itn

## Decisions Made

- OnboardingPage order insert status changed from `'pending'` to `'payment_pending'` — aligns with the PayFast redirect flow where payment has not yet been confirmed
- pay09 secrets scan excludes `src/test/` to prevent self-referential false positives (the test file itself contains the string `PAYFAST_PASSPHRASE` as the pattern to search for) — same established pattern as deploy01.test.ts bundle scan
- Resubscribe detection in payfast-itn queries `client_sites` table to find the site's prior order, then checks `subscriptions` for that order with cancelled/suspended status; if found, invokes `reactivate-site` instead of `generate-site`
- `cancel-subscription` uses the user's Supabase JWT to create a user-level client for ownership verification, then uses service role for the actual DB update — defense-in-depth pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed self-referential false positive in pay09 secrets scan**
- **Found during:** Task 2 (filling pay09-secrets.test.ts)
- **Issue:** `src/test/pay09-secrets.test.ts` itself contains the literal string `PAYFAST_PASSPHRASE` as the pattern being scanned, causing the test to find a violation in the test file itself
- **Fix:** Added `filter(f => !f.includes('/test/') && !f.includes('\\test\\'))` to exclude `src/test/` from the scan, matching the same pattern established in the deploy01 bundle scan test
- **Files modified:** `src/test/pay09-secrets.test.ts`
- **Verification:** `npm run test:ci` passes with 178 tests (0 failures)
- **Committed in:** `3a12682` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — self-referential test false positive)
**Impact on plan:** Necessary correction; no scope change.

## Issues Encountered

None beyond the auto-fixed test false positive above.

## User Setup Required

None — no new external service configuration required. PayFast secrets (`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX`) are referenced by Edge Functions and must be set in the Supabase project secrets (documented in 04-01-SUMMARY.md).

## Next Phase Readiness

- Full PayFast payment flow is code-complete end-to-end
- Edge Functions require deployment to Supabase (`supabase functions deploy`)
- PayFast sandbox credentials must be set in Supabase Edge Function secrets for sandbox testing
- Phase 05 (Domain Lifecycle) can proceed — payment gate is wired

---
*Phase: 04-payment-integration*
*Completed: 2026-04-09*
