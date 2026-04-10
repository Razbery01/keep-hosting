# Phase 2: Generation Hardening - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Gathering mode:** Claude's judgment (user delegated via "Skip discussion, use my judgment")

<domain>
## Phase Boundary

Make the Claude-powered site generation pipeline reliable, server-side-only, cost-controlled, and mobile-responsive. Fix the onboarding form race condition on slow networks. Replace the 3-second polling loop on the customer dashboard with Supabase Realtime.

**Explicitly in scope:** Everything inside `supabase/functions/build-site/index.ts` that pertains to Claude (both Image Agent and Code Agent), plus the `setTimeout` band-aid in `src/pages/OnboardingPage.tsx:118`, plus the build-status polling in whatever component consumes `build_events`.

**Explicitly out of scope for this phase (other phases):**
- GitHub intermediary + Netlify deploy logic — Phase 3 rips this out
- Yoco payment as build trigger — Phase 4
- Customer-initiated AI regeneration flow — Phase 5
- Admin dashboard UI for Claude cost — Phase 6 (this phase only ensures the data is *captured*)
- POPIA consent UI surface — Phase 6 (this phase must respect a consent flag if present, but doesn't build the UI)

</domain>

<decisions>
## Implementation Decisions

### Claude API — structured output (GEN-01)

- Replace regex parsing (`textBlock.text.match(/\{[\s\S]*"files"[\s\S]*\}/)`) with `tool_choice: { type: 'tool', name: 'deliver_site_files' }` on the Code Agent call
- Apply the same pattern to the **Image Agent** call (currently uses `text.match(/\[[\s\S]*\]/)` for Pexels queries) — tool name: `deliver_search_queries`
- Tool schemas:
  - `deliver_site_files`: input is `{ files: Array<{ path: string, content: string }> }` where `path` matches `^(index\.html|pages/[a-z0-9-]+\.html|assets/[a-z0-9./-]+)$`
  - `deliver_search_queries`: input is `{ queries: Array<{ query: string, placement: string, alt: string }> }`
- Keep `messages.stream()` + `stream.finalMessage()` — streaming IS compatible with `tool_choice`. Live progress logging still works; only the parse step changes.
- **Remove `thinking` entirely.** The Anthropic API rejects `thinking: { enabled }` combined with forced `tool_choice: { type: 'tool' }` (HTTP 400: "Thinking may not be enabled when tool_choice forces tool use"). Delete the current `thinking: { type: 'adaptive' }` setting. GEN-01 (structured output) is the locked requirement; `thinking` was a discretionary cost-control add-on that cannot coexist with it. Resolved in favor of `tool_choice` on 2026-04-09 after research surfaced the conflict.

### Token budget (GEN-03 reconciliation)

**GEN-03's "4096 output tokens" is wrong for this product.** Enterprise multi-page sites cannot fit in 4k. The original intent of GEN-03 (hard cap, cost control) is honored via **per-package caps** instead:

| Package | Max output tokens | Reasoning |
|---------|-------------------|-----------|
| Starter | 12,000 | Single-page site with 4–6 sections |
| Professional | 24,000 | 4 pages with richer content |
| Enterprise | 48,000 | 6+ pages with portfolio/gallery/FAQ |

- Hard retry cap: **max 2 retries total** (3 attempts including the first)
- **Never retry 4xx** (400, 401, 403) — fail loudly immediately
- **Retry only 429, 529, 5xx** with exponential backoff (2s, 8s) + jitter (±25%)
- Record every attempt's token count in `client_sites.generation_cost` (see Cost Tracking below)

**REQUIREMENTS.md GEN-03 needs a minor update during planning** to reflect per-package caps instead of the blanket 4,096.

### Pipeline shape — keep the split

- **Keep the Image Agent + Code Agent split.** Don't collapse them. They're already working, separation of concerns is clean, and the Image Agent is cheap (<2k tokens per call).
- Both agents get the `tool_choice` treatment (see GEN-01 above).
- If the Image Agent fails, fall back to `getCuratedImages(industry)` — the fallback is already wired.
- If the Code Agent fails after max retries, mark `client_sites.build_status = 'failed'` with a structured error payload (not just a string).

### Edge Function splitting (GEN-08)

Split the current monolithic `build-site/index.ts` into a chain of smaller Edge Functions to stay under Supabase's 150s wall-clock limit per invocation:

| Function | Purpose | Invoked by |
|----------|---------|------------|
| `generate-site` | Image Agent + Code Agent + HTML scanner | Yoco webhook (Phase 4), or admin retry |
| `persist-files` | Write generated files to Supabase Storage (bucket `client-sites/{site_id}/`) | `generate-site` on success |
| `build-orchestrator` (new) | Tiny coordinator — reads `client_sites` state and invokes the next function in the chain | Cron trigger + webhook fan-in |

- Chain via `supabase.functions.invoke('next-function', { body: { siteId } })` with idempotency — each function is safe to re-run.
- State transitions recorded in `build_events` (already exists).
- **Note:** Phase 3 adds the `deploy-site` function (Netlify zip upload). Don't build it here. This phase leaves `client_sites.build_status` at `generated` when its work is done.

### Generation queue + rate limiting (GEN-05)

- **Use `client_sites` as the queue state.** Add three columns in a migration:
  - `retry_count INT DEFAULT 0`
  - `last_attempted_at TIMESTAMPTZ`
  - `next_retry_at TIMESTAMPTZ`
- Rate limiting: a small Edge Function cron (or Postgres `pg_cron` job) picks the oldest `pending`/`retry` row where `next_retry_at <= now()` and invokes `generate-site`. Concurrency cap: 2 concurrent generations for launch.
- Do NOT build a dedicated `generation_jobs` table. The state machine IS the queue. Over-engineering for launch volume.
- Visible side effect: `build_events` shows a `retry_scheduled` row with the planned `next_retry_at`.

### CUST-05 — onboarding race condition fix

**Dead simple fix.** In `src/pages/OnboardingPage.tsx:118`:

```ts
// BEFORE (broken on slow networks):
setTimeout(() => handleSubmit(), 500)

// AFTER (correct):
await handleSubmit()
```

`handleSubmit()` already calls `await supabase.auth.getUser()` at its first line — it re-fetches the user regardless of what the `useAuth` hook state says. The `setTimeout` was a band-aid that just slowed everyone down and still failed on slow networks.

Additionally: add a single Vitest test that mocks `signUp` to resolve slowly and asserts `handleSubmit` is called once without the `setTimeout`.

### Mobile-responsive enforcement (GEN-04)

Two layers:

1. **Hard check (blocks deploy):**
   - Generated HTML MUST contain `<meta name="viewport" content="width=device-width, initial-scale=1">`
   - If missing, fail the build with a clear error
   - Implement inside `html-scanner.ts` as an additional rule (extend the existing SEC-07 scanner)

2. **Soft check (warn + log, doesn't block):**
   - Scan generated CSS/inline styles for hardcoded layout widths on container-level selectors (`body`, `main`, `.container`, `section`) like `width: 1200px`
   - Log violations to `build_events` as `mobile_warning`
   - Does NOT fail the build — just feeds back for future prompt tuning

3. **Prompt enforcement (preventative):**
   - Code Agent system prompt must explicitly state: "Use Tailwind responsive utilities (sm:, md:, lg:). Never use hardcoded pixel widths for layout containers. Always include `<meta name='viewport' content='width=device-width, initial-scale=1'>` in every HTML file."
   - This lives in the `CODE_AGENT_SYSTEM` constant in `build-site/index.ts` (refactor: extract to `supabase/functions/_shared/prompts.ts` for testability)

**Not in scope:** Playwright visual responsiveness check. Too slow for the generation path. Add later as part of the admin QA suite if needed.

### Industry-contextual prompting (GEN-06)

- Create `supabase/functions/_shared/industry-hints.ts` with a typed map: `Record<Industry, { copy_hints: string[], cta_examples: string[], section_priority: string[] }>`
- Populate for at least these SA SMME verticals: `plumber`, `electrician`, `restaurant`, `lawyer`, `consultant`, `trades-general`, `beauty`, `other`
- Inject into `CODE_AGENT_SYSTEM` prompt via a `{industry_hints}` slot
- Example for `plumber`:
  - copy_hints: ["24/7 emergency callouts", "call-out fee transparency", "service areas in the city"]
  - cta_examples: ["Call now for emergencies", "Get a free quote"]
  - section_priority: ["hero with phone CTA", "emergency services", "service areas", "testimonials"]
- If industry is unknown or `other`: fall back to a neutral hint set (no crash)
- **Do not hardcode SA-specific locations** in the hints — the onboarding form already captures `city`/`province`, use those.

### Cost tracking (GEN-07)

- Record to `client_sites.generation_cost` JSONB on every build attempt (append, don't overwrite):

```json
{
  "attempts": [
    {
      "attempt": 1,
      "started_at": "2026-04-09T21:15:00Z",
      "image_agent": { "input_tokens": 412, "output_tokens": 380, "cache_read_tokens": 0 },
      "code_agent":  { "input_tokens": 3200, "output_tokens": 18400, "cache_read_tokens": 1200 },
      "total_input_tokens": 3612,
      "total_output_tokens": 18780,
      "total_usd": 0.0891,
      "total_zar": 1.68,
      "status": "success"
    }
  ],
  "lifetime_total_usd": 0.0891,
  "lifetime_total_zar": 1.68
}
```

- Pricing constants: hardcoded in `_shared/cost-calc.ts` (Sonnet 4.6 Apr 2026 rates). Document them + cite the source so they're easy to update.
- ZAR conversion: **hardcode at 18.85** for launch — exchange rate API is not worth the infra here. Document as a decision in `_shared/cost-calc.ts`. Admin dashboard (Phase 6) can show "ZAR values assume USD/ZAR = 18.85 as of 2026-04-09".
- Do NOT fail the build if cost logging fails — wrap in try/catch and log to `build_events`.

### Realtime replaces polling (GEN-09)

- Customer dashboard component subscribes to Supabase Realtime channel filtered on `build_events` where `site_id = <currentSiteId>`
- On `INSERT` event, append to the visible build log
- On `client_sites` row update (status transitions), update the UI state
- **Keep a 10-second polling fallback** for when the Realtime WebSocket drops (not the current 3-second aggressive poll — Realtime is the primary, polling is last-resort)
- Use `useEffect` with strict cleanup (unsubscribe on unmount) to fix the timer leaks noted in CONCERNS.md

### Claude's Discretion

These are flexible — planner and executor decide during implementation:

- Exact tool schema field names (as long as they match the patterns above)
- Whether the industry hint map lives in TypeScript or a JSON file
- Backoff jitter implementation detail (library vs inline)
- How to structure the cross-function type definitions for the chained Edge Functions
- Whether to use `Deno.cron` or a Supabase-managed `pg_cron` job for the retry scheduler
- Test structure for the Edge Functions (Node vs Deno runtime) — prefer Node Vitest via pure-TS shared modules, same pattern as Phase 1 sanitize/html-scanner

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `supabase/functions/build-site/index.ts` (581 lines) — current monolithic build function. Contains Image Agent, Code Agent, SEC-07 HTML scan (already wired in Phase 1), GitHub deploy, Netlify deploy. Phase 2 refactors the Claude parts and leaves the GitHub/Netlify parts alone (Phase 3 removes them).
- `supabase/functions/_shared/sanitize.ts` — SEC-06 prompt sanitizer (Phase 1). Already called inside build-site. Re-use as-is.
- `supabase/functions/_shared/html-scanner.ts` — SEC-07 generated HTML safety scan. Extend with the viewport meta check (GEN-04 hard layer).
- `supabase/functions/_shared/cors.ts`, `supabase/functions/_shared/supabase-admin.ts` — existing helpers. Keep.
- `build_events` table — already exists, already being written to. Keep.
- `client_sites.generation_cost` column (JSONB) — added in Phase 1 migration 003. Write to it.
- `client_sites.generated_files` column (JSONB) — added in Phase 1 migration 003. Phase 2 writes generated files to Supabase Storage AND mirrors metadata here.
- `src/hooks/useAuth.ts` — provides session state. Not the bottleneck for CUST-05; see decisions above.
- Pexels fallback `getCuratedImages(industry)` — already in build-site. Keep.

### Established Patterns

- **Claude SDK via Deno npm:** `import Anthropic from 'npm:@anthropic-ai/sdk'` — working pattern. Keep.
- **Streaming:** `anthropic.messages.stream(...)` + `await stream.finalMessage()` — working. Streaming-compatible tool_use is supported by the SDK.
- **Event logging:** `await logEvent(supabase, siteId, eventType, status, message)` helper writes to `build_events`. Use this for every state transition.
- **Error surfacing:** Current build catches errors and updates `client_sites.build_status = 'failed'`. Extend to also capture the failure reason in a structured way.
- **Shared pure-TS modules:** Phase 1 established the pattern of pure TypeScript modules in `_shared/` that work in both Node Vitest and Deno Edge Functions (no `Deno.*` references). Continue this for any new shared code (cost-calc, industry-hints, prompts).

### Integration Points

- **Entry point:** `generate-site` Edge Function is invoked by the existing onboarding flow (and later by the Yoco webhook in Phase 4). Signature stays: `POST { siteId }`.
- **Exit point:** After Phase 2, `client_sites.build_status` transitions reach `generated` (files persisted in Storage). Phase 3 picks up from there and deploys.
- **Front-end consumer:** Whatever component renders the build log on the customer dashboard / onboarding page. It currently polls `build_events` every 3s. Replace with Realtime subscription.
- **Admin dashboard:** Read `client_sites.generation_cost` for per-build cost view. Phase 6 builds the UI.

</code_context>

<specifics>
## Specific Ideas

- "Generation cost must never exceed the setup fee" — hard constraint from PROJECT.md. Monitoring should alert (Phase 6) if a single build costs more than R25 (≈ 50% of R49 setup assumption). For now, just log and surface in `generation_cost`.
- Streaming the build log to the customer while generation happens is valuable — it's the only UX feedback during a 30–90s wait. Do not regress this when adding tool_choice.
- The existing `CODE_AGENT_SYSTEM` prompt is reasonable — don't rewrite from scratch. Extract to `_shared/prompts.ts`, add the industry hints slot, add the mobile-responsive enforcement line, done.
- Cost telemetry shape should be forward-compatible with Phase 6's admin dashboard and with future per-user cost attribution. The `attempts[]` array captures per-attempt cost, so both rollups (per-build, per-user, per-day) are possible.

</specifics>

<deferred>
## Deferred Ideas

- **Promote Code Agent back to Sonnet 4.6** — Free tier Supabase has a 50s Edge Function wall clock. Sonnet 4.6 generating 12k tokens of HTML/CSS takes ~120-150s, which doesn't fit. Code Agent was switched to `claude-haiku-4-5-20251001` on 2026-04-09 to make Phase 2 land on Free tier. When upgrading to Supabase Pro (150s window), revert one line in `supabase/functions/generate-site/index.ts` to use `claude-sonnet-4-6` and re-run cost calibration. The Image Agent already uses Sonnet 4.6 — only the Code Agent was downgraded.
- **Refine cost-calc.ts for multi-model pricing** — Currently hardcodes Sonnet 4.6 pricing. With Code Agent on Haiku, the per-build cost will over-report by ~5×. After Pro upgrade and Sonnet promotion, this auto-corrects. If staying on Haiku longer, refactor `calcCostUsd()` to accept a model parameter.
- **Playwright visual mobile-responsive QA** — too slow for the generation path. Revisit as a post-build admin QA job or a weekly batch.
- **Alternative models (Opus for Enterprise tier)** — could be a pricing lever. Not for launch; Sonnet 4.6 for everyone.
- **Prompt caching across customers** — Anthropic's cache could cut costs on the system prompt portion. Worth ~30% cost reduction but adds complexity. Defer to post-launch optimization.
- **Per-customer cost budgets / hard caps** — "this customer has cost R200 in retries this month, pause generation". Important for abuse prevention at scale; not needed for pre-launch.
- **Dedicated `generation_jobs` queue table** — if concurrent volume grows past ~5 simultaneous builds, revisit. `client_sites` as the queue works for launch.
- **FX rate API integration** — swap hardcoded 18.85 for a live rate when billing granularity actually matters.
- **Streaming the tool_use partial JSON** — the SDK supports this but it's complex. Use `stream.finalMessage()` to get the complete tool input at the end; stream only the human-readable log messages in between.
- **A/B testing prompt variants** — post-launch optimization.
- **Multi-language generation (Afrikaans, isiZulu)** — deferred to V2-EDIT-04.

</deferred>

---

*Phase: 02-generation-hardening*
*Context gathered: 2026-04-09*
