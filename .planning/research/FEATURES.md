# Feature Landscape: AI Website Builder for SA SMMEs

**Domain:** Automated AI web-design agency / hosted website builder
**Researched:** 2026-04-09
**Overall confidence:** MEDIUM (training data August 2025; external sources unavailable at research time — flag for spot-check against live competitors before milestone planning)

---

## Research Basis

Competitors benchmarked (from training data, cutoff August 2025):
- **Durable** — fastest AI site generation (30 seconds), minimal input, built-in CRM + invoicing
- **Hocoos** — conversational AI onboarding (~10 questions), subscription editing, AI SEO tools
- **Mixo** — single idea-to-landing-page flow, email capture focus, ultra-minimal
- **Bookmark AiDA** — AIDA assistant builds via conversation, drag-drop post-generation editor
- **10Web AI** — WordPress-based, AI builder for existing WP users, hosting + page speed
- **Framer AI** — code-quality output, designer-oriented, prompt-driven layout
- **Lovable** — full-stack app generation (Supabase + React), developer-oriented
- **Wix ADI** — legacy industry standard, question flow → site, drag-drop editor, app market
- **Squarespace AI** — Blueprint AI (style quiz + page selection), polished templates, subscription
- **Yola** — SA/international small biz builder, shared hosting model, template-based
- **Local SA web agencies** — bespoke quotes, R3,000–R20,000 setup, 4–8 week delivery

---

## Table Stakes

Features users expect when evaluating an AI website builder. Missing = product feels broken or untrustworthy compared to any competitor on the benchmark list.

| Feature | Why Expected | Complexity | In Codebase? | Notes |
|---------|--------------|------------|--------------|-------|
| **Short onboarding form** (business name, industry, description, location) | Every competitor collects this as minimum viable input. Durable does it in 3 fields. | Low | YES — `OnboardingPage.tsx` (3-step form) | Exists but monolithic; needs extraction |
| **Logo upload** | Professional credibility signal; Wix ADI, Hocoos, and Bookmark all accept logo. Absence makes AI output look generic. | Low | YES — logo upload in onboarding | Upload exists; needs MIME/size validation |
| **AI site generation from form inputs** | Core premise of every competitor. Users expect to see something in <2 min. | High | YES — Edge Function + Claude (partially working) | Reliability/quality needs hardening |
| **Live build-progress indicator** | Users will not stare at a blank screen waiting. Hocoos shows a spinner with steps; Durable shows a "building" animation. Trust collapses without feedback. | Low | YES — `BuildProgress` component, polls `build_events` | Polling has cleanup issues |
| **Generated site preview** | Users must see what they're getting before paying or going live. All competitors show preview. | Medium | YES — `LivePreview` component | Exists; re-render perf issue noted |
| **Custom domain support** | Every paid tier across all competitors includes custom domain. This is the #1 reason SMMEs upgrade from free tiers. Without it, the product is a toy. | Medium | PARTIAL — domain search UI exists, no registration wired | ZADOMAINS API integration pending |
| **SSL / HTTPS** | Non-negotiable since 2018. Browsers flag HTTP sites. Netlify provides this automatically on custom domains. | Low | YES — Netlify provides this free via Let's Encrypt | Automatic once Netlify deploy is wired |
| **Customer account / login** | Users need to return, view their site, manage subscription. All competitors require account. | Low | YES — Supabase auth, login/signup pages | Working; admin gate has security gap |
| **Customer dashboard** (view active sites, build status) | Table stakes for any SaaS product. | Low | YES — `DashboardPage` shell exists | Shell only; needs site lifecycle wiring |
| **Payment collection** | Real money changes hands. No competitor ships without this. | High | NO — completely absent; orders exist but no charge | Yoco integration is launch blocker |
| **Subscription management** (cancel, view plan, billing history) | Users expect self-service. Competitors provide this in account settings. | Medium | NO — not built | Needed for Yoco recurring lifecycle |
| **Email notification on site live** | Transactional email on signup + build completion is standard. Absence causes support tickets ("did it work?"). | Low | NO — no transactional email at all | Supabase Edge Function can trigger email via Resend/SendGrid |
| **AI regeneration / change requests** | Durable, Hocoos, and Bookmark all let users describe a change and re-generate. Without this, customers are stuck with first output. | High | PARTIAL — flow planned, not built | Defined in PROJECT.md as "Active" item |
| **Privacy policy / T&Cs on generated sites** | Legal baseline in every jurisdiction. SA POPIA specifically requires this. | Low | NO — not built | POPIA requirement for launch |
| **Mobile-responsive output** | Google ranks non-responsive sites down. All competitors generate responsive HTML. Every SMME customer will check on their phone. | Medium | PARTIAL — depends on Claude prompt quality | Needs to be enforced in generation prompt |

---

## Differentiators

Features that would make keep-hosting meaningfully better than alternatives for an SA SMME. Not universally expected, but valued by this specific market.

| Feature | Value Proposition | Complexity | In Codebase? | Notes |
|---------|-------------------|------------|--------------|-------|
| **`.co.za` domain registration in checkout** | SA SMMEs strongly prefer `.co.za` over `.com` for local credibility. No international competitor offers this natively. Durable uses `.com` + `.ai`; Wix requires separate purchase. | Medium | PARTIAL — domain search UI exists, ZADOMAINS not wired | ZADOMAINS API integration is the differentiator |
| **ZAR pricing (R49/mo)** | All major competitors price in USD. Durable: $15/mo, Hocoos: $8.99/mo. At the current USD/ZAR rate (~R18–19), R49/mo is genuinely competitive. Local pricing = no bank forex fee. | Low | YES — pricing page shows ZAR | Needs Yoco to make it real |
| **Yoco payment (card + EFT)** | International processors (Stripe, PayPal) have poor SA acceptance rates on cheap SA Visa/Mastercard. Yoco is the de-facto SA payments standard for SMMEs. Competitors don't offer EFT. | High | NO — not built | Core differentiator once wired |
| **POPIA compliance messaging and privacy policy** | SA-specific legal requirement most international competitors gloss over. Explicitly calling out POPIA compliance builds trust with SA customers. | Low | NO — not built | Should be prominent in onboarding + T&Cs |
| **WhatsApp support channel** | SA SMME communication norm. Email support is too slow for this market; phone costs too much at R49/mo. WhatsApp = instant trust. | Low | YES — `WhatsAppChatButton` in layout | Exists; needs a real monitored number |
| **Industry-contextual content generation** | Generating a site that "knows" how a plumber in Johannesburg sounds vs. a Cape Town law firm. Durable generates generic placeholder copy. Hocoos is better but still international in tone. | High | PARTIAL — Claude prompt includes industry + business info | Quality of industry specialisation needs prompt engineering |
| **Setup-fee + low recurring model** | SA SMMEs are cash-flow sensitive. They prefer to pay once to "get the website" and then a small monthly. This matches how they think about services, unlike Durable's pure subscription. | Low | YES — pricing model defined | Needs Yoco to implement |
| **No technical knowledge required, zero code** | Stronger than Framer AI (needs design sense) or Lovable (needs dev sense). The full target is the plumber who has never logged into cPanel. | Medium | YES — onboarding form targets this | Needs UX review + copy tuning for SA SMME literacy |
| **Fast generation claim (sub-2 min)** | Durable's "30-second website" is their #1 marketing hook. keep-hosting's pipeline (Claude + GitHub + Netlify) will be slower — honest positioning around "minutes, not weeks" is the counter-claim. | Low | N/A — marketing copy | Depends on pipeline reliability |
| **Admin queue + manual intervention** | For launch with small volumes: operator can unblock stuck builds, regenerate on behalf of customer, manage orders. Competitors don't expose this because they're self-serve at scale — but for an SA launch this is a real safety net. | Medium | PARTIAL — admin UI shell exists, no auth gate | Admin security is a blocker |

---

## Anti-Features

Features to deliberately NOT build for v1. Each one could consume a sprint and distract from core differentiation.

| Anti-Feature | Why Avoid | What to Do Instead | Priority to Avoid |
|--------------|-----------|-------------------|-------------------|
| **Drag-and-drop visual editor** | Wix, Squarespace, Bookmark, and Framer all have this. It takes years to build well. It contradicts the "AI regeneration not editing" thesis. Users who want drag-drop should use Wix. | Offer AI regeneration ("change the hero section to show a team photo") as the editing primitive | CRITICAL — do not start this |
| **CMS / blog / dynamic content** | Durable added CRM + invoicing; 10Web adds WP plugins. All of these are feature bloat for a plumber who needs a contact page. | Generate a clean static HTML brochure site. CMS is explicitly v2+. | HIGH |
| **E-commerce / shop on generated sites** | Complex: inventory, cart, payment, tax (VAT for SA). Competitors charge $30–$50/mo for this tier. Wrong for launch. | "Online shop" is a future upsell. Note it on pricing page as "coming soon" to retain interest. | HIGH |
| **Multi-page CMS with navigation builder** | Bookmark AiDA and 10Web generate multi-page sites with nav editors. Massive scope. | Generated sites can have multiple sections (hero, services, about, contact) within a single-page scroll layout. That covers 90% of SA SMME needs. | HIGH |
| **Email hosting / mailboxes** | Different infrastructure (MX records, SMTP, spam filtering). Competitors (Yola, cPanel hosts) bundle this and use it to justify higher prices. Not the differentiator here. | Mark as a future add-on. Resell a third-party email product later. | MEDIUM |
| **International TLDs (`.com`, `.org`, `.net`)** | Dilutes the SA `.co.za` story. ZADOMAINS wholesale pricing is optimised for `.co.za`. | Support `.co.za` only at launch. | MEDIUM |
| **Team / multi-user accounts** | Agencies and resellers want this. The SA SMME target is a solo operator. | Single-owner account model. Reseller tier is v3+. | MEDIUM |
| **AI chatbot / live chat widget on generated sites** | Intercom, Tidio, etc. integrate easily, but support overhead and pricing complexity. | Include WhatsApp button in generated site (static link — zero overhead). | LOW |
| **Social media scheduling / integration** | Some AI site builders (Hocoos) add social post generation. Scope creep for launch. | Marketing copy can mention "shareable" sites. | LOW |
| **Mobile app (iOS/Android)** | The product is web-first. SA SMME market accesses everything from Chrome on Android, not native apps. | Mobile-responsive web dashboard is sufficient. | LOW |
| **A/B testing / conversion optimisation** | Enterprise feature. Not relevant at R49/mo. | Not mentioned anywhere until v4+. | LOW |

---

## Feature Dependencies

Critical ordering constraints for implementation:

```
Yoco payment integration
  → Subscription lifecycle (grace period, suspend, reactivate)
  → Customer billing dashboard (view invoices, cancel)
  → Setup fee collection at onboarding submission

ZADOMAINS domain registration
  → Domain search (replace Google DNS with ZADOMAINS availability API)
  → Domain attach to Netlify (post-registration hook)
  → Domain renewal reminders (email notification)

Netlify deployment pipeline (fully wired)
  → Custom domain attach
  → SSL auto-provisioning
  → Site suspend/reactivate (subscription lifecycle)

Admin authorization gate
  → Admin order queue
  → Manual build intervention
  → Analytics visibility for operator

Transactional email (Resend or similar)
  → Build complete notification
  → Payment confirmation
  → Failed payment warning
  → Domain expiry warning

AI generation hardening
  → AI regeneration flow (customer-initiated change requests)
  → Mobile-responsive output guarantee

POPIA-compliant T&Cs / privacy policy
  → Include on keep-hosting marketing site
  → Auto-include in generated customer sites
```

---

## MVP Feature Recommendation

The absolute minimum set for a real SA SMME to pay, go live, and not churn in month 1:

**Prioritize:**
1. Yoco payment (setup fee + R49/mo) — without this it's a demo
2. ZADOMAINS domain registration wired into checkout
3. Netlify deploy pipeline fully automated (includes custom domain + SSL)
4. Admin authorization gate (security blocker)
5. Transactional email (build complete, payment confirm)
6. POPIA T&Cs on both marketing site and generated sites
7. AI generation quality hardening (mobile-responsive, industry-specific)
8. Customer dashboard: view site, trigger regeneration, view subscription status

**Defer post-launch:**
- AI regeneration flow (allow customers to request via WhatsApp in v1 — human-assisted fallback is acceptable at low volume)
- Full self-serve subscription management UI (manual Yoco dashboard is acceptable for first 50 customers)
- Analytics / error observability (Sentry) — important but not a customer-facing launch blocker

---

## SA-Specific Feature Notes

| Feature | SA Context | Urgency |
|---------|-----------|---------|
| **Yoco recurring billing** | Stripe does not offer recurring in SA without complex workarounds. Yoco has native tokenised card charging. Mandatory. | Launch blocker |
| **ZAR pricing, no forex** | SA bank card declines on USD transactions are common for SMMEs. ZAR billing avoids this entirely. | Launch blocker |
| **`.co.za` domain** | SA customers trust `.co.za` over `.com` for local business. It signals "this is a real SA business." | Launch blocker |
| **POPIA compliance** | SA's Protection of Personal Information Act. Requires explicit consent, privacy policy, lawful basis for processing. Non-compliance is a legal risk. | Launch blocker |
| **WhatsApp support** | SA SMMEs do business on WhatsApp. A support WhatsApp number converts better than a support email in this market. | High |
| **Load-shedding resilience** | SA has intermittent power outages. Generated sites must be static and served from a CDN (Netlify does this) so they stay up even when the customer's local internet is down. | Medium (Netlify CDN covers this automatically) |
| **Afrikaans / multilingual copy option** | A segment of SA SMMEs (especially Western Cape) prefer Afrikaans. Not v1, but note for future. | Low (v2+) |
| **Local payment methods (EFT/instant EFT)** | Yoco supports EFT. Make sure the checkout UI surfaces this prominently — SMMEs sometimes distrust online card entry. | Medium |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes features | MEDIUM | Based on training data (August 2025). Competitors evolve fast; Durable in particular ships new features monthly. Spot-check live competitors before finalising milestone. |
| Differentiators (SA-specific) | HIGH | ZAR, Yoco, `.co.za`, POPIA, WhatsApp are structural SA market facts unlikely to change. |
| Anti-features | HIGH | These reflect deliberate project decisions already encoded in PROJECT.md Out of Scope section. |
| Competitor feature parity | MEDIUM | Wix ADI, Squarespace, Durable features well-documented in training data. Hocoos, Mixo less detailed — verify current feature set. |

---

## Sources

- Training data (August 2025 cutoff): Durable, Hocoos, Mixo, Bookmark AiDA, 10Web, Framer AI, Lovable, Wix ADI, Squarespace AI, Yola feature sets
- `/Users/kirkmaddocks/keep-hosting/.planning/PROJECT.md` — validated and active requirements, out of scope decisions
- `/Users/kirkmaddocks/keep-hosting/.planning/codebase/ARCHITECTURE.md` — current codebase feature map
- `/Users/kirkmaddocks/keep-hosting/.planning/codebase/CONCERNS.md` — known gaps and launch blockers
- External fetch tools unavailable at research time — recommend manual spot-check of durable.co, hocoos.com, mixo.io before milestone planning
