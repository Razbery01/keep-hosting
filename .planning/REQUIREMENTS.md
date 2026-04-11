# Requirements: keep-hosting

**Defined:** 2026-04-09
**Core Value:** An SA small business can go from "I need a website" to "my site is live on my own domain" in minutes, without talking to a designer and without touching code.

## v1 Requirements

Requirements for the first real, paid, end-to-end launch milestone. Each maps to a roadmap phase. Existing partial code is acknowledged but the requirement is not "done" until the acceptance criteria below are met.

### Security & Foundation

- [x] **SEC-01**: Admin routes (`/admin`, `/admin/orders`) block non-admin users — non-admin gets 403, admin role verified via Supabase RLS helper (`is_admin()`)
- [x] **SEC-02**: Every admin-scoped Supabase query fails server-side for non-admin users (not just UI hidden)
- [x] **SEC-03**: Logo/image uploads validate MIME type (jpeg, png, webp only), enforce 5MB max, and rename to UUID before storage (no raw filenames)
- [x] **SEC-04**: Supabase URL and anon key moved fully to environment variables — no plaintext JWT fallback in source
- [x] **SEC-06**: User-supplied text is sanitized before interpolation into Claude prompts (prompt injection prevention)
- [x] **SEC-07**: Generated HTML is scanned for `<script>` tags, external JS sources, and suspicious link patterns before deploy

### Data Model

- [x] **DATA-01**: `subscriptions` table added (user_id, plan, status, yoco_token_id, next_charge_at, grace_until, suspended_at)
- [x] **DATA-02**: `client_sites.generated_files` JSONB column added; generation pipeline persists files to Supabase Storage before any deploy attempt
- [x] **DATA-03**: `profiles.popia_consent_at` and `profiles.popia_consent_ip` columns added; recorded at signup and at payment
- [x] **DATA-04**: `orders.status` enum extended to include `suspended`; state-machine transitions documented
- [x] **DATA-05**: `yoco_payment_id` column on `orders`; `build_events` table for pipeline observability
- [x] **DATA-06**: `generation_cost` column captures Claude input/output tokens per build (cost monitoring from day one)

### Generation Pipeline

- [x] **GEN-01**: Claude output parsing uses `tool_choice: { type: 'tool', name: 'deliver_site_files' }` — no regex parsing
- [x] **GEN-02**: Claude calls run inside a Supabase Edge Function with `ANTHROPIC_API_KEY` server-side only (never client-exposed)
- [x] **GEN-03**: Token budget enforced: max output tokens per package tier (Starter 12k, Professional 24k, Enterprise 48k); hard cap on retries (max 2); never retry 4xx errors
- [x] **GEN-04**: Generated HTML is mobile-responsive (prompt enforces responsive layout + breakpoints; output scan checks for viewport meta)
- [x] **GEN-05**: Generation queue with rate limiting — distinguishes 429/529 (retry with backoff) from 400 (fail loudly)
- [x] **GEN-06**: Industry-contextual prompting — business industry + SA location shape the generated copy and imagery choices
- [x] **GEN-07**: Per-build Claude cost logged (input tokens + output tokens + ZAR cost); visible in admin dashboard
- [x] **GEN-08**: Build pipeline split across Edge Functions to stay under 150s wall-clock limits; state transitions recorded in `build_events`
- [x] **GEN-09**: Supabase Realtime replaces `setInterval` polling for build status updates on customer dashboard

### Deployment (Netlify)

- [x] **DEPLOY-01**: Remove GitHub-intermediated deployment; use Netlify direct zip-deploy API (`POST /api/v1/sites/{id}/deploys` with zip body)
- [x] **DEPLOY-02**: Each customer site gets a unique site name (UUID-based) inside a single Netlify team account
- [x] **DEPLOY-03**: Deploy queue enforces Netlify rate limits (3/min, 100/day) with token-bucket limiter; alerts at 80/day
- [x] **DEPLOY-04**: Site suspension — on payment failure (after grace period), programmatically unpublish the Netlify site
- [x] **DEPLOY-05**: Site reactivation — on successful payment after suspension, republish the Netlify site (redeploy from persisted files in Supabase Storage)
- [x] **DEPLOY-06**: Deploy failure triggers retry with idempotency; persisted files in Storage eliminate need to re-call Claude

### Payments (PayFast)

- [x] **PAY-01**: PayFast merchant account configured with sandbox + production credentials; subscription feature enabled (documented — no vendor contact blocker)
- [x] **PAY-02**: OnboardingPage redirects to PayFast checkout with setup fee + R49/mo subscription; `custom_str1` carries siteId through the flow
- [x] **PAY-03**: `payfast-itn` Edge Function verifies ITN signature (MD5 hash of sorted params + passphrase); rejects invalid signatures
- [x] **PAY-04**: ITN handler is idempotent — duplicate notifications do not double-create subscriptions or double-trigger builds (`m_payment_id` dedup)
- [x] **PAY-05**: On initial payment COMPLETE, subscription row inserted; site build triggered via `generate-site` (payment is the master trigger — no build starts without it)
- [x] **PAY-06**: Recurring R49/mo handled by PayFast native subscriptions; ITN notifications on each charge update `subscriptions.next_charge_at`
- [x] **PAY-07**: Failed payment retry handled by PayFast (3 attempts over 10 days); on final failure + CANCELLED ITN, site suspended via `suspend-site`
- [x] **PAY-08**: Customer can resubscribe via new PayFast checkout after cancellation/suspension; `reactivate-site` fires on new subscription COMPLETE
- [x] **PAY-09**: All PayFast API calls and ITN verification happen inside Edge Functions — `PAYFAST_PASSPHRASE` never exposed client-side

### Domain Registration (ZADOMAINS)

- [ ] **DOM-01**: Vendor validation completed — ZADOMAINS API spec, auth method, registration endpoint, error codes, rate limits documented (blocks DOM-02 onwards)
- [ ] **DOM-02**: Real domain availability check via ZADOMAINS API replaces Google DNS placeholder in `useDomainSearch`
- [ ] **DOM-03**: `domain-register` Edge Function registers `.co.za` domain via ZADOMAINS with async retry (3 attempts over 15 minutes)
- [ ] **DOM-04**: Domain registration is decoupled from payment — payment succeeds independently; registration failures do not refund automatically but trigger admin alert + customer email
- [ ] **DOM-05**: `netlify-domain` Edge Function attaches registered domain to the customer's Netlify site and provisions Let's Encrypt SSL
- [ ] **DOM-06**: All ZADOMAINS calls happen inside Edge Functions — credentials never client-side
- [ ] **DOM-07**: Transfer lock disclosure shown to customer on domain selection (required by most registrars: 60-day lock after registration)

### Customer Lifecycle

- [ ] **CUST-01**: Customer dashboard lists user's sites with live status (pending / generating / deployed / live / suspended)
- [ ] **CUST-02**: Customer can trigger an AI regeneration by describing the change in natural language; regeneration respects the same token/cost caps
- [ ] **CUST-03**: Customer can view subscription status, next charge date, and cancel subscription (with confirmation + grace period explanation)
- [ ] **CUST-04**: Customer receives transactional email on: welcome/signup, payment received, build complete (site live), payment failed, subscription suspended, subscription reactivated
- [x] **CUST-05**: Auth/submit race condition in `OnboardingPage.tsx` fixed — awaits real session state instead of `setTimeout`

### Legal / POPIA Compliance

- [ ] **LEGAL-01**: `/privacy` page — POPIA-compliant privacy policy including explicit disclosure that customer data is sent to Anthropic (USA) for site generation
- [ ] **LEGAL-02**: `/terms` page — service T&Cs covering setup fee, recurring billing, suspension, cancellation, content ownership
- [ ] **LEGAL-03**: POPIA consent checkbox required at signup; consent timestamp + IP stored in `profiles`; unchecked = no signup allowed
- [ ] **LEGAL-04**: Generated customer sites automatically include a footer privacy policy + T&Cs link (templated, customer business name inserted)
- [ ] **LEGAL-05**: POPIA Section 72 cross-border transfer explicitly disclosed at the point where PII is sent to Claude (not buried in T&Cs)

### Test Infrastructure

- [ ] **TEST-01**: Vitest + jsdom + @testing-library/react + @testing-library/jest-dom configured; `npm test` and `npm run test:watch` scripts added
- [ ] **TEST-02**: Smoke tests cover: admin 403 for non-admin user, file upload MIME rejection, PayFast ITN idempotency, build state machine transitions
- [ ] **TEST-03**: Integration test suite runs against a dedicated Supabase test project (not mocks) to catch RLS regressions
- [ ] **TEST-04**: CI runs tests on every push (GitHub Actions or equivalent); failing tests block merge

### Observability & Operations

- [ ] **OPS-01**: Central error logging for Edge Functions (at minimum: structured console logs + a `function_errors` table for later querying)
- [ ] **OPS-02**: Admin dashboard surfaces: pending builds, failed builds, failed payments, Claude cost trend (daily/weekly), Netlify deploy count vs quota
- [ ] **OPS-03**: Admin can manually trigger a re-deploy or re-generate for a stuck customer order (operator safety net for launch)
- [ ] **OPS-04**: Supabase function error responses never leak secrets or internal paths to the client

## v2 Requirements

Deferred. Acknowledged but not in this milestone's roadmap.

### Editing & Content

- **V2-EDIT-01**: Self-serve inline content editing (text + image swaps) without AI regeneration
- **V2-EDIT-02**: Multi-page sites with navigation builder
- **V2-EDIT-03**: Blog / CMS module
- **V2-EDIT-04**: Afrikaans (and other SA language) generation option

### Commerce

- **V2-COMM-01**: E-commerce on generated sites (cart, inventory, VAT handling)
- **V2-COMM-02**: Integrated PayFast payments on generated customer sites
- **V2-COMM-03**: Booking/appointment functionality for service businesses

### Platform

- **V2-PLAT-01**: International TLDs (.com, .org.za, .net.za)
- **V2-PLAT-02**: Email hosting/mailboxes (resold or integrated)
- **V2-PLAT-03**: Team / multi-user accounts (for small agencies, resellers)
- **V2-PLAT-04**: Mobile app (iOS/Android)
- **V2-PLAT-05**: A/B testing and conversion optimization

### Growth

- **V2-GROW-01**: Analytics dashboard for customers (traffic, conversions)
- **V2-GROW-02**: SEO improvement suggestions via AI
- **V2-GROW-03**: Social media post generation for customers
- **V2-GROW-04**: Referral program

### Security Hardening (Deferred)

- **V2-SEC-01**: RLS policies verified on every table holding customer PII via automated integration test using non-admin user (descoped from v1 SEC-05 on 2026-04-09 — requires dedicated test Supabase project which user deferred). Manual RLS verification remains in place through migration 002's `is_admin()` policies + the SEC-01/02 RequireAdmin UI guard.

## Out of Scope

Explicitly excluded from v1 and v2. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Human designer revisions / "book a call with a designer" | Entire premise of the product is zero humans in the loop — this breaks unit economics |
| Drag-and-drop visual editor | Contradicts the AI-regeneration editing thesis; Wix already owns that market |
| International currencies / non-ZAR billing | Market is SA SMMEs only; forex adds compliance and payment complexity |
| Custom code / HTML/CSS editing by customer | Customers who want this should use a different product; this is deliberately AI-only |
| White-label / reseller mode | Single-owner model for launch; reseller tier is v3+ at earliest |
| Live chat widgets / helpdesks on generated sites | Complexity + per-customer cost; WhatsApp button (static link) is sufficient |
| AI chatbot on generated sites | Per-site cost would break R49/mo economics |
| Generated-site analytics (built-in) | Customers can add Google Analytics manually; not a v1 differentiator |
| Multilingual generated sites at launch | Afrikaans/isiZulu deferred to v2 to keep Claude prompting simple |
| Mobile native apps for customers | Web-first; SA SMME market accesses via Android Chrome, not native apps |

## Traceability

Populated during roadmap creation. Each requirement maps to exactly one phase.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| SEC-06 | Phase 1 | Complete |
| SEC-07 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| DATA-05 | Phase 1 | Complete |
| DATA-06 | Phase 1 | Complete |
| GEN-01 | Phase 2 | Complete |
| GEN-02 | Phase 2 | Complete |
| GEN-03 | Phase 2 | Complete |
| GEN-04 | Phase 2 | Complete |
| GEN-05 | Phase 2 | Complete |
| GEN-06 | Phase 2 | Complete |
| GEN-07 | Phase 2 | Complete |
| GEN-08 | Phase 2 | Complete |
| GEN-09 | Phase 2 | Complete |
| CUST-05 | Phase 2 | Complete |
| DEPLOY-01 | Phase 3 | Complete |
| DEPLOY-02 | Phase 3 | Complete |
| DEPLOY-03 | Phase 3 | Complete |
| DEPLOY-04 | Phase 3 | Complete |
| DEPLOY-05 | Phase 3 | Complete |
| DEPLOY-06 | Phase 3 | Complete |
| PAY-01 | Phase 4 | Complete |
| PAY-02 | Phase 4 | Complete |
| PAY-03 | Phase 4 | Complete |
| PAY-04 | Phase 4 | Complete |
| PAY-05 | Phase 4 | Complete |
| PAY-06 | Phase 4 | Complete |
| PAY-07 | Phase 4 | Complete |
| PAY-08 | Phase 4 | Complete |
| PAY-09 | Phase 4 | Complete |
| DOM-01 | Phase 5 | Pending |
| DOM-02 | Phase 5 | Pending |
| DOM-03 | Phase 5 | Pending |
| DOM-04 | Phase 5 | Pending |
| DOM-05 | Phase 5 | Pending |
| DOM-06 | Phase 5 | Pending |
| DOM-07 | Phase 5 | Pending |
| CUST-01 | Phase 5 | Pending |
| CUST-02 | Phase 5 | Pending |
| CUST-03 | Phase 5 | Pending |
| CUST-04 | Phase 5 | Pending |
| LEGAL-01 | Phase 6 | Pending |
| LEGAL-02 | Phase 6 | Pending |
| LEGAL-03 | Phase 6 | Pending |
| LEGAL-04 | Phase 6 | Pending |
| LEGAL-05 | Phase 6 | Pending |
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| TEST-03 | Phase 6 | Pending |
| TEST-04 | Phase 6 | Pending |
| OPS-01 | Phase 6 | Pending |
| OPS-02 | Phase 6 | Pending |
| OPS-03 | Phase 6 | Pending |
| OPS-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 61 total
- Mapped to phases: 61
- Unmapped: 0
- Descoped from v1: SEC-05 → V2-SEC-01 (2026-04-09, deferred test project provisioning)

---
*Requirements defined: 2026-04-09*
*Last updated: 2026-04-10 — GEN-03 wording updated to per-package caps (Phase 2 planning decision)*
