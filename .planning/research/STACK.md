# Technology Stack

**Project:** keep-hosting — AI web-design agency for SA SMMEs
**Research Focus:** Additions to existing React/Vite/Supabase scaffold
**Researched:** 2026-04-09
**Overall Confidence:** MEDIUM (Netlify API: HIGH; Vitest: HIGH; Claude codegen: HIGH; Yoco recurring: LOW; ZADOMAINS API: LOW)

---

## What Already Exists — Do Not Re-Add

The following are locked and present. This file covers only net-new additions.

| Existing | Version |
|----------|---------|
| React | 19.2.4 |
| Vite | 8.0.1 |
| TypeScript | 5.9.3 |
| @supabase/supabase-js | 2.101.1 |
| @anthropic-ai/sdk | 0.81.0 |
| zod | 4.3.6 |
| Tailwind CSS | 4.2.2 |
| React Router DOM | 7.13.2 |
| React Hook Form | 7.72.0 |

---

## Net-New Additions by Domain

---

### 1. Netlify Programmatic Deployment

**Decision: Use raw fetch against Netlify REST API — no additional npm package needed.**

The existing `deployToNetlify()` in `supabase/functions/build-site/index.ts` already calls `https://api.netlify.com/api/v1/sites` with a Bearer PAT. The Netlify official JS client (`@netlify/js-client`, published via `github.com/netlify/open-api`) is a thin wrapper around the same REST API. Adding it as an npm dependency in Deno edge functions is not straightforward and the value over raw fetch is minimal for the narrow surface area needed here.

**Stick with native `fetch`. The client is only worth adding if the call surface grows to 10+ endpoints.**

#### Deployment Strategy Change — Critical

**The current code uses GitHub-repo-linked builds. This is wrong for this use case.**

- **Current pattern:** Create GitHub repo → push files → create Netlify site linked to GitHub → wait for Netlify to pull from GitHub → Netlify auto-deploys.
- **Problem:** This adds 30–120 seconds of latency (Netlify build queue), requires a GitHub org, and creates hard-to-clean-up repos per customer.
- **Correct pattern for generated static HTML:** Deploy directly via Netlify's ZIP upload API.

**Netlify ZIP Deploy (recommended):**

```
POST https://api.netlify.com/api/v1/sites/{site_id}/deploys
Content-Type: application/zip
Authorization: Bearer {NETLIFY_PAT}

[body = ZIP buffer of all generated HTML/CSS/JS files]
```

This is instantaneous (no build queue), doesn't need GitHub, and deploys are atomic. The site must be pre-created (`POST /api/v1/sites`) to get a `site_id`, then ZIP deploys update it.

**Workflow:**

```
1. POST /api/v1/sites                          → get site_id + netlify_subdomain
2. ZIP the generated HTML files in memory
3. POST /api/v1/sites/{site_id}/deploys        → immediate live deploy
4. PATCH /api/v1/sites/{site_id}               → set custom_domain once DNS pointed
5. POST /api/v1/sites/{site_id}/ssl            → provision Let's Encrypt cert
6. DELETE or lock site on subscription failure  → suspend site
```

**Rate limits:** 3 deploys/minute, 100 deploys/day per PAT. At volume, use one PAT per customer or contact Netlify for higher limits. Well within range for early launch (confidence: HIGH — from official Netlify docs).

**What NOT to use:**
- `@netlify/js-client` — adds npm dependency complexity in Deno with marginal benefit
- Git-linked site creation — adds 30–120s latency, pollutes GitHub org, hard to clean up
- Netlify CLI — designed for humans, not server-side automation

**Confidence: HIGH** — verified against official Netlify API docs at `docs.netlify.com/api/get-started/`.

---

### 2. ZADOMAINS API (.co.za Domain Registration)

**Confidence: LOW — no public documentation accessible. Treat as an unknown until access is granted.**

ZADOMAINS is a South African domain registrar specialising in `.co.za` and other ZADNA-regulated TLDs. It is the correct choice over GoDaddy/Namecheap because it avoids upstream reseller complexity for local ccTLDs.

**What is known (training data, LOW confidence):**
- ZADOMAINS offers a reseller/API program for domain registration and management
- Their API is likely XML-RPC or REST over HTTPS with HTTP Basic or token auth
- Common operations: availability check, register, set nameservers, get domain info, renew

**What is NOT known:**
- Current API version, endpoint URLs, authentication scheme
- Whether `.co.za` registrations require ZADNA-accredited registrar credentials
- Rate limits, pricing per registration, DNS management capabilities
- Whether webhooks exist for domain status changes

**Action required before implementation:**
1. Log into your ZADOMAINS reseller account and locate the API/developer section
2. Request API credentials if not already held
3. Obtain the API specification document (likely a PDF or private portal)
4. Build a thin client module in the Supabase edge function: `src/lib/zadomains.ts` (or Deno equivalent) wrapping fetch calls with typed request/response interfaces

**What NOT to use:**
- Google DNS for domain availability checks (current approach) — DNS presence does not equal registrability. A domain can have DNS and still be available for registration. Replace with ZADOMAINS availability check API call.
- Any third-party `.co.za` WHOIS library from npm — these call public WHOIS servers which are rate-limited, unreliable, and not authoritative for registration status.

**Interim approach if ZADOMAINS API access is delayed:**
Use ZADNA WHOIS (`https://www.zadna.org.za/whois`) as a fallback for availability only. Not suitable for production registration.

**No npm package. Build a bespoke client.** (confidence: MEDIUM — registrar APIs are universally REST/XML-RPC with no standard SDK)

---

### 3. Yoco Payment Integration (Setup Fee + R49/mo Recurring)

**Confidence: LOW for recurring/subscription support — verify with Yoco directly before building.**

Yoco is the correct payment processor for this market: SA-native, supports ZAR, has card + EFT, lower compliance burden than Stripe ZA, and is trusted by SA merchants.

**What is known (training data, MEDIUM confidence for one-time charges):**

Yoco provides:
- **Checkout Popup SDK** — JavaScript SDK loaded via CDN for browser-side payment
- **Charges API** — server-side `POST /charges` endpoint to process a tokenized card
- **No official npm package** — Yoco SDK is CDN-only; server-side calls are raw HTTP

**Yoco one-time charge flow (MEDIUM confidence):**

```
Browser: Load Yoco SDK via CDN script tag
Browser: yoco.showPopup({ ... }) → user enters card → returns token
Server:  POST https://online.yoco.com/v1/charges/
         { token, amountInCents, currency: 'ZAR', ... }
         Authorization: sk_live_xxx (secret key — server-side only)
Server:  Persist charge ID to Supabase orders table
```

**Recurring billing / subscriptions — CRITICAL UNCERTAINTY:**

As of the knowledge cutoff (August 2025), Yoco's public API does NOT have a documented recurring billing or subscription product equivalent to Stripe Subscriptions. The options known to exist are:

1. **Manual recurring** — store payment token (if Yoco supports card vaulting/tokenization for future charges), then charge the stored token server-side on a schedule (Supabase edge function on cron or pg_cron). This is the most likely viable pattern.
2. **Yoco recurring feature** — Yoco has announced features in this area but documentation and availability have been inconsistent. Confirm current state with Yoco directly or via their developer Slack/support.

**If Yoco recurring is not available, fallback strategy:**
- Implement manual recurring via Supabase pg_cron: daily job queries `subscriptions` table for due renewals, charges stored Yoco token, handles failures with grace period.
- This requires Yoco to support card token storage for future charges. Verify this is available in your merchant tier.

**Yoco SDK/API details (MEDIUM confidence):**

| Component | Detail |
|-----------|--------|
| Browser SDK | `https://js.yoco.com/sdk/v1/yoco-sdk-web.js` (CDN, no npm package) |
| Server API base URL | `https://online.yoco.com/v1/` |
| Auth | HTTP Basic with secret key as username |
| Currency | ZAR only |
| Test keys | Available in dashboard |

**What NOT to use:**
- Any community npm package wrapping Yoco — none are officially supported and may be outdated
- Stripe — not the right fit; ZA compliance setup more complex, not SA-native
- PayFast — alternative SA option but Yoco has better API and is locked-in per project constraints
- Client-side secret key exposure — secret key must never reach the browser; route all charges through a Supabase edge function

**Action required:**
- Contact Yoco developer support to confirm: (a) card tokenization for future charges, (b) recurring/subscription feature availability, (c) webhook support for charge failures
- Obtain Yoco test and live API keys from the merchant dashboard

**No npm package. Implement as a thin fetch wrapper in a Supabase edge function.** (confidence: MEDIUM for this recommendation)

---

### 4. Claude API Structured Codegen

**Decision: Switch from regex JSON extraction to forced tool use for structured output.**

**Confidence: HIGH** — this is a well-documented pattern in the `@anthropic-ai/sdk` already present at 0.81.0.

**Current problem (from `build-site/index.ts`):**

```typescript
// Fragile — relies on regex to find JSON in free-text output
const jsonMatch = textBlock.text.match(/\{[\s\S]*"files"[\s\S]*\}/)
if (!jsonMatch) throw new Error('No JSON found in response')
const parsed = JSON.parse(jsonMatch[0])
```

This fails when Claude includes explanatory text before or after the JSON, uses markdown fences, or the JSON is partial due to max_tokens truncation.

**Recommended pattern — forced tool use:**

Define a tool with the exact JSON schema for generated site files. Set `tool_choice: { type: 'tool', name: 'deliver_site_files' }` to force Claude to always respond via the tool. The SDK returns a `tool_use` block with guaranteed-structured JSON.

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 64000,
  thinking: { type: 'enabled', budget_tokens: 8000 },
  system: CODE_AGENT_SYSTEM,
  tools: [
    {
      name: 'deliver_site_files',
      description: 'Deliver the generated website files',
      input_schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['path', 'content'],
            },
          },
        },
        required: ['files'],
      },
    },
  ],
  tool_choice: { type: 'tool', name: 'deliver_site_files' },
  messages: [{ role: 'user', content: userPrompt }],
})

// Extract from tool_use block — always present, always valid JSON
const toolBlock = response.content.find(b => b.type === 'tool_use')
const files = (toolBlock as any).input.files
```

**Benefits over current approach:**
- No regex parsing — SDK deserializes the JSON automatically
- Schema-validated at the API level — malformed output is retried by the model
- Works with extended thinking enabled (current code uses `thinking: { type: 'adaptive' }`, upgrade to `enabled` with explicit budget)
- Never truncates mid-JSON — tool output must be complete

**No new package required.** The existing `@anthropic-ai/sdk 0.81.0` supports tool_use and tool_choice. (confidence: HIGH — this is core SDK functionality)

**Additional prompt engineering improvements (HIGH confidence from first principles):**

| Problem | Solution |
|---------|----------|
| Inconsistent SA context | Hardcode SA location signals in system prompt: "South African city," "R" prefix for prices, "+27" phone numbers |
| Generic copy | Add to system: "Never use Lorem ipsum. Generate realistic SA business copy." (already partially done — reinforce) |
| Missing responsive breakpoints | Add explicit CSS breakpoint requirements to system prompt |
| Large HTML causing truncation | Move to multi-call: one call per page for Professional/Enterprise packages |
| Cost monitoring absent | Log `response.usage.input_tokens + output_tokens` per build to `build_events` table |

**What NOT to use:**
- `response_format: { type: 'json_object' }` — this is an OpenAI parameter, not supported by Anthropic API
- Regex JSON extraction — fragile, fails silently, impossible to distinguish parse errors from model errors
- `thinking: { type: 'adaptive' }` — use explicit `enabled` with a defined `budget_tokens` for predictable cost control

---

### 5. Vitest + @testing-library/react Test Infrastructure

**Decision: Vitest + jsdom + @testing-library/react + @testing-library/user-event. Co-locate tests with source.**

**Confidence: HIGH** — this is the standard, well-documented pattern for React 19 + Vite projects.

#### Packages Required

| Package | Purpose | Install as |
|---------|---------|------------|
| `vitest` | Test runner, Jest-compatible API | devDependency |
| `@vitest/ui` | Optional browser-based test UI | devDependency |
| `@testing-library/react` | React component rendering/querying | devDependency |
| `@testing-library/user-event` | Realistic user interaction simulation | devDependency |
| `@testing-library/jest-dom` | Custom DOM matchers (`.toBeInTheDocument()`) | devDependency |
| `jsdom` | DOM environment for Vitest | devDependency |
| `@types/testing-library__jest-dom` | TypeScript types for jest-dom matchers | devDependency |

**Version note:** As of April 2026, the exact versions are not verified (WebFetch/npm registry blocked). Use these constraints:
- `vitest`: `^3.x` (Vitest 3 is current major as of late 2025; verify with `npm info vitest version`)
- `@testing-library/react`: `^16.x` (supports React 18+/19)
- `@testing-library/user-event`: `^14.x`
- `@testing-library/jest-dom`: `^6.x`

**WARNING: Do NOT pin exact versions without checking npm registry first. Run `npm install vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom -D` to get current latest.**

#### Configuration

Add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

Add `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add to `tsconfig.app.json` `compilerOptions`:

```json
"types": ["@testing-library/jest-dom"]
```

Add to `package.json` scripts:

```json
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

#### Why jsdom over happy-dom

`jsdom` is more spec-complete and better tested for complex DOM operations. `happy-dom` is faster but has edge cases with Supabase auth localStorage interactions. Use `jsdom`.

#### What NOT to use:
- **Jest** — would require a babel transform pipeline for this Vite/ESM project; unnecessary complexity
- **Playwright for unit tests** — Playwright is for E2E; use it separately for signup → checkout flow
- **happy-dom** — faster but less compatible with Supabase localStorage auth pattern

**Confidence: HIGH** — Vitest is the standard for Vite-based React projects and is maintained by the Vite team.

---

### 6. POPIA Compliance (SA Privacy Law)

**No npm package needed. This is a policy + implementation concern, not a library.**

**Confidence: MEDIUM** — POPIA requirements are well-documented; implementation patterns are standard web privacy practices.

POPIA (Protection of Personal Information Act, South Africa) applies to any processing of South African customer PII. For this product, PII collected includes: full name, business name, email, phone, physical address, logo/photos.

#### Required Implementation Items

| Requirement | Implementation |
|-------------|---------------|
| Lawful basis for processing | Record "contractual necessity" basis in privacy policy; displayed at signup with explicit acceptance checkbox |
| Privacy policy | Add to marketing site (`/privacy`); auto-link in generated customer sites' footers |
| T&Cs | Add to marketing site (`/terms`); link at payment step |
| Consent record | Store `popia_consent_at: timestamp` and `popia_consent_ip` in Supabase `profiles` table |
| Data subject access | Email-based process; note in privacy policy |
| Right to erasure | Add "Delete my account" flow → soft delete `profiles`, purge `client_sites`, remove Supabase Storage uploads |
| Data minimisation | Only collect fields needed for site generation; no unnecessary PII at signup |
| PII in generated sites | Generated customer sites should only include PII the customer explicitly provides; no storing of visitor PII on customer sites in v1 |
| Cross-border transfer | Supabase and Netlify are non-SA hosted; privacy policy must disclose this and rely on adequacy or contractual clauses |
| Information officer | Designate a responsible person (founders); email must appear in privacy policy |

#### Supabase Schema Additions Required

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  popia_consent_at TIMESTAMPTZ,
  popia_consent_ip TEXT;
```

#### What NOT to use:
- Cookie consent banners as POPIA compliance — POPIA is not primarily about cookies; it covers all PII processing. A cookie banner alone is not sufficient.
- Any generic GDPR library — POPIA has SA-specific requirements (Information Regulator, not EU supervisory authority)

---

## Summary Table: Net-New Stack Items

| Domain | Approach | Packages | Confidence |
|--------|----------|----------|------------|
| Netlify deployment | Raw fetch, ZIP upload via REST API | None | HIGH |
| ZADOMAINS domain registration | Raw fetch, bespoke client | None | LOW (docs unavailable) |
| Yoco payments (one-time) | CDN SDK + edge function fetch | None (CDN only) | MEDIUM |
| Yoco recurring billing | Manual recurring via stored token + cron | None | LOW (verify availability) |
| Claude structured codegen | `tool_choice: forced` pattern | None (existing SDK) | HIGH |
| Vitest test infra | Vitest + jsdom + RTL | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | HIGH |
| POPIA compliance | Policy + schema changes + consent UI | None | MEDIUM |

---

## Installation

```bash
# Test infrastructure (devDependencies only)
npm install -D vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

# Verify actual latest versions before pinning:
# npm info vitest version
# npm info @testing-library/react version
```

No other npm packages are required. All other integrations (Netlify, Yoco, ZADOMAINS) are raw HTTP clients built in Supabase edge functions.

---

## Alternatives Considered

| Category | Recommended | Alternatives Considered | Why Not |
|----------|-------------|------------------------|---------|
| Netlify client | Raw fetch (REST API) | `@netlify/js-client` | Thin wrapper; Deno import complexity; no benefit for narrow surface |
| Netlify deploy method | ZIP upload via API | Git-linked repo (current) | Git method adds 30–120s latency, requires GitHub org, creates cleanup debt |
| Payment processor | Yoco | Stripe, PayFast, Peach Payments | Yoco is SA-native; project constraint; simplest ZAR recurring path |
| Domain registrar | ZADOMAINS | Porkbun, Namecheap (via API), afrihost | ZADOMAINS is SA-native for `.co.za`; project constraint |
| Test runner | Vitest | Jest, Bun test | Jest needs Babel transform for ESM; Bun test is less mature with RTL |
| DOM environment | jsdom | happy-dom | jsdom more compatible with Supabase localStorage auth pattern |
| Claude output parsing | Forced tool use | Regex extraction (current), `response_format` JSON | Regex is fragile; `response_format` is OpenAI-only |

---

## Critical Research Gaps

The following require direct vendor contact or account access before implementation:

1. **ZADOMAINS API** — No public documentation found via any available tool. Need reseller account + API spec. This is a launch blocker. Budget 1–2 sprints for integration once docs are obtained.

2. **Yoco recurring billing** — Whether card tokenization for future charges exists in the current merchant tier. Contact Yoco developer support before building the subscription lifecycle feature. If not available: implement pg_cron-based manual recurring, or reconsider whether Yoco is viable for subscriptions.

3. **Netlify rate limits at scale** — 100 deploys/day is tight if early traction is strong. Pre-negotiate a higher limit with Netlify support before launch.

---

## Sources

- Netlify API get-started (official): `docs.netlify.com/api/get-started/` — HIGH confidence
- Netlify deploy-via-API (official): `docs.netlify.com/api/get-started/#deploy-with-the-api` — HIGH confidence
- Existing codebase analysis: `.planning/codebase/STACK.md`, `.planning/codebase/INTEGRATIONS.md`, `supabase/functions/build-site/index.ts` — HIGH confidence
- ZADOMAINS: No accessible documentation — LOW confidence
- Yoco: Official docs access blocked; training data knowledge cutoff August 2025 — LOW-MEDIUM confidence
- Vitest: Project TESTING.md recommendation + training data — HIGH confidence (standard ecosystem)
- POPIA: SA government publications + standard web privacy practice — MEDIUM confidence
