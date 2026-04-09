# Architecture Patterns

**Domain:** Automated AI web-design agency (keep-hosting)
**Researched:** 2026-04-09
**Focus:** How to integrate Claude API, Netlify API, ZADOMAINS API, and Yoco into the existing React/Supabase foundation — specifically the async multi-step customer lifecycle from order to live hosted site.

---

## Recommended Architecture

The existing foundation (React SPA + Supabase Edge Functions) is the right shape. The missing integrations slot into it cleanly, but they require discipline around three architectural concerns that the current code does not yet address:

1. All external API calls (Claude, Netlify, ZADOMAINS, Yoco) must run inside Edge Functions — never the browser client.
2. The build pipeline is long-running and multi-step, so it needs an async job model with explicit state, not a single synchronous HTTP call.
3. Webhook endpoints (Yoco, Netlify build events) are inbound from external services and must be Supabase Edge Functions with signature verification.

---

## Component Boundaries

```
Browser (React SPA)
  │  User-facing UI only. No external API keys. No direct calls to
  │  Claude/Netlify/ZADOMAINS/Yoco endpoints.
  │
  │  Communicates with:
  ├──► Supabase Auth (JWT session management, client-side)
  ├──► Supabase DB (anon key, RLS-gated reads of own rows)
  ├──► Supabase Realtime (subscribe to own order/site rows for status updates)
  └──► Supabase Edge Functions (authenticated POST to trigger pipeline steps)
        │
        │  All secret keys live here (Deno.env). Never in VITE_* vars.
        │
        ├── build-site/         (existing — Claude + Netlify via GitHub)
        │     Extend: remove GitHub intermediary, deploy files directly
        │     to Netlify via zip-deploy API. Retain job state machine.
        │
        ├── domain-search/      (existing — replace DNS hack with ZADOMAINS)
        │     Replace: call ZADOMAINS SOAP/REST availability endpoint.
        │     Key: ZADOMAINS_API_KEY in Deno.env.
        │
        ├── domain-register/    (new)
        │     Triggered by: client approval after payment confirmed.
        │     Calls: ZADOMAINS registration API.
        │     Updates: client_sites.domain_status, orders.status.
        │
        ├── netlify-domain/     (new)
        │     Triggered by: domain_status = 'registered'.
        │     Calls: Netlify custom domain attachment API.
        │     Updates: client_sites (custom_domain, live_url).
        │
        ├── yoco-checkout/      (new)
        │     Triggered by: client clicking "Pay" in the React SPA.
        │     Creates a Yoco payment session/token.
        │     Returns: redirect URL or inline payment token to client.
        │     Key: YOCO_SECRET_KEY in Deno.env.
        │
        ├── yoco-webhook/       (new — inbound from Yoco)
        │     Receives: payment.succeeded, payment.failed, subscription.*
        │     Verifies: Yoco HMAC signature header.
        │     Triggers: order status transitions, build pipeline start,
        │               site suspension/reactivation.
        │     No auth JWT required (external webhook). Signature check instead.
        │
        └── build-events/       (new or extended)
              Supabase Realtime on build_events table replaces client polling.
              Edge Functions INSERT into build_events; client subscribes.
```

### Where each API key lives

| Service | Key name | Location | Never in |
|---------|----------|----------|---------|
| Anthropic Claude | `ANTHROPIC_API_KEY` | Supabase Edge Function env | Browser, `.env` VITE_ prefix |
| Netlify | `NETLIFY_PAT` | Supabase Edge Function env | Browser |
| ZADOMAINS | `ZADOMAINS_API_KEY` (+ username/password per their API) | Supabase Edge Function env | Browser |
| Yoco | `YOCO_SECRET_KEY` | Supabase Edge Function env | Browser |
| Yoco | `YOCO_WEBHOOK_SECRET` | Supabase Edge Function env (webhook verification) | Browser |
| Supabase service role | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Edge Function env | Browser, source code |
| Supabase anon key | `VITE_SUPABASE_ANON_KEY` | React `.env` (VITE_ prefix) | Hardcoded in source |

---

## Data Flow: Customer Lifecycle

### Step-by-step with component ownership

```
1. LANDING / DOMAIN SEARCH
   Browser → Edge Function: domain-search
   domain-search → ZADOMAINS availability API
   Result returned to browser, pre-fills onboarding form

2. ONBOARDING FORM SUBMISSION
   Browser → Supabase DB (anon key, RLS)
     INSERT orders (status: 'pending')
     INSERT client_sites (build_status: 'pending')
     INSERT file_uploads (logo, hero to Supabase Storage)
   Browser receives order_id + site_id

3. PAYMENT INITIATION
   Browser → Edge Function: yoco-checkout (authenticated, passes order_id)
   yoco-checkout → Yoco API: create checkout session
   Returns: payment URL or inline token
   Browser: redirect to Yoco hosted checkout OR render Yoco inline widget
   DB: orders.status = 'payment_pending'

4. PAYMENT CONFIRMATION (async — inbound webhook)
   Yoco → Edge Function: yoco-webhook (POST, no JWT, HMAC verified)
   On payment.succeeded:
     DB: orders.status = 'paid'
     DB: subscriptions INSERT (customer_id, yoco_token, status: 'active')
     Trigger: call build-site Edge Function (internal HTTP or pg_net)

5. SITE GENERATION (async — runs inside build-site Edge Function)
   build-site:
     DB: client_sites.build_status = 'generating'
     Claude API (Image Agent) → DB: build_events log
     Claude API (Code Agent) → generated HTML files in memory
     DB: client_sites.build_status = 'generated'

6. NETLIFY DEPLOYMENT (continuation of build-site, or separate function)
   build-site:
     Netlify API: create site (direct zip-deploy, remove GitHub intermediary)
       POST /api/v1/sites → get netlify_site_id
       POST /api/v1/deploys with zip of generated files
     DB: client_sites (netlify_site_id, netlify_url, build_status: 'deployed')
     DB: orders.status = 'preview_ready'
   Client receives Realtime update → sees "Your preview is ready" in dashboard

7. CUSTOMER APPROVAL + DOMAIN REGISTRATION (triggered by customer action)
   Browser → Edge Function: domain-register (authenticated, passes site_id)
   domain-register → ZADOMAINS: register domain
   ZADOMAINS: async — responds with registration job ID
   DB: client_sites.domain_status = 'registered' (or 'pending_nameserver')

8. DNS PROPAGATION + NETLIFY CUSTOM DOMAIN (triggered by domain_status change)
   domain-register Edge Function (or a pg_net scheduled check):
     Polls ZADOMAINS for registration confirmation (or receives callback)
     Once confirmed:
       netlify-domain Edge Function →
         Netlify API: POST /api/v1/sites/{id}/domain_aliases
         Netlify API: POST /api/v1/sites/{id}/ssl (provision Let's Encrypt)
       DB: client_sites (custom_domain, live_url, domain_status: 'active',
                          build_status: 'live')
       DB: orders.status = 'live'
   Client Realtime update → sees "Your site is live at yourdomain.co.za"

9. ONGOING SUBSCRIPTION (recurring — Yoco webhook)
   Each month Yoco charges the stored token:
     payment.succeeded → DB: subscriptions.last_paid_at = now()
     payment.failed →
       DB: subscriptions.status = 'grace_period'
       Schedule: check again at +7 days
     payment.failed (retry exhausted) →
       DB: subscriptions.status = 'suspended'
       Netlify API: PUT /api/v1/sites/{id} { processing_settings: { skip: true } }
         (unpublishes the Netlify site)
       Email: notify customer (transactional email via Supabase or Resend)
     payment.succeeded (after suspension) →
       DB: subscriptions.status = 'active'
       Netlify API: re-enable site
       DB: client_sites.build_status = 'live'
```

---

## Suggested Build Order

Components must be built in dependency order. A later component cannot function without the earlier one.

```
1. Data model migration (subscriptions table, expanded status enums)
   → All subsequent components read/write these tables.

2. Admin route authorization gate
   → Must exist before any admin-triggered operations go live.
   → Depends on: existing profiles.role column + is_admin() function (002 migration).

3. Yoco checkout Edge Function + payment UI in React
   → Orders cannot progress past 'pending' without payment.
   → Depends on: orders table, Yoco secret key in env.

4. Yoco webhook Edge Function (inbound)
   → This is the trigger that kicks off all downstream steps.
   → Must be deployed and URL registered with Yoco before testing.
   → Depends on: yoco-checkout (to create tokens), subscriptions table.

5. Build-site hardening (remove GitHub intermediary, Netlify zip-deploy)
   → Simplifies the pipeline, removes a fragile dependency.
   → Depends on: existing build-site function structure, Netlify API.

6. ZADOMAINS domain-search replacement
   → Replaces DNS-based availability check with real registrar API.
   → Depends on: ZADOMAINS credentials in env.

7. domain-register Edge Function
   → Domain registration after payment + customer approval.
   → Depends on: ZADOMAINS API, client_sites.domain_status field (exists in schema).

8. netlify-domain Edge Function (custom domain attachment)
   → Attaches the registered domain to the Netlify site.
   → Depends on: domain-register (domain must exist first), Netlify site ID.

9. Subscription lifecycle management (suspension/reactivation)
   → Depends on: yoco-webhook (payment failure events), Netlify site ID.

10. Supabase Realtime subscriptions (replace polling)
    → Replace 3s polling in DashboardPage with realtime channel on build_events.
    → Depends on: build_events table (exists), Supabase Realtime enabled.

11. Email notifications (transactional)
    → Order confirmation, build complete, payment failed, site live.
    → Depends on: all status transitions being reliable first.
    → Recommended: Resend via Edge Function (not client-side).
```

---

## Security Model

### API key placement

All external API keys are Supabase Edge Function environment variables set via the Supabase dashboard or CLI (`supabase secrets set`). They are never:
- Stored in source code
- Prefixed with `VITE_` (which would expose them to the browser bundle)
- Passed through the React client

### Webhook verification

Yoco webhooks must be verified using the `YOCO_WEBHOOK_SECRET` (HMAC-SHA256 of the raw request body). The `yoco-webhook` Edge Function must:
1. Read the raw body as bytes before any JSON parsing
2. Compute HMAC-SHA256 against `YOCO_WEBHOOK_SECRET`
3. Compare against the `X-Yoco-Signature` header (constant-time comparison)
4. Reject with 401 if mismatch — before any DB writes

ZADOMAINS may use username/password or an API token. These go in Edge Function env, never client.

### Admin authorization

Admin routes currently have client-side guards only — a known security hole. The fix has two layers:
- React Router guard: check `profile.role === 'admin'` before rendering, redirect to `/` if not
- Supabase RLS: `public.is_admin()` function (already in migration 002) gates every admin-scoped query server-side

Admin-only Edge Functions (e.g. manually triggering a rebuild, suspending a site) must additionally verify the caller's JWT role server-side using `supabase.auth.getUser()` before acting.

### RLS coverage gaps to address

The current `build_events` INSERT policy requires admin role. Edge Functions use the service role key, which bypasses RLS — this is correct. However, the client-side polling currently uses the anon key and can only SELECT own build events. When migrating to Realtime, the channel must filter by `site_id` to prevent a user subscribing to another user's build events.

### Storage security

`client-assets` bucket was made public in migration 002 (so that logo/hero URLs can be embedded in generated HTML). This is acceptable since the content is non-sensitive brand assets. Sensitive uploads (if any added later) must go in a private bucket with signed URLs.

---

## Async / Retry Model

### Why the current synchronous model is fragile

The existing `build-site` function does everything in a single HTTP call: Claude generation (up to 2 minutes), GitHub API calls, Netlify API. Supabase Edge Functions have a 150-second wall-clock limit. A slow Claude response or a GitHub/Netlify API hiccup fails the entire build with no recovery.

### Recommended: job state machine with idempotent steps

Each pipeline step is an idempotent, individually retriable unit. The `client_sites.build_status` column is the state machine. A failed step leaves the status at its last-known-good state; a retry picks up from there.

```
State machine for client_sites.build_status:

pending
  → (build triggered) → generating
  → (Claude done) → generated
  → (Netlify deploy started) → deploying_netlify
  → (Netlify deploy confirmed) → deployed
  → (customer approved, domain registration started) → linking_domain
  → (domain active, Netlify custom domain attached) → live
  → (at any step, unrecoverable error) → failed
```

All transitions are written to `build_events` as an audit log.

### Handling the 150s Edge Function timeout

Split the pipeline across multiple Edge Functions, chained via internal HTTP calls or `pg_net`:

```
build-site (generation only):
  1. Validate inputs
  2. Set build_status = 'generating'
  3. Run Image Agent (Claude)
  4. Run Code Agent (Claude) — the expensive step
  5. Store generated files in Supabase Storage (new: client-sites/{site_id}/*.html)
  6. Set build_status = 'generated'
  7. Call deploy-site Edge Function via internal fetch (fire-and-forget)
  Return 202 Accepted immediately

deploy-site (Netlify deployment):
  1. Read generated files from Supabase Storage
  2. Zip files in memory
  3. POST zip to Netlify /api/v1/deploys (direct file deploy, no GitHub)
  4. Poll Netlify deploy status until 'ready' (or timeout → retry)
  5. Set build_status = 'deployed', netlify_site_id, netlify_url
  6. Set orders.status = 'preview_ready'
```

### Storing generated files

Currently generated HTML is never persisted — it exists only in memory during the Edge Function run. If the Netlify step fails, the HTML is lost and Claude must be called again (expensive).

Fix: after Claude generation, write files to Supabase Storage at `generated-sites/{site_id}/index.html` (and other pages). Subsequent deployment retries read from Storage, not from Claude again.

### Retry strategy

| Step | Retry approach | Max attempts | On exhaustion |
|------|---------------|--------------|---------------|
| Claude API | Exponential backoff (1s, 2s, 4s) within function | 3 | build_status = 'failed', alert admin |
| Netlify zip-deploy | Retry after 10s delay | 3 | deploy-site marks failed, admin retries manually |
| ZADOMAINS register | Immediate retry once, then poll status | 2 + poll | domain_status = 'failed', notify admin |
| Yoco webhook | Yoco retries automatically (3 attempts, 1h apart) — make handler idempotent | N/A (Yoco handles) | Check idempotency key |

### Idempotency

Every webhook handler must be idempotent. Yoco will retry failed webhook deliveries. Guard with:
```
check if orders.payment_reference already matches this payment ID → skip duplicate
```

Every build pipeline step must check current status before acting:
```
if build_status !== 'pending' and trying to start build → reject with 409
```

### pg_net for internal async calls

Supabase's `pg_net` extension allows PostgreSQL to make HTTP calls. Use it to chain pipeline steps without the client staying open:

```sql
-- Called from a trigger or Edge Function after status transition
SELECT net.http_post(
  url := 'https://[project].supabase.co/functions/v1/deploy-site',
  body := jsonb_build_object('siteId', NEW.id)::text,
  headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
);
```

This decouples steps: `build-site` can return 202 and `deploy-site` runs independently.

---

## Data Model Additions Required

The existing schema covers orders, client_sites, file_uploads, build_events. The following additions are needed for the missing integrations.

### subscriptions table (new)

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  site_id UUID NOT NULL REFERENCES public.client_sites(id),
  yoco_customer_id TEXT,          -- Yoco's customer token for recurring charges
  yoco_subscription_id TEXT,      -- Yoco subscription reference if using their recurring product
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'grace_period', 'suspended', 'cancelled')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_payment_at TIMESTAMPTZ,
  next_payment_at TIMESTAMPTZ,
  grace_period_until TIMESTAMPTZ, -- null unless in grace_period
  amount_cents INTEGER NOT NULL DEFAULT 4900, -- R49.00
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### generated_files table (new, or Supabase Storage path convention)

Option A (simpler): Store in Supabase Storage at `generated-sites/{site_id}/{filename}` and record paths in `client_sites.generated_files JSONB`.

Option B (queryable): Dedicated table:
```sql
CREATE TABLE public.generated_site_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,         -- storage path
  file_name TEXT NOT NULL,         -- e.g. 'index.html'
  version INTEGER NOT NULL DEFAULT 1, -- increments on regeneration
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Option A is recommended for v1 — Storage handles deduplication and the JSONB column in `client_sites` is already there (`custom_content JSONB`).

### client_sites additions

```sql
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS domain_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS netlify_deploy_id TEXT,
  ADD COLUMN IF NOT EXISTS generated_files JSONB,   -- [{path, storage_key, version}]
  ADD COLUMN IF NOT EXISTS zadomains_order_id TEXT;  -- ZADOMAINS registration job ref
```

### orders additions

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS yoco_payment_id TEXT,     -- idempotency key for webhook
  ADD COLUMN IF NOT EXISTS setup_fee_cents INTEGER,  -- one-time amount
  ADD COLUMN IF NOT EXISTS domain_included BOOLEAN DEFAULT false;
```

### Status enum alignment

Current `orders.status` CHECK constraint (from migration 002):
```
pending → payment_pending → paid → building → preview_ready → deployed → live → cancelled
```

Add: `suspended` for subscription failure:
```sql
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'payment_pending', 'paid', 'building',
                    'preview_ready', 'deployed', 'live', 'suspended', 'cancelled'));
```

---

## Netlify Deployment: Direct Zip-Deploy vs GitHub Intermediary

The current approach creates a GitHub repo and links Netlify to it via CI. This adds latency, requires a GitHub PAT, and introduces a dependency on GitHub CI completing before the Netlify site is live.

**Recommended replacement: Netlify direct file deploy**

```
POST https://api.netlify.com/api/v1/sites
  → returns site_id, site_url

POST https://api.netlify.com/api/v1/sites/{site_id}/deploys
  Content-Type: application/zip
  body: zip archive of generated HTML files
  → returns deploy_id, deploy_url, state ('processing' | 'ready' | 'error')
```

Poll `GET /api/v1/deploys/{deploy_id}` until `state === 'ready'` (typically 5–30 seconds for static HTML).

Custom domain attachment:
```
POST https://api.netlify.com/api/v1/sites/{site_id}/domain_aliases
  body: { domain: "mybusiness.co.za" }

POST https://api.netlify.com/api/v1/sites/{site_id}/ssl
  → provisions Let's Encrypt certificate for the custom domain
```

The customer's DNS must point to Netlify's load balancer (CNAME or A record) before SSL provision succeeds. ZADOMAINS API must set these DNS records — confirm whether ZADOMAINS allows programmatic DNS record creation via their API.

Site suspension (non-payment):
```
PUT https://api.netlify.com/api/v1/sites/{site_id}
  body: { processing_settings: { skip: true } }
```

Re-enable:
```
PUT https://api.netlify.com/api/v1/sites/{site_id}
  body: { processing_settings: { skip: false } }
```

Confidence on these endpoints: MEDIUM — verified against Netlify's documented REST API structure as of training data. Confirm exact `skip` flag behavior against current Netlify API docs before implementing.

---

## Keeping Supabase and Netlify State Consistent

**The problem:** `netlify_site_id` and `netlify_url` are stored in Supabase. If a Netlify operation partially succeeds (site created but deploy failed), the two systems diverge.

**Resolution strategy:**

1. Write Netlify `site_id` to DB immediately on site creation (before deploy). This allows cleanup/retry.
2. Write `netlify_deploy_id` separately after deploy is submitted. Poll using this ID.
3. Only set `build_status = 'deployed'` after deploy state is confirmed `ready`.
4. If deploy fails: keep `netlify_site_id` (don't delete the Netlify site), set `build_status = 'failed'`. Retry re-deploys to the same Netlify site ID using a new deploy.
5. The `netlify_deploy_id` column tracks the latest deploy — comparing this to Netlify's live state detects drift.

**Reconciliation Edge Function (admin use):**

An admin-callable Edge Function that queries all sites where `build_status = 'deployed'` and cross-checks Netlify's actual deploy state. Flags discrepancies into `build_events`. Run manually or on a cron.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Long-running synchronous Edge Function

**What:** Putting Claude generation + Netlify deploy + domain registration in a single HTTP request/response cycle.
**Why bad:** Edge Functions have a 150s wall-clock limit. Claude generation alone can hit 90s for complex sites. Netlify deploy adds 30s. Any network hiccup fails the whole thing with no recovery state.
**Instead:** Split into distinct Edge Functions chained via internal calls or pg_net. Each step is retriable independently.

### Anti-Pattern 2: Triggering builds from the client

**What:** Client-side JavaScript calling `supabase.functions.invoke('build-site')` directly at form submission, without confirming payment first.
**Why bad:** Lets any authenticated user trigger Claude generation without paying. Claude API cost is non-trivial.
**Instead:** Build is triggered exclusively from the `yoco-webhook` function on `payment.succeeded`. Client submits form → creates order (status: pending) → pays → webhook triggers build. No build without confirmed payment.

### Anti-Pattern 3: Client-side ZADOMAINS / Yoco calls

**What:** Making fetch calls to ZADOMAINS or Yoco from the React SPA.
**Why bad:** Exposes API keys in the browser bundle. Violates PCI DSS scope for Yoco.
**Instead:** All external API calls are Edge Functions. Client only talks to Supabase.

### Anti-Pattern 4: Polling for build status

**What:** Current 3s `setInterval` polling `build_events` table.
**Why bad:** Leaks intervals on unmount, multiplies DB reads across tabs, adds latency.
**Instead:** Supabase Realtime channel on `build_events` filtered by `site_id`:
```typescript
const channel = supabase
  .channel(`build-${siteId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'build_events',
    filter: `site_id=eq.${siteId}`,
  }, handleEvent)
  .subscribe()
```

### Anti-Pattern 5: Storing generated HTML only in memory

**What:** Claude generates HTML, it's immediately POSTed to Netlify/GitHub, never persisted.
**Why bad:** Any Netlify failure means paying Claude API again to regenerate. No auditability. AI regeneration has no prior version to diff against.
**Instead:** Write generated files to Supabase Storage before deploy. Deploy reads from Storage.

---

## Scalability Considerations

| Concern | At 50 customers | At 500 customers | At 5,000 customers |
|---------|-----------------|------------------|--------------------|
| Claude API cost | Monitor per-build token count | Enforce token budget per package tier | Prompt caching, structured output, partial regeneration |
| Netlify sites | Well within free tier limits | May need Team plan for bandwidth | Evaluate custom domain certificate limits |
| Supabase Edge Function concurrency | No issue | No issue | Consider dedicated compute if build queue depth grows |
| Yoco webhook throughput | No issue | No issue | Idempotency keys essential to avoid double-charges |
| ZADOMAINS API rate limits | Unknown — verify with ZADOMAINS | Unknown | Queue registration requests if limits apply |
| Supabase DB | No issue | Review slow query log | Add indexes on (user_id, status) on orders and client_sites |

Suggested indexes to add now (before they become performance issues):
```sql
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_client_sites_user_status ON client_sites(user_id, build_status);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_build_events_site_created ON build_events(site_id, created_at DESC);
```

---

## Sources

- Codebase analysis: `supabase/functions/build-site/index.ts`, `supabase/migrations/001_create_tables.sql`, `supabase/migrations/002_fix_rls_and_statuses.sql`
- Netlify REST API structure: training data (MEDIUM confidence — verify current endpoints at https://docs.netlify.com/api/get-started/)
- Supabase Edge Functions limits and pg_net: training data (MEDIUM confidence — verify at https://supabase.com/docs/guides/functions)
- Supabase Realtime: training data (HIGH confidence — stable API, widely used pattern)
- Yoco webhook pattern: training data (LOW-MEDIUM confidence — verify HMAC header name and signature format with Yoco docs at https://developer.yoco.com)
- ZADOMAINS API: training data (LOW confidence — SA-specific registrar, limited public documentation; verify API endpoint structure and auth method directly with ZADOMAINS)

---

*Research date: 2026-04-09 — ZADOMAINS API details require direct verification with the registrar before implementation.*
