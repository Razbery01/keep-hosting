# keep-hosting

## What This Is

A fully automated web design agency for small, medium, and micro enterprises (SMMEs) in South Africa. Customers fill in a short onboarding form and upload a logo; Claude generates a unique HTML/CSS website for their business, which is then deployed to Netlify and attached to a `.co.za` domain registered through ZADOMAINS. There are no human designers in the loop.

## Core Value

An SA small business can go from "I need a website" to "my site is live on my own domain" in minutes, without talking to a designer and without touching code.

## Requirements

### Validated

<!-- Inferred from existing codebase — already shipped, though some pieces need hardening (see CONCERNS.md). -->

- ✓ React + Vite + TypeScript SPA scaffolded with Tailwind — existing
- ✓ Supabase auth (email/password) via `src/hooks/useAuth.ts` — existing
- ✓ Marketing pages: Home, About, Services, Pricing, Contact — existing
- ✓ Onboarding form (business details + logo upload) in `src/pages/OnboardingPage.tsx` — existing
- ✓ Domain search UI via Google DNS (placeholder — needs replacement with ZADOMAINS) — existing
- ✓ Customer dashboard + order page shells — existing
- ✓ Admin dashboard + admin orders pages (UI only — no auth gate) — existing
- ✓ Claude API site generation — partially working (needs quality + reliability improvements)
- ✓ Build-status polling with live preview component — existing

### Active

<!-- Everything below must ship before a real SMME can pay and go live. -->

- [ ] **Real domain search + registration** via ZADOMAINS API (replace Google DNS placeholder)
- [ ] **Netlify deployment pipeline** — programmatically create site, deploy generated files, attach custom domain via Netlify API
- [ ] **PayFast payment integration** — collect one-time setup fee and R49/mo recurring hosting subscription
- [ ] **Subscription lifecycle** — on failed payment: grace period, suspend site (Netlify unpublish), reactivate on payment
- [ ] **Claude generation hardening** — improve consistency, reliability, output quality; structured prompt pipeline
- [ ] **AI regeneration flow** — customer describes a change, AI regenerates affected sections without losing context
- [ ] **Admin authorization gate** — role check on `/admin*` routes and every admin-scoped Supabase query (currently a security hole)
- [ ] **File upload validation** — MIME type, size limit, filename sanitization on logo upload
- [ ] **Environment hygiene** — move Supabase credentials fully to `.env`, verify RLS coverage on every table
- [ ] **Customer site lifecycle** — view active sites, trigger regeneration, pause/cancel subscription
- [ ] **POPIA-compliant privacy policy + T&Cs** on the keep-hosting marketing site (and auto-included on generated customer sites)
- [ ] **Test infrastructure** — Vitest + @testing-library, baseline smoke tests for auth, admin gate, onboarding, payment

### Out of Scope

- **Human design services** — the whole premise is zero humans. No account managers, no revisions by a designer. Defer indefinitely.
- **Multi-page complex sites / CMS** — v1 generates a focused single-or-few-page business site. Full CMS is v2+.
- **International markets / other currencies** — ZAR only, SA-focused. Expansion is a later conversation.
- **Non-`.co.za` TLDs** (e.g. `.com`, `.org.za`, `.net.za`) — stick with `.co.za` via ZADOMAINS for launch. Broaden later.
- **Inline visual editing** — customers iterate via AI regeneration, not drag-and-drop. Keeps the product focused.
- **Email hosting / mailboxes** — hosting refers to the website only. Email is a clear upsell for later, not v1.
- **Mobile app** — web-first. Mobile comes much later if at all.
- **E-commerce / payments on generated sites** — generated sites are brochure-style in v1. "Add a shop" is v2+.

## Context

- **Codebase is brownfield.** See `.planning/codebase/` for full map. Existing code is React + Vite + TS + Supabase SPA. Claude-based generation is partially wired up but not production-ready.
- **Target market:** South African SMMEs — plumbers, restaurants, lawyers, consultants, trades, local services. Price-sensitive, usually no existing web presence.
- **Known security gaps** (from `CONCERNS.md`): admin routes unprotected, hardcoded Supabase fallback, file upload vulns, no real payment integration. Several are launch blockers.
- **Known fragility:** `OnboardingPage.tsx` is ~790 lines and doing too much; auth/submit race condition; polling with inconsistent cleanup; no central error logging.
- **No test infrastructure at all** — adds friction to every refactor and leaves security holes undetectable in CI.

## Constraints

- **Tech stack (locked):** React + Vite + TypeScript + Supabase. The existing scaffold stays; new work builds on it.
- **Generation engine (locked):** Claude via Anthropic API. No switching to other LLMs for v1.
- **Hosting (locked):** Netlify for customer sites, driven programmatically via Netlify API.
- **Domains (locked):** ZADOMAINS API for `.co.za` registration and management.
- **Payments (locked):** PayFast for SA-native card + EFT, supporting recurring billing for the R49/mo subscription. Switched from Yoco on 2026-04-10 because PayFast has documented recurring billing (native subscriptions), well-documented ITN webhooks, and a full sandbox environment — removing the PAY-01 vendor-contact blocker.
- **Currency:** ZAR only. No multi-currency support.
- **Budget / infra:** Unit economics depend on Claude API cost per site + Netlify free/paid tiers + ZADOMAINS wholesale domain cost + PayFast fees all staying below the setup fee. Generation cost needs monitoring from day one.
- **Compliance:** POPIA (SA's privacy law) applies to customer PII collected during onboarding. Privacy policy + lawful basis required before launch.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fully automated, zero humans in loop | Only way to profitably serve price-sensitive SA SMMEs at R49/mo | — Pending |
| Claude via API as generation engine | Current best-in-class code generation; user already wired it partially | — Pending |
| Short form + logo as the only input | Maximizes conversion; AI infers the rest from business context | — Pending |
| AI regeneration (not inline editing) | Keeps product scope focused; avoids rebuilding a site builder | — Pending |
| Setup fee + R49/mo hosting | Covers Claude API cost at signup; recurring covers ongoing hosting/domain renewal | — Pending |
| Netlify for customer site hosting | Programmatic API, fast CDN, custom domain attachment built-in | — Pending |
| ZADOMAINS for `.co.za` registration | SA-native registrar with API access — avoids upstream GoDaddy/Namecheap complexity | — Pending |
| PayFast for payments | SA-native, documented recurring subscriptions + ITN webhooks + sandbox. Switched from Yoco 2026-04-10 to remove PAY-01 vendor-contact blocker | — Pending |
| Brownfield build-on-existing (no rewrite) | Existing scaffold is sound; rewriting loses sunk work and shipped learnings | — Pending |

---
*Last updated: 2026-04-09 after initialization*
