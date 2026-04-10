# Phase 4: Payment Integration - Research

**Researched:** 2026-04-10
**Domain:** PayFast subscriptions, ITN webhooks, Supabase Edge Functions (Deno), PostgreSQL migrations
**Confidence:** MEDIUM-HIGH (PayFast developer docs require JS to render; findings cross-verified via official SDK/library sources, community libraries, and PayFast support articles)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Provider:** PayFast (Yoco is obsolete and must not appear anywhere)
- **Billing model:** PayFast native subscriptions (`subscription_type=1`)
- **Checkout:** Full redirect to PayFast hosted page — no in-page widget
- **Initial amount (`amount`):** Setup fee (R999 Starter, etc.) charged immediately
- **Recurring amount (`recurring_amount`):** R49/mo (4900 cents)
- **Frequency:** 3 (monthly)
- **Cycles:** 0 (indefinite)
- **`custom_str1`** carries `siteId` through the checkout flow — present in every ITN
- **ITN handler:** New Edge Function `supabase/functions/payfast-itn/index.ts`
- **Signature:** MD5 hash of sorted params + passphrase
- **Idempotency key:** `m_payment_id` — check against `orders.payment_id` before acting
- **Events handled:**
  - `payment_status = COMPLETE` + initial → insert subscription row, trigger `generate-site`
  - `payment_status = COMPLETE` + recurring → update `subscriptions.next_charge_at`
  - `payment_status = FAILED` → log failure, increment `failed_charge_count`
  - `payment_status = CANCELLED` → cancel subscription, invoke `suspend-site`
- **Build trigger:** OnboardingPage removes `build-site` invoke; ITN `COMPLETE` is the exclusive trigger
- **Retry:** PayFast handles retry (3 attempts over 10 days) — no server-side retry ladder needed for recurring payments
- **Suspend:** CANCELLED ITN → `suspend-site`
- **Reactivate:** New subscription COMPLETE → `reactivate-site`
- **Secrets:** `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_SANDBOX`
- **Sandbox:** `sandbox.payfast.co.za`
- **Migration:** Rename `orders.yoco_payment_id` → `orders.payment_id`; rename `subscriptions.yoco_token_id` → `subscriptions.payfast_subscription_id`; add `subscriptions.payfast_token`, `subscriptions.current_period_end TIMESTAMPTZ`, `subscriptions.failed_charge_count INT DEFAULT 0`
- **Pre-launch:** Safe to rename columns (no production data)

### Claude's Discretion
- PayFast redirect URL construction details
- Exact ITN param list and sorting implementation
- Error page design for failed payments
- Whether subscription cancel hits PayFast API immediately or queues
- PayFast API version and endpoint URLs

### Deferred Ideas (OUT OF SCOPE)
- Refund handling via PayFast API
- Invoice generation / PDF receipts
- Proration on plan change
- PayFast split payments
- Payment analytics dashboard
- Retry email notifications (Phase 6)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | PayFast merchant account configured with sandbox + production credentials; subscription feature enabled (no vendor contact blocker) | Sandbox credentials confirmed; subscription enabled via Dashboard settings (Add PassPhrase + Enable) |
| PAY-02 | OnboardingPage redirects to PayFast checkout with setup fee + R49/mo subscription; `custom_str1` carries siteId | Checkout URL/form parameters fully documented; `custom_str1`-5 confirmed available in checkout |
| PAY-03 | `payfast-itn` Edge Function verifies ITN signature (MD5 hash of sorted params + passphrase); rejects invalid signatures | Signature algorithm fully documented; Deno MD5 approach identified |
| PAY-04 | ITN handler is idempotent — duplicate notifications do not double-process (`m_payment_id` dedup) | `m_payment_id` is the correct dedup field; `pf_payment_id` is PayFast's own ID |
| PAY-05 | On initial payment COMPLETE, subscription row inserted; site build triggered via `generate-site` | ITN COMPLETE + initial detection pattern documented; `generate-site` invocation pattern established |
| PAY-06 | Recurring R49/mo handled by PayFast native subscriptions; ITN on each charge updates `next_charge_at` | Recurring ITN behavior documented; `token` field identifies subscription in recurring ITNs |
| PAY-07 | Failed payment retry by PayFast (3 attempts over 10 days); on CANCELLED ITN, site suspended via `suspend-site` | CANCELLED status confirmed; retry logic is PayFast-managed |
| PAY-08 | Customer can resubscribe via new PayFast checkout after cancellation; `reactivate-site` fires on new subscription COMPLETE | New checkout flow for reactivation is same as initial checkout |
| PAY-09 | All PayFast API calls and ITN verification inside Edge Functions — `PAYFAST_PASSPHRASE` never client-side | Edge Function secret pattern established; `verify_jwt = false` config for public webhook endpoint |
</phase_requirements>

---

## Summary

PayFast is South Africa's dominant payment gateway with well-documented subscription (recurring billing) and ITN (Instant Transaction Notification) features. The checkout flow is a standard HTML form POST redirect — the client side builds a form with all required parameters plus an MD5 signature, then redirects the browser to `https://www.payfast.co.za/eng/process` (or sandbox equivalent). PayFast handles the payment, then asynchronously POSTs `application/x-www-form-urlencoded` data to the merchant's `notify_url`.

The ITN handler must be a publicly accessible Supabase Edge Function (JWT verification disabled via `config.toml`). It receives form-urlencoded POST data, verifies the signature by recomputing an MD5 hash of alphabetically-sorted params + passphrase, then acts based on `payment_status`. Subscription ITNs carry a `token` field (the PayFast subscription token) that must be stored for cancel/pause API calls.

The key architectural insight: `amount` is the initial charge (setup fee), `recurring_amount` is the monthly charge — these can differ and both live in a single checkout request with `subscription_type=1`. PayFast fires COMPLETE ITNs for both initial and each subsequent recurring payment; the merchant distinguishes initial vs. recurring by checking whether a subscription row for that `custom_str1` (siteId) already exists.

**Primary recommendation:** Build the `payfast-itn` Edge Function first (the critical path), then update OnboardingPage to redirect instead of build. Use `npm:md5` or Deno's `std/encoding` for MD5 — `crypto.subtle` does not support MD5.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Deno std/crypto or `npm:md5` | Std 2.x / md5 1.3+ | MD5 hashing for signature verification | `crypto.subtle` does NOT support MD5; Deno std or npm:md5 are the alternatives |
| Supabase Edge Functions (Deno) | Existing | ITN webhook handler | Already established pattern in this codebase |
| `URLSearchParams` (Web API) | Built-in | Parse form-urlencoded ITN body | Standard Web API available in Deno — no library needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `_shared/supabase-admin.ts` | Existing | DB writes in ITN handler | Service role needed — ITN has no user JWT |
| `_shared/cors.ts` | Existing | Standard response helpers | Consistent with other Edge Functions |
| `encodeURIComponent` + `.replace(/%20/g, '+')` | Built-in | URL encoding for signature | PayFast requires `+` for spaces, not `%20` |

### No New npm Packages Required

The entire ITN handler can be built with:
- `URLSearchParams` to parse the body
- Deno's `std` hash module or `npm:md5` for MD5
- Existing shared utilities

**Installation (if using npm:md5 in Deno):**
```typescript
// In Edge Function — no package.json needed for Deno
import md5 from 'npm:md5'
```

Or using Deno std (preferred — no npm dependency):
```typescript
import { createHash } from 'https://deno.land/std@0.224.0/crypto/mod.ts'
// Note: std crypto exposes MD5 via createHash('md5')
```

---

## Architecture Patterns

### Recommended Project Structure Additions

```
supabase/
└── functions/
    ├── payfast-itn/         # NEW — ITN webhook handler (PAY-03 through PAY-07)
    │   └── index.ts
    ├── _shared/
    │   └── payfast.ts       # NEW — signature utils, URL builder (shared by itn + cancel)
    └── (existing functions unchanged)

supabase/
└── migrations/
    └── 007_payfast_schema.sql  # NEW — column renames + new subscription columns

src/
└── pages/
    ├── OnboardingPage.tsx    # MODIFY — remove build-site invoke, add PayFast redirect
    └── DashboardPage.tsx     # MODIFY — add subscription status, cancel, reactivate UI

supabase/
└── config.toml              # MODIFY — add [functions.payfast-itn] verify_jwt = false
```

### Pattern 1: PayFast Checkout Redirect (OnboardingPage → PayFast)

**What:** Build a form with all checkout params, generate MD5 signature, redirect browser via form POST
**When to use:** After OnboardingPage creates `orders` + `client_sites` rows with `payment_pending` status

```typescript
// Checkout URL construction (client-side, TypeScript)
// Source: django-payfast/api.py field order, official omnipay-payfast library

const PAYFAST_URL = import.meta.env.VITE_PAYFAST_SANDBOX === 'true'
  ? 'https://sandbox.payfast.co.za/eng/process'
  : 'https://www.payfast.co.za/eng/process'

function buildPayFastParams(opts: {
  merchantId: string
  merchantKey: string
  orderId: string       // m_payment_id — our order UUID
  siteId: string        // passed as custom_str1
  amountCents: number   // setup fee (e.g. 99900 for R999)
  userEmail: string
  userFirstName: string
  userLastName: string
  packageName: string   // item_name
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
  passphrase: string
}): Record<string, string> {
  // Amount must be formatted as decimal with 2 places: "999.00"
  const amount = (opts.amountCents / 100).toFixed(2)
  const recurringAmount = '49.00'  // R49/mo — always

  const params: Record<string, string> = {
    merchant_id:      opts.merchantId,
    merchant_key:     opts.merchantKey,
    return_url:       opts.returnUrl,
    cancel_url:       opts.cancelUrl,
    notify_url:       opts.notifyUrl,
    name_first:       opts.userFirstName,
    name_last:        opts.userLastName,
    email_address:    opts.userEmail,
    m_payment_id:     opts.orderId,
    amount:           amount,
    item_name:        `keep-hosting ${opts.packageName} subscription`,
    // Subscription fields
    subscription_type: '1',
    billing_date:     new Date().toISOString().split('T')[0], // YYYY-MM-DD — today
    recurring_amount: recurringAmount,
    frequency:        '3',   // monthly
    cycles:           '0',   // indefinite
    // Custom fields
    custom_str1:      opts.siteId,  // KEY: carried through every ITN
  }

  // Generate signature — alphabetical sort, exclude empty, include passphrase
  params.signature = generateSignature(params, opts.passphrase)
  return params
}
```

**CRITICAL:** The passphrase and merchant_key must NEVER be on the client side. The checkout redirect is the exception — the merchant_id and merchant_key ARE included in the form visible to the browser. However, the passphrase is only needed for server-side signature generation. For a React SPA doing client-side redirect, the signature must be generated server-side via an Edge Function, then the form params returned to the client for redirect. Alternatively, use a form POST from an intermediate server-rendered redirect page.

**Recommended implementation:** Create a `create-payfast-order` Edge Function that: receives the order details from OnboardingPage, creates the DB rows, generates the signature (using `PAYFAST_PASSPHRASE` secret), and returns the full parameter map to the client. OnboardingPage then auto-submits a hidden form to PayFast.

### Pattern 2: ITN Signature Verification (Deno Edge Function)

**What:** Verify PayFast's POST to `notify_url` — sort params alphabetically, build query string, MD5 hash, compare
**When to use:** Every inbound POST to `payfast-itn`

```typescript
// Source: django-payfast/api.py ITN field order, PayFast support articles, deanmalan.co.za

// ITN field order per PayFast (alphabetical is fine — use Object.keys().sort())
// Fields sent by PayFast in ITN (all present, some may be empty):
// m_payment_id, pf_payment_id, payment_status, item_name, item_description,
// amount_gross, amount_fee, amount_net, custom_str1-5, custom_int1-5,
// name_first, name_last, email_address, merchant_id, token (for subscriptions)

async function verifySignature(
  params: Record<string, string>,
  receivedSignature: string,
  passphrase: string,
): Promise<boolean> {
  // 1. Build param string: alphabetical sort, skip 'signature', skip empty values
  //    NOTE: ITN includes fields with empty values (unlike checkout)
  //    Use alphabetical sort — PayFast sorts alphabetically
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'signature')
    .sort()

  const parts = sortedKeys
    .filter(k => params[k] !== '' && params[k] !== undefined)
    .map(k => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`)

  // 2. Append passphrase
  parts.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`)

  const pfString = parts.join('&')

  // 3. MD5 hash — crypto.subtle does NOT support MD5; use npm:md5 or std
  const md5 = await import('npm:md5')
  const computed = md5.default(pfString).toLowerCase()

  return computed === receivedSignature.toLowerCase()
}
```

### Pattern 3: Form-Urlencoded Body Parsing in Deno

**What:** PayFast sends `Content-Type: application/x-www-form-urlencoded` — parse with URLSearchParams
**When to use:** Every ITN request

```typescript
// Source: Supabase Edge Function webhook pattern (confirmed via Supabase docs)
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  // PayFast ITN sends form-urlencoded, NOT JSON
  const rawBody = await req.text()
  const params: Record<string, string> = {}
  new URLSearchParams(rawBody).forEach((value, key) => {
    params[key] = value
  })

  // Now params['payment_status'], params['m_payment_id'], params['custom_str1'], etc.
})
```

### Pattern 4: ITN Handler — Full Processing Flow

```typescript
// payfast-itn/index.ts — conceptual flow
// Source: CONTEXT.md decisions + verified PayFast ITN field spec

async function handleItn(params: Record<string, string>, supabase: any) {
  const paymentStatus = params['payment_status']  // 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'PENDING'
  const mPaymentId   = params['m_payment_id']     // Our order UUID (idempotency key)
  const pfPaymentId  = params['pf_payment_id']    // PayFast's own transaction ID
  const siteId       = params['custom_str1']      // Our siteId
  const token        = params['token']            // PayFast subscription token (for recurring)
  const amountGross  = params['amount_gross']     // e.g. "999.00"

  // Idempotency check: has this m_payment_id already been processed?
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, payment_id')
    .eq('payment_id', mPaymentId)
    .maybeSingle()

  if (order?.status === 'paid' && paymentStatus === 'COMPLETE') {
    // Already processed — return 200 to prevent PayFast retry
    return jsonResponse({ ok: true, skipped: 'duplicate' })
  }

  if (paymentStatus === 'COMPLETE') {
    const isInitial = !order || order.status !== 'paid'

    if (isInitial) {
      // Update order → paid, insert subscription row, trigger generate-site
      await supabase.from('orders').update({ status: 'paid', payment_id: mPaymentId }).eq('id', order.id)
      await supabase.from('subscriptions').insert({
        user_id: /* from order */,
        order_id: order.id,
        plan: /* from order.package */,
        status: 'active',
        payfast_subscription_id: pfPaymentId,
        payfast_token: token,
        next_charge_at: /* compute from billing_date + 1 month */,
        amount_cents: 4900,
        failed_charge_count: 0,
      })
      // Fire-and-forget generate-site (same pattern as existing functions)
      supabase.functions.invoke('generate-site', { body: { siteId } }).catch(() => {})
    } else {
      // Recurring payment — just update next_charge_at
      await supabase.from('subscriptions')
        .update({ next_charge_at: computeNextCharge(), failed_charge_count: 0 })
        .eq('order_id', order.id)
    }

  } else if (paymentStatus === 'FAILED') {
    await supabase.from('subscriptions')
      .update({ status: 'grace_period' })
      .eq('order_id', order?.id)
    // Increment failed_charge_count via SQL or fetch+update

  } else if (paymentStatus === 'CANCELLED') {
    await supabase.from('subscriptions')
      .update({ status: 'cancelled', suspended_at: new Date().toISOString() })
      .eq('order_id', order?.id)
    supabase.functions.invoke('suspend-site', { body: { siteId } }).catch(() => {})
  }

  return jsonResponse({ ok: true })
}
```

### Pattern 5: Subscription Cancel API Call (merchant-initiated)

**What:** Customer clicks "Cancel" → keep-hosting calls PayFast API to cancel the subscription token
**When to use:** Customer-initiated cancellation from Dashboard

```typescript
// Source: Bubble forum discussion, PayFast SDK analysis
// Endpoint: PUT https://api.payfast.co.za/subscriptions/{token}/cancel?testing=true

async function cancelPayFastSubscription(token: string, isSandbox: boolean) {
  const baseUrl = isSandbox
    ? 'https://api.payfast.co.za'
    : 'https://api.payfast.co.za'  // Same base URL — testing flag is query param

  const url = `${baseUrl}/subscriptions/${token}/cancel${isSandbox ? '?testing=true' : ''}`

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00')
  const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')!
  const passphrase = Deno.env.get('PAYFAST_PASSPHRASE')!

  // API-level signature: sorted headers + body params + passphrase (same algorithm)
  const headerData = {
    'merchant-id': merchantId,
    'passphrase': passphrase,
    'timestamp': timestamp,
    'version': 'v1',
  }
  const signature = generateApiSignature(headerData)

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'merchant-id': merchantId,
      'version': 'v1',
      'timestamp': timestamp,
      'signature': signature,
    },
  })

  return res.ok
}
```

### Pattern 6: JWT Bypass for Public Webhook

**What:** PayFast cannot include a Supabase JWT — the Edge Function must be publicly accessible
**When to use:** `payfast-itn` function only

```toml
# supabase/config.toml — add this section
[functions.payfast-itn]
verify_jwt = false
```

**Deploy flag equivalent:**
```bash
supabase functions deploy payfast-itn --no-verify-jwt
```

### Anti-Patterns to Avoid

- **`await req.json()` in payfast-itn:** PayFast sends `application/x-www-form-urlencoded`, not JSON. Using `req.json()` throws a parse error.
- **Including `signature` in signature computation:** The received `signature` field must be excluded when recomputing the hash.
- **Using `%20` for spaces:** PayFast requires `+` for spaces — use `encodeURIComponent().replace(/%20/g, '+')`
- **`crypto.subtle` for MD5:** Web Crypto API does not support MD5 (considered cryptographically weak). Use `npm:md5` or Deno std.
- **Generating signature client-side:** The `PAYFAST_PASSPHRASE` must never be in the browser bundle. Use an Edge Function for signature generation.
- **Building checkout from client-side only:** `merchant_key` and `merchant_id` appear in the form, but passphrase must be server-side. Use a `create-payfast-order` Edge Function.
- **Not returning HTTP 200 from ITN handler:** PayFast will retry if it doesn't receive a 200 OK. Always return 200 even for duplicate/invalid ITNs (after logging).
- **Empty passphrase in production:** If passphrase field is empty string, including it breaks the signature. Only append passphrase if it's non-empty.
- **Trusting ITN without signature verification:** Never act on an ITN before verifying the signature — an attacker could POST a fake COMPLETE.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form-urlencoded parsing | Custom parser | `new URLSearchParams(rawBody)` | Web standard, handles edge cases |
| MD5 hashing | Custom hash | `npm:md5` or Deno std hash | MD5 edge cases (encoding, input types) |
| PayFast checkout URL | None needed | Direct form params + signature | PayFast is the hosted page provider |
| Retry logic for recurring | Retry scheduler | PayFast native (3 attempts/10 days) | Already built into PayFast subscription |
| Subscription lifecycle | State machine | PayFast ITN-driven state changes | PayFast manages the schedule; we react |

**Key insight:** PayFast's native subscriptions handle the retry ladder, the billing schedule, and subscription cancellation after exhausted retries. The server-side job is only to react to ITN events correctly.

---

## Common Pitfalls

### Pitfall 1: MD5 Signature Mismatch
**What goes wrong:** ITN signature verification always fails, all payments are rejected.
**Why it happens:** Four documented causes: (1) wrong passphrase, (2) wrong field order, (3) `%20` vs `+` encoding, (4) including empty-string fields when they should be excluded (or vice versa — checkout excludes empty fields, ITN includes them).
**How to avoid:** Log the exact string being hashed (with passphrase redacted) to `build_events` during development. Compare character-by-character against what PayFast hashed.
**Warning signs:** Every ITN returns 400; PayFast dashboard shows "Invalid Signature" errors.

### Pitfall 2: Sandbox Cannot Test Recurring Billing
**What goes wrong:** You test the recurring billing flow in sandbox and it never fires.
**Why it happens:** PayFast sandbox explicitly does not support recurring billing — only once-off payments can be tested.
**How to avoid:** Test initial payment flow in sandbox. Test recurring ITN handling with a manually crafted POST (unit test with known-good signature). Accept that recurring billing can only be fully validated in production with a real subscription.
**Warning signs:** Sandbox subscription never sends a second COMPLETE ITN.

### Pitfall 3: ITN Validation Endpoint 403 Errors
**What goes wrong:** The optional PayFast server-confirmation call (`eng/query/validate`) returns 403.
**Why it happens:** Starting around August 2024, PayFast's validation endpoint began returning 403 for some configurations. This is a known ongoing issue.
**How to avoid:** Do not rely on the `eng/query/validate` call as the primary verification. Use signature verification + IP whitelisting + amount matching as the three-factor check instead. Skip the fourth-factor server confirmation.
**Warning signs:** Integration looks correct but `eng/query/validate` returns 403.

### Pitfall 4: PayFast IP Range Changes (AWS Migration)
**What goes wrong:** After July 2025, ITN source IP validation fails because PayFast migrated to AWS.
**Why it happens:** PayFast completed AWS migration by July 31, 2025, introducing new IP ranges (3.163.236.x range in AWS).
**How to avoid:** Do NOT use static IP allowlisting as the primary security measure. Use signature verification as the primary check. If you do IP-check, resolve DNS A records for `www.payfast.co.za` and `api.payfast.co.za` dynamically rather than hardcoding IPs.
**Warning signs:** ITN handler rejects valid PayFast notifications after July 2025.

### Pitfall 5: Passphrase in Production vs. Sandbox
**What goes wrong:** Signature works in sandbox but fails in production (or vice versa).
**Why it happens:** Sandbox and production use separate merchant credentials and separate passphrases. The `PAYFAST_PASSPHRASE` secret must match exactly what is configured in the PayFast account (live vs. sandbox dashboard). The passphrase "may consist only of letters, numbers and `-_/`".
**How to avoid:** Use `PAYFAST_SANDBOX=true/false` to toggle the endpoint URL. Keep `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, and `PAYFAST_PASSPHRASE` as separate secrets per environment (Supabase supports environment-specific secrets via preview branches).
**Warning signs:** `Merchant authorization failed` 401 responses from PayFast API calls.

### Pitfall 6: Distinguishing Initial vs. Recurring COMPLETE ITNs
**What goes wrong:** Every COMPLETE ITN triggers a new site build, even monthly recurring payments.
**Why it happens:** PayFast sends COMPLETE for both initial and recurring — there is no `is_initial` flag in the ITN payload.
**How to avoid:** After processing the initial COMPLETE, the subscription row exists. On every subsequent COMPLETE for the same `custom_str1` (siteId), check if `subscriptions` row already exists with `status = 'active'`. If yes → recurring → only update `next_charge_at`, do NOT trigger `generate-site`.
**Warning signs:** Claude is called on every monthly payment, generating new sites.

### Pitfall 7: OnboardingPage Still Has the Direct Build Trigger
**What goes wrong:** Sites build without payment verification.
**Why it happens:** Line 208 of `OnboardingPage.tsx` currently fires `supabase.functions.invoke('build-site', ...)`. This must be removed in Phase 4.
**How to avoid:** Remove the `supabase.functions.invoke('build-site', ...)` fire-and-forget call. Replace with PayFast redirect. The `build-site` shim from Phase 2 is irrelevant — delete that invocation entirely.
**Warning signs:** Dashboard shows "Building" before payment is confirmed.

### Pitfall 8: Column Rename Breaks TypeScript Types
**What goes wrong:** TypeScript compilation fails after migration because `database.ts` still references `yoco_payment_id` and `yoco_token_id`.
**Why it happens:** `database.ts` is hand-maintained and must be updated alongside the migration.
**How to avoid:** Update `src/types/database.ts` in the same PR/plan that applies the migration. Remove `yoco_payment_id`, add `payment_id`. Remove `yoco_token_id`, add `payfast_subscription_id` and `payfast_token`. Also add `current_period_end`, `failed_charge_count`.
**Warning signs:** `Property 'yoco_payment_id' does not exist` TypeScript errors after migration.

### Pitfall 9: `config.toml` `verify_jwt = false` Not Applied
**What goes wrong:** PayFast ITN POSTs to the Edge Function get 401 Unauthorized (no JWT in PayFast requests).
**Why it happens:** Supabase Edge Functions require JWT by default. The config.toml change or `--no-verify-jwt` deploy flag must be applied.
**How to avoid:** Add `[functions.payfast-itn] verify_jwt = false` to `supabase/config.toml` before deploying. Re-deploy the function after the config change.
**Warning signs:** PayFast dashboard shows ITN delivery failures; function logs show 401 responses.

---

## Code Examples

### PayFast Signature Generation (TypeScript/Deno)

```typescript
// Source: deanmalan.co.za verified against django-payfast/api.py and dev.to/greggcbs article
// Works for both checkout signature AND API header signature

import md5 from 'npm:md5'

export function generatePayFastSignature(
  params: Record<string, string>,
  passphrase: string,
): string {
  // 1. Sort alphabetically, exclude 'signature', exclude empty values
  const sortedKeys = Object.keys(params)
    .filter(k => k !== 'signature' && params[k] !== '' && params[k] !== undefined)
    .sort()

  // 2. Build key=value pairs with URL encoding (spaces → '+')
  const parts = sortedKeys.map(k =>
    `${k}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`
  )

  // 3. Append passphrase (only if non-empty)
  if (passphrase) {
    parts.push(`passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`)
  }

  // 4. MD5 hash, lowercase
  return md5(parts.join('&')).toLowerCase()
}
```

### Parsing Form-Urlencoded in Deno Edge Function

```typescript
// Source: Supabase Edge Function webhook pattern
const rawBody = await req.text()
const params: Record<string, string> = {}
new URLSearchParams(rawBody).forEach((value, key) => {
  params[key] = value
})
// params['payment_status'] === 'COMPLETE'
// params['custom_str1'] === siteId
// params['token'] === payfast_subscription_token
// params['m_payment_id'] === our order UUID
```

### Migration 007: PayFast Schema Update

```sql
-- Migration 007: PayFast schema (Phase 4 PAY)
-- Rename Yoco columns, add PayFast-specific columns.
-- Pre-launch: no production data, safe to rename.

-- Rename orders.yoco_payment_id → orders.payment_id
ALTER TABLE public.orders
  RENAME COLUMN yoco_payment_id TO payment_id;

-- Drop old index, recreate with new column name
DROP INDEX IF EXISTS idx_orders_yoco_payment_id;
CREATE INDEX IF NOT EXISTS idx_orders_payment_id
  ON public.orders(payment_id) WHERE payment_id IS NOT NULL;

-- Rename subscriptions.yoco_token_id → subscriptions.payfast_subscription_id
ALTER TABLE public.subscriptions
  RENAME COLUMN yoco_token_id TO payfast_subscription_id;

-- Add new PayFast-specific subscription columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token           TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_charge_count     INT NOT NULL DEFAULT 0;

-- Update subscriptions status enum to add 'cancelling'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'grace_period', 'cancelling', 'suspended', 'cancelled'));
```

### config.toml ITN Function Configuration

```toml
# supabase/config.toml — add below existing project_id line
[functions.payfast-itn]
verify_jwt = false
```

### PayFast Checkout URL Structure

```
Production: https://www.payfast.co.za/eng/process
Sandbox:    https://sandbox.payfast.co.za/eng/process

Form fields (all must be included as hidden inputs, POST method):
  merchant_id       — from PAYFAST_MERCHANT_ID (server env)
  merchant_key      — from PAYFAST_MERCHANT_KEY (server env, NOT secret)
  return_url        — e.g. https://keep-hosting.app/dashboard
  cancel_url        — e.g. https://keep-hosting.app/dashboard?cancelled=1
  notify_url        — e.g. https://{project}.supabase.co/functions/v1/payfast-itn
  name_first        — customer first name
  name_last         — customer last name
  email_address     — customer email
  m_payment_id      — our order UUID (stored in orders.id)
  amount            — setup fee as decimal: "999.00" (Starter) — NOT cents
  item_name         — "keep-hosting starter subscription"
  subscription_type — "1"
  billing_date      — YYYY-MM-DD (today's date)
  recurring_amount  — "49.00"
  frequency         — "3" (monthly)
  cycles            — "0" (indefinite)
  custom_str1       — siteId (our UUID for this site)
  signature         — MD5 hash (generated server-side)
```

### PayFast Subscription Cancel API

```
Method: PUT
URL: https://api.payfast.co.za/subscriptions/{token}/cancel
     (append ?testing=true for sandbox)

Required headers:
  merchant-id:  {PAYFAST_MERCHANT_ID}
  version:      v1
  timestamp:    {ISO8601 without ms, e.g. "2026-04-10T14:30:00+00:00"}
  signature:    {MD5 of sorted header params + passphrase}

The API signature uses the same algorithm as checkout/ITN signatures:
  Sort headers alphabetically (excluding 'signature'),
  build key=encoded_value& string,
  append passphrase,
  MD5 hash.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Yoco payment intent | PayFast hosted checkout redirect | 2026-04-10 (this project) | Removes vendor-contact blocker; fully documented |
| Yoco webhook HMAC | PayFast ITN MD5 signature | 2026-04-10 (this project) | Different algorithm; MD5 not HMAC-SHA256 |
| `build-site` invoked by OnboardingPage | `generate-site` invoked by `payfast-itn` | Phase 4 | Payment becomes master build trigger |
| PayFast `eng/query/validate` server confirmation | Signature-only verification (skip 4th check) | Aug 2024 | Validation endpoint returning 403; signature + amount matching is sufficient |
| Static PayFast IP whitelist | DNS-based or skip IP check | Jul 2025 | AWS migration changed IPs; DNS records are authoritative |

**Deprecated/outdated:**
- `orders.yoco_payment_id` column → renamed to `payment_id`
- `subscriptions.yoco_token_id` column → renamed to `payfast_subscription_id`
- `build-site` invocation from `OnboardingPage.tsx` (line 208) → must be removed

---

## Open Questions

1. **Passphrase requirement for subscriptions**
   - What we know: Recurring billing requires a passphrase set in PayFast Dashboard (Settings → Integration → Add PassPhrase)
   - What's unclear: Whether sandbox also requires this, and what error appears if not set
   - Recommendation: Set passphrase in sandbox dashboard before testing; store value in `PAYFAST_PASSPHRASE` secret; document this in the human-verify checkpoint

2. **Recurring COMPLETE ITN timing**
   - What we know: PayFast fires COMPLETE on each recurring charge; `token` is the subscription identifier
   - What's unclear: Exact field that distinguishes initial from recurring in the ITN body (there is no explicit `is_initial` field)
   - Recommendation: Detect initial vs. recurring by checking if subscription row exists for `custom_str1`/siteId — if not exists → initial; if exists + active → recurring

3. **PayFast retry behavior (FAILED ITN count)**
   - What we know: PayFast retries failed recurring payments; subscription is cancelled after retries exhausted, firing CANCELLED ITN
   - What's unclear: Whether PayFast sends a FAILED ITN for each retry attempt or only on final failure
   - Recommendation: Treat every FAILED ITN as a retry event; increment `failed_charge_count`; let PayFast send CANCELLED when fully exhausted

4. **Client-side vs server-side checkout construction**
   - What we know: Passphrase must not be client-side; merchant_id/key are in the form visible to browser
   - What's unclear: Whether React SPA should have a `create-payfast-order` Edge Function or build the checkout form params client-side (with passphrase on server only)
   - Recommendation: Create a `create-payfast-order` Edge Function that creates DB rows AND returns the pre-signed parameter set. OnboardingPage calls this function, receives params, auto-submits hidden form. This keeps passphrase server-side and is the cleanest pattern.

5. **`billing_date` impact on first charge**
   - What we know: `billing_date` format is YYYY-MM-DD; setting it to today means the recurring amount starts next month
   - What's unclear: If `billing_date` is today and customer pays the setup fee (initial `amount`) immediately, does the first `recurring_amount` charge fire in exactly 1 month?
   - Recommendation: Set `billing_date` to today. The initial `amount` charge fires immediately; subsequent charges fire monthly from `billing_date`. This is the expected behavior per documentation.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured in Phase 1; vitest.config.ts exists) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --reporter=verbose src/__tests__/payfast-itn.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PAY-03 | ITN signature verification rejects bad signature | unit | `npm test -- src/__tests__/payfast-itn.test.ts` | ❌ Wave 0 |
| PAY-04 | Duplicate m_payment_id is detected and skipped | unit | `npm test -- src/__tests__/payfast-itn.test.ts` | ❌ Wave 0 |
| PAY-05 | COMPLETE ITN for initial payment triggers build | unit | `npm test -- src/__tests__/payfast-itn.test.ts` | ❌ Wave 0 |
| PAY-06 | COMPLETE ITN for recurring payment updates next_charge_at only | unit | `npm test -- src/__tests__/payfast-itn.test.ts` | ❌ Wave 0 |
| PAY-07 | CANCELLED ITN invokes suspend-site | unit | `npm test -- src/__tests__/payfast-itn.test.ts` | ❌ Wave 0 |
| PAY-02 | Checkout params include correct subscription fields | unit | `npm test -- src/__tests__/payfast-checkout.test.ts` | ❌ Wave 0 |
| PAY-09 | PAYFAST_PASSPHRASE never in browser bundle | build scan | `npm run build && grep -r 'PAYFAST_PASSPHRASE' dist/` | manual |
| PAY-01 | Sandbox merchant credentials configured | manual/smoke | Human-verify checkpoint | manual |

**Note:** REQUIREMENTS.md TEST-01 (Vitest suite) is Phase 6. However, the pattern from Phase 2 is to create stub test files early (`it.todo()`) so the suite can run without failing. Phase 4 should create stub files with `it.todo()` in Wave 0, then fill them in Wave 2.

### Sampling Rate
- **Per task commit:** `npm test -- src/__tests__/payfast-itn.test.ts src/__tests__/payfast-checkout.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/payfast-itn.test.ts` — covers PAY-03, PAY-04, PAY-05, PAY-06, PAY-07
- [ ] `src/__tests__/payfast-checkout.test.ts` — covers PAY-02 (signature generation, param structure)
- [ ] `supabase/functions/__tests__/payfast-itn.test.ts` — if Edge Function unit testing desired

---

## Sources

### Primary (HIGH confidence)
- `github.com/PiDelport/django-payfast` — ITN field order, empty-value handling distinction checkout vs ITN, signature algorithm
- `pub.dev/documentation/payfast/latest/` — Frequency table (1=Daily…6=Annually), subscription_type=1 vs 2, field names
- `support.payfast.help` (sandbox article) — Default sandbox credentials (merchant_id: 10004002, key: q1cd2rdny4a53, passphrase: payfast); sandbox limitation: no recurring billing testing
- `support.payfast.help` (IP whitelisting) — AWS migration July 2025, new IP ranges, DNS-based recommendation
- `support.payfast.help` (initial amount article) — `amount` vs `recurring_amount`; initial can be zero; recurring must be ≥ R5
- `supabase.com/docs/guides/functions/function-configuration` — `verify_jwt = false` config.toml syntax

### Secondary (MEDIUM confidence)
- `github.com/thephpleague/omnipay-payfast` — checkout parameter list (merchant_id, merchant_key, return/cancel/notify URLs, buyer details, transaction fields, custom fields, subscription fields)
- `dev.to/greggcbs` — Node.js signature generation algorithm (headers + body combined, sorted keys, encodeURIComponent + replace %20, MD5)
- `deanmalan.co.za` — Python signature algorithm; critical bugs in official PayFast sample code; field ordering priority
- `forum.bubble.io` — PayFast cancel subscription PUT endpoint: `https://api.payfast.co.za/subscriptions/{token}/cancel`
- Multiple PayFast SDK libraries (omnipay-payfast, io-digital/payfast, tpg/payfast) — corroborated ITN field names and processing steps
- `wordpress.org/support` (validation endpoint 403) — `eng/query/validate` returning 403 since Aug 2024; signature-based verification is sufficient

### Tertiary (LOW confidence — needs validation)
- PayFast retry logic specifics (3 attempts, 10 days) — mentioned in CONTEXT.md decisions but not found in official docs during research; treat as working assumption pending verification against PayFast dashboard behavior
- `payment_status = 'PENDING'` meaning — referenced in some libraries but not clearly documented; may mean payment in progress at PayFast rather than a terminal state

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Deno URLSearchParams + npm:md5 are verified approaches; no ambiguity
- PayFast checkout parameters: HIGH — cross-verified across 5+ independent libraries and official Omnipay integration
- ITN field list: HIGH — verified in django-payfast source which matches ITN specification precisely
- Signature algorithm: HIGH — three independent sources agree on sort + encode + passphrase + MD5 steps
- Subscription cancel API: MEDIUM — endpoint URL confirmed; exact signature construction for API headers inferred from multiple sources
- Sandbox behavior: HIGH — official PayFast support article confirms no recurring billing in sandbox
- Retry logic details: LOW — assumption from CONTEXT.md; official docs not accessible (JS-rendered)
- `payment_status` values: MEDIUM-HIGH — COMPLETE/FAILED/CANCELLED confirmed across multiple libraries; PENDING behavior less certain

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (90 days — PayFast API is stable; IP ranges recently migrated)
