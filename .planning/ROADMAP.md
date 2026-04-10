# Roadmap: keep-hosting

## Overview

keep-hosting is a brownfield brownfield project that needs six phases to go from a partially-wired scaffold with known security holes to a fully automated SA web-design agency where a customer can pay, get a site generated, and go live on a `.co.za` domain without touching code. The dependency chain is strict: security and data must come first (everything else writes to the schema), then generation hardening (the core product quality), then the Netlify deployment pipeline (needed before payment can trigger a build), then payment integration (the master trigger for all downstream steps), then domain registration and customer lifecycle (the final mile to "live"), then legal compliance, tests, and operations (the launch gate). No phase can safely begin without its predecessor being complete.

## Phases

- [x] **Phase 1: Security & Data Foundation** - Lock down known security holes and extend the schema to support subscriptions, build events, and cost tracking (completed 2026-04-09)
- [x] **Phase 2: Generation Hardening** - Replace fragile Claude integration with structured output, server-side execution, rate limiting, and mobile-responsive output (completed 2026-04-09)
- [ ] **Phase 3: Deployment Pipeline** - Remove GitHub intermediary and deliver direct Netlify zip-deploy with quota management and suspension/reactivation
- [ ] **Phase 4: Payment Integration** - Wire Yoco checkout, webhook handling, and full subscription lifecycle so payment becomes the master build trigger
- [ ] **Phase 5: Domain Registration & Customer Lifecycle** - Replace DNS placeholder with ZADOMAINS API, wire domain-to-Netlify attachment, and complete the customer dashboard
- [ ] **Phase 6: Compliance, Tests & Operations** - POPIA-compliant legal pages, Vitest test suite with CI, and admin observability tooling for launch readiness

## Phase Details

### Phase 1: Security & Data Foundation
**Goal**: All known security vulnerabilities are eliminated and the database schema fully supports the subscription, build, and cost-tracking data flows that every subsequent phase depends on
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-06, SEC-07, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06
**Descoped from this phase**: SEC-05 → V2-SEC-01 (2026-04-09, automated RLS integration test deferred — requires dedicated test Supabase project)
**Success Criteria** (what must be TRUE):
  1. A non-admin authenticated user navigating to `/admin` or `/admin/orders` is redirected with a 403 — the admin UI does not render and no admin-scoped data is returned from Supabase
  2. Uploading a file with a non-image MIME type or a file over 5MB to the onboarding form is rejected server-side, and the storage path contains a UUID filename — not the original filename
  3. The Supabase anon key and URL are read exclusively from environment variables — no plaintext fallback exists anywhere in source
  4. The `subscriptions` table exists with all columns required for billing lifecycle (status, yoco_token_id, next_charge_at, grace_until, suspended_at); the `build_events` table records pipeline state transitions; the `generation_cost` column captures Claude token counts per build
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Wave 0 test infrastructure: install Vitest, wire vite.config.ts test block, create stub test files matching 01-VALIDATION.md paths
- [x] 01-02-PLAN.md — Migration 003: subscriptions table + RLS, generated_files/generation_cost, POPIA consent columns, suspended status, yoco_payment_id; update src/types/database.ts
- [x] 01-03-PLAN.md — Security code fixes: remove plaintext Supabase credential (SEC-04), RequireAdmin route guard (SEC-01/02), upload validator + UUID path (SEC-03), prompt sanitizer (SEC-06), HTML scanner (SEC-07) wired into build-site Edge Function
- ~~01-04-PLAN.md~~ — Descoped with SEC-05 on 2026-04-09. Plan removed; will be re-planned if V2-SEC-01 is promoted back to v1.

### Phase 2: Generation Hardening
**Goal**: Claude site generation is reliable, server-side-only, cost-controlled, and produces mobile-responsive output — and the onboarding race condition that breaks submission is fixed
**Depends on**: Phase 1
**Requirements**: GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, GEN-08, GEN-09, CUST-05
**Success Criteria** (what must be TRUE):
  1. A site generation call uses `tool_choice: { type: 'tool', name: 'deliver_site_files' }` — no regex parsing of Claude output; the `ANTHROPIC_API_KEY` is never present in the browser bundle
  2. A customer completing the onboarding form on a slow network successfully submits — the form awaits real session state rather than a `setTimeout` delay
  3. A generation attempt that hits a Claude 429 or 529 response queues for retry with exponential backoff; a 400 response fails loudly without retry; no generation attempt retries more than twice
  4. Generated HTML includes a `<meta name="viewport">` tag and passes a visual mobile-responsive check — no hardcoded px layout widths
  5. Per-build Claude token counts (input and output) are recorded in `generation_cost` and visible in the admin dashboard; the Supabase Realtime channel replaces the 3-second polling interval for build status updates
**Plans**: 4 plans
Plans:
- [ ] 02-01-PLAN.md — Wave 0: Create 11 Vitest stub files from 02-VALIDATION.md (test infra already installed in Phase 1)
- [ ] 02-02-PLAN.md — Wave 1: Shared pure-TS modules (cost-calc, industry-hints, prompts, html-scanner viewport+mobile extensions) — covers GEN-04, GEN-06, GEN-07
- [ ] 02-03-PLAN.md — Wave 1: Client-side fixes — CUST-05 setTimeout fix, useBuildStatus Realtime hook, DashboardPage wiring, browser-bundle scan test — covers CUST-05, GEN-02, GEN-09
- [ ] 02-04-PLAN.md — Wave 2: Edge Function refactor (split build-site → generate-site + persist-files + build-orchestrator), migrate Claude to tool_choice, retry ladder + per-package caps, cost tracking, migration 004, pg_cron schedule, REQUIREMENTS.md GEN-03 correction — covers GEN-01, GEN-03, GEN-05, GEN-08 (includes human-verify checkpoint)

### Phase 3: Deployment Pipeline
**Goal**: Customer sites are deployed directly to Netlify via zip-deploy API (no GitHub intermediary) with rate-limit awareness, idempotent retries, and the ability to suspend and reactivate sites programmatically
**Depends on**: Phase 2
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06
**Success Criteria** (what must be TRUE):
  1. A generated site deploys to Netlify using a direct zip-deploy API call — no GitHub repository or CI step is in the path
  2. Each customer site gets a UUID-based Netlify site name (e.g. `kh-{uuid}.netlify.app`) inside a dedicated Netlify team account — no name collisions, no personal-account accumulation
  3. A deploy queue enforces the 3-deploys-per-minute Netlify rate limit and tracks daily deploy count; an alert fires when the count reaches 80
  4. When a subscription is suspended, the Netlify site is programmatically unpublished; when a subscription is reactivated, the site is republished from the files already persisted in Supabase Storage — Claude is not called again
**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md — Wave 1: Test stubs (6 DEPLOY test files with it.todo), migration 005 (extend build_status CHECK + deploy indexes), update TypeScript types, update DashboardPage status rendering
- [ ] 03-02-PLAN.md — Wave 2: Core implementation — deploy-site + suspend-site + reactivate-site Edge Functions, suspended-page.ts template, wire persist-files chain with EdgeRuntime.waitUntil, extend build-orchestrator for deploy_failed retry, fill all 6 test bodies
- [ ] 03-03-PLAN.md — Wave 3: Apply migration 005 + deploy Edge Functions + human-verify checkpoint (create Netlify team account, set secrets, test real deploy/suspend/reactivate cycle, confirm pricing tier)

### Phase 4: Payment Integration
**Goal**: Yoco checkout collects the setup fee, recurring billing charges monthly via stored token, and payment success is the exclusive trigger that starts site generation — no build starts without confirmed payment
**Depends on**: Phase 3
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-09
**Success Criteria** (what must be TRUE):
  1. Vendor validation is documented: Yoco recurring billing capability confirmed, card tokenization format and webhook HMAC header name documented before any code is written
  2. A customer completing onboarding is redirected to a Yoco checkout session; on `payment.succeeded` webhook, a subscription row is inserted and site generation starts — the build does not start if the webhook has not fired
  3. Duplicate Yoco webhook delivery (same payment ID fired twice) results in exactly one subscription row and one build trigger — no double-processing
  4. A failed recurring charge triggers the retry ladder: customer receives a payment-failed email at 24 hours, 7 days, and 14 days; at 14 days the Netlify site is suspended
  5. A customer can navigate to "Update payment method," enter new card details via Yoco tokenization, and have their suspended subscription reactivate on the next successful charge
**Plans**: TBD

### Phase 5: Domain Registration & Customer Lifecycle
**Goal**: Real `.co.za` domain availability checks and registration via ZADOMAINS replace the Google DNS placeholder, domains are attached to Netlify sites with SSL, and the customer dashboard gives full lifecycle visibility and self-service control
**Depends on**: Phase 4
**Requirements**: DOM-01, DOM-02, DOM-03, DOM-04, DOM-05, DOM-06, DOM-07, CUST-01, CUST-02, CUST-03, CUST-04
**Success Criteria** (what must be TRUE):
  1. Vendor validation is documented: ZADOMAINS API spec, authentication method, registration endpoint, error codes, and rate limits confirmed before any domain code is written
  2. A domain availability search on the keep-hosting site queries the ZADOMAINS API — not Google DNS — and returns a result that accurately reflects whether the `.co.za` domain can be registered
  3. After payment, domain registration is attempted via ZADOMAINS with automatic retry (up to 3 attempts over 15 minutes); a registration failure notifies the admin and sends the customer an email without triggering a refund automatically
  4. A registered domain is attached to the customer's Netlify site and Let's Encrypt SSL is provisioned; the customer's dashboard shows "Your site is live at yourdomain.co.za" only after SSL is confirmed — not just after domain registration
  5. The customer dashboard lists all their sites with correct live status (pending / generating / deployed / live / suspended); the customer can trigger an AI regeneration, view subscription status, and cancel their subscription with a grace-period confirmation
  6. The customer receives transactional email at each key lifecycle event: signup, payment received, site live, payment failed, site suspended, site reactivated; the domain selection screen discloses the 60-day transfer lock
**Plans**: TBD

### Phase 6: Compliance, Tests & Operations
**Goal**: keep-hosting is legally compliant with POPIA, has a Vitest test suite with CI blocking bad merges, and the admin dashboard surfaces the operational data needed to run the business and respond to failures
**Depends on**: Phase 5
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, TEST-01, TEST-02, TEST-03, TEST-04, OPS-01, OPS-02, OPS-03, OPS-04
**Success Criteria** (what must be TRUE):
  1. `/privacy` and `/terms` pages exist on the keep-hosting marketing site; every generated customer site automatically includes a footer link to templated privacy and T&Cs; the onboarding form has a mandatory POPIA consent checkbox that records consent timestamp and IP before signup is allowed
  2. The privacy policy explicitly discloses that customer PII is sent to Anthropic (USA) for site generation, with a POPIA Section 72 cross-border transfer disclosure visible at the point of Claude submission — not buried in the footer
  3. `npm test` runs the Vitest suite and exits non-zero on failure; the suite includes smoke tests for: non-admin user hitting admin route returns 403, MIME-rejected file upload, Yoco webhook idempotency, and build state machine transitions
  4. GitHub Actions (or equivalent) runs the test suite on every push to `main`; a failing test blocks the merge
  5. The admin dashboard shows pending builds, failed builds, failed payments, Claude cost trend (daily/weekly), and current Netlify deploy count vs. daily quota; the admin can manually trigger a re-deploy or re-generate for any stuck order
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security & Data Foundation | 3/3 | Complete    | 2026-04-09 |
| 2. Generation Hardening | 4/4 | Complete   | 2026-04-09 |
| 3. Deployment Pipeline | 0/3 | Planning complete | - |
| 4. Payment Integration | 0/TBD | Not started | - |
| 5. Domain Registration & Customer Lifecycle | 0/TBD | Not started | - |
| 6. Compliance, Tests & Operations | 0/TBD | Not started | - |
