---
phase: 04-payment-integration
plan: 01
subsystem: payments
tags: [payfast, md5, supabase, deno, postgresql, vitest, edge-functions]

# Dependency graph
requires:
  - phase: 03-deployment-pipeline
    provides: Edge Function patterns, _shared utilities, migration sequence (001-006)
provides:
  - 8 PAY test stub files (it.todo) for PAY-02 through PAY-09
  - Migration 007 renaming yoco columns to PayFast equivalents + new subscription columns
  - supabase/config.toml JWT bypass for payfast-itn public webhook endpoint
  - src/types/database.ts fully updated (no yoco references, all PayFast fields)
  - supabase/functions/_shared/payfast.ts signature module (generatePayFastSignature, verifyPayFastSignature, generateApiSignature, URL constants)
affects: [04-payment-integration plans 02+, payfast-itn edge function, create-payfast-order edge function]

# Tech tracking
tech-stack:
  added: [npm:md5 (Deno import for MD5 hashing — crypto.subtle does not support MD5)]
  patterns:
    - Source-scan TDD for Deno Edge Function modules not importable in Node/Vitest
    - PayFast signature algorithm (alphabetical sort, empty-field exclusion, + encoding, passphrase append, MD5)
    - it.todo() Nyquist stubs before Wave 1 implementation tasks

key-files:
  created:
    - src/test/pay02-checkout.test.ts
    - src/test/pay03-itn-signature.test.ts
    - src/test/pay04-itn-idempotency.test.ts
    - src/test/pay05-itn-build-trigger.test.ts
    - src/test/pay06-recurring.test.ts
    - src/test/pay07-failed-cancelled.test.ts
    - src/test/pay08-resubscribe.test.ts
    - src/test/pay09-secrets.test.ts
    - supabase/migrations/007_payfast_schema.sql
    - supabase/functions/_shared/payfast.ts
  modified:
    - supabase/config.toml
    - src/types/database.ts

key-decisions:
  - "Source-scan TDD pattern used for payfast.ts: Vitest reads the .ts file as text and asserts structural patterns — same approach as deploy01.test.ts — because npm:md5 Deno imports are not resolvable in Node"
  - "npm:md5 chosen over Deno std crypto: plan spec and research both confirm crypto.subtle does not support MD5; npm:md5 is the standard approach for Deno Edge Functions"
  - "cancelling added to subscriptions.status enum: supports customer-initiated cancel where site stays live until current_period_end"
  - "payment_id column is provider-agnostic: generic name supports future payment provider changes"

patterns-established:
  - "Source-scan TDD: write failing vitest that reads Deno .ts source with fs.readFileSync and asserts regex patterns — RED before payfast.ts exists, GREEN after"
  - "Deno shared module: supabase/functions/_shared/payfast.ts exports signature functions used by multiple Edge Functions"
  - "PayFast signature algorithm: filter empty+signature key, sort alphabetically, encodeURIComponent+replace %20 with +, append passphrase, md5 lowercase"

requirements-completed: [PAY-01, PAY-09]

# Metrics
duration: 3min
completed: 2026-04-11
---

# Phase 4 Plan 01: PayFast Foundation Summary

**PayFast foundation layer: 8 PAY test stubs, migration 007 renaming Yoco columns, JWT-bypass config for public ITN webhook, updated TypeScript types, and shared MD5 signature module using npm:md5**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-11T14:25:20Z
- **Completed:** 2026-04-11T14:28:30Z
- **Tasks:** 2 (Task 1: stubs+migration+config+types; Task 2: TDD payfast.ts)
- **Files modified:** 12

## Accomplishments

- Created 8 it.todo() test stub files covering PAY-02 through PAY-09 (Nyquist compliance)
- Migration 007: renamed orders.yoco_payment_id → payment_id, subscriptions.yoco_token_id → payfast_subscription_id; added payfast_token, current_period_end, failed_charge_count, cancelling status
- supabase/config.toml updated with [functions.payfast-itn] verify_jwt = false (public webhook endpoint)
- src/types/database.ts fully purged of all yoco references; all three positions (Row/Insert/Update) updated for both orders and subscriptions tables
- supabase/functions/_shared/payfast.ts implemented via TDD: generatePayFastSignature, verifyPayFastSignature, generateApiSignature, URL constants and getPayFastUrl helper

## Task Commits

Each task was committed atomically:

1. **Task 1: Test stubs + Migration + Config + Types** - `5453ed1` (feat)
2. **Task 2 RED: Failing test for PayFast signature module** - `249ecaa` (test)
3. **Task 2 GREEN: Implement payfast.ts** - `9d01872` (feat)

_Note: Task 2 used TDD — separate test commit (RED) then implementation commit (GREEN)._

## Files Created/Modified

- `src/test/pay02-checkout.test.ts` - PAY-02 it.todo() stubs for checkout params
- `src/test/pay03-itn-signature.test.ts` - PAY-03 source-scan tests for signature verification (real assertions — all 4 pass after GREEN)
- `src/test/pay04-itn-idempotency.test.ts` - PAY-04 it.todo() stubs for idempotency
- `src/test/pay05-itn-build-trigger.test.ts` - PAY-05 it.todo() stubs for build trigger
- `src/test/pay06-recurring.test.ts` - PAY-06 it.todo() stubs for recurring payments
- `src/test/pay07-failed-cancelled.test.ts` - PAY-07 it.todo() stubs for failed/cancelled
- `src/test/pay08-resubscribe.test.ts` - PAY-08 it.todo() stubs for resubscribe
- `src/test/pay09-secrets.test.ts` - PAY-09 it.todo() stubs for secrets/JWT config
- `supabase/migrations/007_payfast_schema.sql` - Column renames + new PayFast subscription columns
- `supabase/config.toml` - Added [functions.payfast-itn] verify_jwt = false
- `src/types/database.ts` - All yoco references replaced; payfast fields added across Subscription interface + subscriptions table Row/Insert/Update
- `supabase/functions/_shared/payfast.ts` - PayFast signature module (generatePayFastSignature, verifyPayFastSignature, generateApiSignature, URL constants)

## Decisions Made

- **Source-scan TDD for Deno modules:** pay03 tests use fs.readFileSync to read payfast.ts as text and assert structural patterns (export names, % encoding, field filtering). This is the same pattern as deploy01.test.ts. Direct import fails because npm:md5 is a Deno import not resolvable in Node/Vitest.
- **npm:md5 over Deno std/crypto:** Both the plan and research explicitly confirm crypto.subtle does not support MD5. npm:md5 is the de facto approach for Deno Edge Functions needing MD5.
- **payment_id is provider-agnostic:** Renamed from yoco_payment_id to payment_id (not payfast_payment_id) to avoid another rename if providers ever change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required in this plan. PayFast secrets (PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_SANDBOX) are required in later plans when Edge Functions are deployed.

## Next Phase Readiness

- Foundation layer complete: test stubs, migration, config, types, and signature module all ready
- Phase 4 Plan 02 can proceed: implement create-payfast-order Edge Function and update OnboardingPage
- Phase 4 Plan 03 can proceed: implement payfast-itn Edge Function using the shared payfast.ts module
- supabase db push required before Plan 02/03 to apply migration 007 to the linked Supabase project

---
*Phase: 04-payment-integration*
*Completed: 2026-04-11*
