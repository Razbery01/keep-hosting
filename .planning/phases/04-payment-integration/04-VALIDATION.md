---
phase: 4
slug: payment-integration
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-10
---

# Phase 4 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (installed in Phase 1 -- do NOT reinstall) |
| **Config file** | `vite.config.ts` (already configured) |
| **Quick run command** | `npm run test:ci` |
| **Full suite command** | `npm run test -- --run` |
| **Estimated runtime** | ~12 seconds (~152 existing + ~20 new PayFast tests) |

---

## Sampling Rate

- **After every task commit:** `npm run test:ci`
- **After every plan wave:** `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 01 | 1 | Test stubs + migration + config + types | scaffolding | `npm run test:ci` | W0 stubs | pending |
| 04-01-T2 | 01 | 1 | PAY-01 (shared signature module) | TDD | `npm run test:ci` | W0 stubs | pending |
| 04-02-T1 | 02 | 2 | PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08 | source scan | `npm run test:ci` | src/test/pay02..pay09 stubs from 04-01 | pending |
| 04-02-T2 | 02 | 2 | PAY-02, PAY-05, PAY-08 | source scan | `npm run test:ci` | src/test/pay02..pay09 stubs from 04-01 | pending |
| 04-03-T1 | 03 | 3 | PAY-01, PAY-09 | deploy + build scan | `npm run test:ci && npm run build && ! grep -r 'PAYFAST' dist/` | N/A | pending |
| 04-03-T2 | 03 | 3 | PAY-01, PAY-02, PAY-03, PAY-05, PAY-08 | manual (checkpoint) | Human verification | N/A | pending |

---

## Wave 0 Requirements

Plan 01 Task 1 creates all test stubs (Wave 0 Nyquist compliance):

- [x] `src/test/pay02-checkout.test.ts` -- checkout param structure, subscription fields (PAY-02)
- [x] `src/test/pay03-itn-signature.test.ts` -- ITN signature verification (PAY-03)
- [x] `src/test/pay04-itn-idempotency.test.ts` -- idempotent ITN processing (PAY-04)
- [x] `src/test/pay05-itn-build-trigger.test.ts` -- payment as build trigger (PAY-05)
- [x] `src/test/pay06-recurring.test.ts` -- recurring payment handling (PAY-06)
- [x] `src/test/pay07-failed-cancelled.test.ts` -- failed/cancelled handling (PAY-07)
- [x] `src/test/pay08-resubscribe.test.ts` -- resubscribe flow + reactivate-site (PAY-08)
- [x] `src/test/pay09-secrets.test.ts` -- secret security (PAY-09)

All stubs use `it.todo()` pattern from prior phases. Bodies filled in Plan 02 Task 2.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real PayFast sandbox checkout completes | PAY-01, PAY-02 | Requires browser redirect to sandbox.payfast.co.za | Submit onboarding form -> verify redirect to PayFast -> complete payment with test card 5200000000000015 -> verify return to dashboard |
| Real ITN received from PayFast sandbox | PAY-03 | Requires publicly accessible Edge Function endpoint | After sandbox payment, check build_events for `itn_received` event within 60s |
| Build triggered by payment (not by form submit) | PAY-05 | Requires real payment flow | Verify no `build_start` event until after ITN COMPLETE |
| PAYFAST_PASSPHRASE not in browser bundle | PAY-09 | Requires full Vite build | `npm run build && grep -r 'PAYFAST' dist/` -- expect 0 matches |
| PayFast sandbox credentials configured | PAY-01 | Account-specific | Verify PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE set in Edge Function secrets |

**Note:** PayFast sandbox does NOT support recurring billing testing. Recurring payment ITN handling (PAY-06, PAY-07) can only be verified via unit tests with crafted payloads.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 12s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
