# Phase 4: Payment Integration - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Gathering mode:** Claude's judgment (user delegated) + one major decision change

<domain>
## Phase Boundary

Wire PayFast (not Yoco — switched during this discussion) for one-time setup fee + R49/mo recurring subscription. Payment success becomes the master build trigger. Handle failed payments, cancellations, and subscription lifecycle.

**DECISION CHANGE:** Yoco → PayFast. PayFast has documented recurring billing (native subscriptions), well-documented ITN (webhooks), and a full sandbox environment. This removes the PAY-01 vendor-contact blocker that existed for Yoco. PROJECT.md and REQUIREMENTS.md must be updated to reflect this change.

**Entry point:** Customer submits onboarding form → redirected to PayFast checkout.
**Exit point:** Payment confirmed via ITN → site build triggered → customer sees "Building" on dashboard.

**Explicitly in scope:**
- PayFast checkout integration (setup fee + subscription in one flow)
- PayFast ITN (webhook) handler Edge Function
- Subscription lifecycle (create, renew, fail, cancel, suspend site, reactivate)
- Payment becomes the exclusive build trigger (replace the current direct `build-site` invoke from OnboardingPage)
- Update `subscriptions` table to use PayFast fields
- PayFast sandbox testing
- Update PROJECT.md and REQUIREMENTS.md (Yoco → PayFast)

**Explicitly out of scope:**
- Domain registration payment — Phase 5
- Admin billing dashboard — Phase 6
- Refund handling — post-launch (manual via PayFast dashboard for now)
- Invoice generation — post-launch

</domain>

<decisions>
## Implementation Decisions

### Provider: PayFast (replacing Yoco)

- **PayFast** selected over Yoco because:
  - Recurring billing is a documented, built-in feature (not unconfirmed like Yoco)
  - ITN (Instant Transaction Notification) webhooks are well-documented with clear signature verification
  - Full sandbox environment at `sandbox.payfast.co.za` for testing
  - Subscription management (cancel, pause) via API
  - Widest SA online recurring billing adoption
- Secrets needed: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX` (true/false)

### Billing Model: PayFast Native Subscriptions

- Use PayFast's built-in subscription feature (`subscription_type=1`)
- **One checkout flow** handles both the setup fee and the recurring subscription:
  - `amount` = setup fee (varies by package: R999 Starter, etc.) — charged immediately as the initial payment
  - `recurring_amount` = R49/mo (4900 cents)
  - `frequency` = 3 (monthly)
  - `cycles` = 0 (indefinite until cancelled)
- PayFast handles the monthly charge, retry logic (3 attempts over 10 days), and cancellation if all retries fail
- We receive ITN notifications for every event (success, failure, cancellation)

### Checkout Flow

1. Customer fills onboarding form (business details, logo, package selection)
2. Customer submits → `client_sites` row created with `build_status = 'pending'`, `orders` row created with `status = 'payment_pending'`
3. **Customer is redirected to PayFast checkout** (not an in-page widget — full redirect to PayFast hosted page)
4. Customer pays on PayFast's secure page
5. PayFast redirects customer back to keep-hosting dashboard (`return_url`)
6. PayFast sends ITN to our Edge Function (`notify_url`)
7. ITN handler verifies signature, processes the payment, triggers the build

### ITN (Webhook) Handler: `payfast-itn` Edge Function

- **New Edge Function:** `supabase/functions/payfast-itn/index.ts`
- Verifies ITN using PayFast's standard signature verification:
  1. Sort all received params alphabetically (excluding `signature`)
  2. URL-encode and concatenate as `key=value&key=value`
  3. Append `&passphrase={PAYFAST_PASSPHRASE}`
  4. MD5 hash → compare with received `signature`
- **Idempotent:** check `m_payment_id` (PayFast's unique payment ID) against `orders.payment_id` before processing. Duplicate ITNs are logged but not re-processed.
- **Event handling:**
  - `payment_status = COMPLETE` + initial payment → update `orders.status = 'paid'`, create `subscriptions` row, trigger site build via `generate-site`
  - `payment_status = COMPLETE` + recurring → update `subscriptions.next_charge_at`, log to `build_events`
  - `payment_status = FAILED` → log failure, update `subscriptions.status` to track failure count
  - `payment_status = CANCELLED` → cancel subscription, suspend site via `suspend-site`

### Payment as Master Build Trigger

- **OnboardingPage no longer calls `build-site` directly.** The `supabase.functions.invoke('build-site', ...)` fire-and-forget at line 208 is removed.
- Instead: OnboardingPage creates the order + client_sites rows, redirects to PayFast checkout. The build only starts when the ITN handler receives `COMPLETE` for the initial payment.
- This enforces: no payment = no build = no Claude API cost.

### Subscription Lifecycle

| Event | Action |
|-------|--------|
| Initial payment COMPLETE | Create subscription, trigger `generate-site` |
| Recurring payment COMPLETE | Update `next_charge_at`, no action needed |
| Recurring payment FAILED | Log failure, send notification (Phase 6), wait for PayFast retry |
| All retries exhausted → CANCELLED | Set `subscriptions.status = 'cancelled'`, invoke `suspend-site` |
| Customer manual cancel | Set `subscriptions.status = 'cancelling'`, site stays live until end of billing period, then suspend |
| Customer resubscribes | New PayFast subscription via checkout, invoke `reactivate-site` |

### Failed Payment Handling

- **PayFast handles retry** — 3 attempts over 10 days for recurring subscription charges
- On each FAILED ITN: log to `build_events`, update `subscriptions.failed_charge_count`
- After final failure → PayFast auto-cancels the subscription → CANCELLED ITN → invoke `suspend-site`
- Customer can resubscribe via a "Reactivate" button on the dashboard that starts a new PayFast checkout

### Cancellation

- Customer clicks "Cancel subscription" → keep-hosting calls PayFast cancel subscription API
- Subscription status changes to `cancelling`
- Site remains live until `subscriptions.current_period_end` (they've paid for this month)
- After period ends: `suspend-site` fires (either via pg_cron check or PayFast CANCELLED ITN)
- Customer can resubscribe anytime → new PayFast checkout → `reactivate-site`

### Migration: Yoco → PayFast Column Rename

- Rename `orders.yoco_payment_id` → `orders.payment_id` (generic — works for any provider)
- Rename `subscriptions.yoco_token_id` → `subscriptions.payfast_subscription_id`
- Add `subscriptions.payfast_token` for the PayFast subscription token
- Add `subscriptions.current_period_end` TIMESTAMPTZ
- Add `subscriptions.failed_charge_count` INT DEFAULT 0
- Pre-launch: safe to rename columns since no production data matters

### PayFast Sandbox Testing

- PayFast provides a full sandbox at `sandbox.payfast.co.za`
- Sandbox merchant credentials are separate from production
- Use `PAYFAST_SANDBOX=true` to toggle between sandbox and production URLs in the Edge Function
- Test cards available for success/failure scenarios

### Dashboard Changes

- OnboardingPage: remove `build-site` invoke, add PayFast redirect
- DashboardPage: add "Cancel subscription" button, "Reactivate" button (when suspended), subscription status display
- New page or modal: payment history (list of ITN events for the subscription)

### Claude's Discretion

- PayFast redirect URL construction details
- Exact ITN param list and sorting implementation
- Whether to use PayFast's `custom_str1`..`custom_str5` fields for passing siteId/orderId
- Error page design for failed payments
- Whether subscription cancel hits PayFast API immediately or queues
- PayFast API version and endpoint URLs (documented in their developer docs)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `supabase/functions/_shared/supabase-admin.ts` — service role client for DB access
- `supabase/functions/_shared/cors.ts` — CORS + JSON response helpers
- `supabase/functions/generate-site/index.ts` — build trigger (ITN handler invokes this)
- `supabase/functions/suspend-site/index.ts` — suspension (CANCELLED ITN invokes this)
- `supabase/functions/reactivate-site/index.ts` — reactivation (new subscription invokes this)
- `subscriptions` table (migration 003) — needs column renames + additions
- `orders` table — has `yoco_payment_id` column that needs renaming
- `src/pages/OnboardingPage.tsx` — needs PayFast redirect instead of direct build-site invoke
- `src/pages/DashboardPage.tsx` — needs subscription management UI

### Established Patterns

- Edge Function fire-and-forget via `EdgeRuntime.waitUntil()` — use for ITN → generate-site chain
- `build_events` for pipeline observability — log all payment events
- `build_status` state machine on `client_sites` — payment events trigger transitions

### Integration Points

- **Entry:** PayFast redirects customer to `return_url` (keep-hosting dashboard)
- **ITN endpoint:** `POST /functions/v1/payfast-itn` — PayFast POSTs form-urlencoded data
- **Build trigger:** ITN handler → `generate-site` (replaces OnboardingPage direct invoke)
- **Suspend trigger:** ITN CANCELLED → `suspend-site`
- **Reactivate trigger:** New subscription COMPLETE → `reactivate-site`
- **Dashboard:** subscription status, cancel button, reactivate flow

</code_context>

<specifics>
## Specific Ideas

- PayFast ITN sends `application/x-www-form-urlencoded` (NOT JSON) — the Edge Function must parse form data, not `req.json()`
- PayFast's `custom_str1` field is perfect for passing the `siteId` through the checkout flow — it's returned in every ITN notification
- The setup fee amount comes from `PACKAGES` array in OnboardingPage — needs to be passed to the PayFast checkout URL
- PayFast sandbox has test card numbers for success/failure — document these in the human-verify checkpoint

</specifics>

<deferred>
## Deferred Ideas

- **Refund handling via PayFast API** — manual refunds via PayFast dashboard for launch. Programmatic refunds are a post-launch feature.
- **Invoice generation / PDF receipts** — not needed for launch. PayFast sends payment confirmation emails automatically.
- **Proration on plan change** — no plan changes in v1 (single R49/mo tier). Defer to v2 when pricing tiers exist.
- **PayFast split payments** — if keep-hosting wants to split revenue with partners. Not relevant for launch.
- **Payment analytics dashboard** — Phase 6 (admin observability) can surface payment metrics.
- **Retry email notifications** — Phase 6 (transactional email) handles customer communication on failed payments.

</deferred>

---

*Phase: 04-payment-integration*
*Context gathered: 2026-04-10*
