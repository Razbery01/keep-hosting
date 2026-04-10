---
phase: 4
slug: payment-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 (installed in Phase 1 — do NOT reinstall) |
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
| TBD | TBD | 0 | Test stubs | scaffolding | `npm run test:ci` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-02 | unit | `npm run test:ci -- src/__tests__/payfast-checkout.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-03 | unit | `npm run test:ci -- src/__tests__/payfast-itn.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-04 | unit | `npm run test:ci -- src/__tests__/payfast-itn.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-05 | unit | `npm run test:ci -- src/__tests__/payfast-itn.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-06 | unit | `npm run test:ci -- src/__tests__/payfast-itn.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-07 | unit | `npm run test:ci -- src/__tests__/payfast-itn.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-08 | unit (source scan) | `npm run test:ci -- src/test/pay08.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | PAY-09 | build scan | `npm run build && ! grep -r 'PAYFAST_PASSPHRASE' dist/` | N/A | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/__tests__/payfast-itn.test.ts` — ITN signature verification, idempotency, payment events (PAY-03..07)
- [ ] `src/__tests__/payfast-checkout.test.ts` — checkout param structure, subscription fields (PAY-02)
- [ ] `src/test/pay08.test.ts` — resubscribe flow (PAY-08) source scan

Follow `it.todo()` stub pattern from prior phases.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real PayFast sandbox checkout completes | PAY-01, PAY-02 | Requires browser redirect to sandbox.payfast.co.za | Submit onboarding form → verify redirect to PayFast → complete payment with test card 5200000000000015 → verify return to dashboard |
| Real ITN received from PayFast sandbox | PAY-03 | Requires publicly accessible Edge Function endpoint | After sandbox payment, check build_events for `itn_received` event within 60s |
| Build triggered by payment (not by form submit) | PAY-05 | Requires real payment flow | Verify no `build_start` event until after ITN COMPLETE |
| PAYFAST_PASSPHRASE not in browser bundle | PAY-09 | Requires full Vite build | `npm run build && grep -r 'PAYFAST' dist/` — expect 0 matches |
| PayFast sandbox credentials configured | PAY-01 | Account-specific | Verify PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE set in Edge Function secrets |

**Note:** PayFast sandbox does NOT support recurring billing testing. Recurring payment ITN handling (PAY-06, PAY-07) can only be verified via unit tests with crafted payloads.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
