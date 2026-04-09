# Phase 2: Generation Hardening - Research

**Researched:** 2026-04-09
**Domain:** Anthropic SDK tool_choice + streaming, Supabase Edge Function chaining, Supabase Realtime, cost calculation, CUST-05 race condition
**Confidence:** HIGH for Anthropic SDK behavior and pricing (verified from official docs). HIGH for CUST-05 fix (verified from code). MEDIUM for Supabase function chaining patterns. MEDIUM for Deno.cron vs pg_cron recommendation.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Replace regex parsing with `tool_choice: { type: 'tool', name: 'deliver_site_files' }` on Code Agent and `tool_choice: { type: 'tool', name: 'deliver_search_queries' }` on Image Agent
- Keep `messages.stream()` + `stream.finalMessage()` — streaming is compatible with `tool_choice`
- Change `thinking: { type: 'adaptive' }` to `thinking: { type: 'enabled', budget_tokens: 8000 }`
- **CRITICAL CONFLICT DISCOVERED:** See Critical Finding below — `thinking: { type: 'enabled' }` + `tool_choice: { type: 'tool' }` is an API error. The planner must resolve this by choosing one or the other.
- Per-package output token caps: Starter 12,000 / Professional 24,000 / Enterprise 48,000
- Hard retry cap: max 2 retries (3 total attempts); never retry 4xx; retry 429/529/5xx with exponential backoff (2s, 8s) + ±25% jitter
- Record every attempt's token count in `client_sites.generation_cost` (JSONB, append-mode with per-attempt structure)
- Keep Image Agent + Code Agent split
- Split monolithic `build-site/index.ts` into `generate-site`, `persist-files`, `build-orchestrator`
- Use `client_sites` as the queue state — add `retry_count`, `last_attempted_at`, `next_retry_at` columns
- CUST-05 fix: remove `setTimeout(() => handleSubmit(), 500)` — replace with `await handleSubmit()`. Add one Vitest test.
- GEN-04: viewport meta hard check in `html-scanner.ts` (blocks deploy if missing); CSS width soft check (warn only, `mobile_warning` build_event)
- Mobile prompt enforcement via system prompt in `_shared/prompts.ts`
- GEN-06: `_shared/industry-hints.ts` with typed map for SA SMME verticals (at minimum: plumber, electrician, restaurant, lawyer, consultant, trades-general, beauty, other)
- GEN-07: Cost tracked in `client_sites.generation_cost` JSONB, pricing hardcoded in `_shared/cost-calc.ts`, ZAR at 18.85
- GEN-09: Supabase Realtime replaces 3-second polling; keep 10-second polling fallback
- POPIA consent flag: respect if present (don't build the UI)
- `build_events` table already exists — use `logEvent()` helper for all state transitions

### Claude's Discretion

- Exact tool schema field names (as long as they match the patterns above)
- Whether the industry hint map lives in TypeScript or a JSON file
- Backoff jitter implementation detail (library vs inline)
- Cross-function type definitions structure for chained Edge Functions
- Whether to use `Deno.cron` or a Supabase-managed `pg_cron` job for the retry scheduler
- Test structure for Edge Functions — prefer Node Vitest via pure-TS shared modules

### Deferred Ideas (OUT OF SCOPE)

- Playwright visual mobile-responsive QA
- Alternative models (Opus for Enterprise tier)
- Prompt caching across customers
- Per-customer cost budgets / hard caps
- Dedicated `generation_jobs` queue table
- FX rate API integration
- Streaming the tool_use partial JSON (use `stream.finalMessage()` instead)
- A/B testing prompt variants
- Multi-language generation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GEN-01 | Claude output parsing uses `tool_choice: { type: 'tool', name: 'deliver_site_files' }` — no regex parsing | Verified: SDK 0.81.0 supports this. CRITICAL: incompatible with thinking:enabled — planner must choose |
| GEN-02 | Claude calls run inside Edge Function with `ANTHROPIC_API_KEY` server-side only | Already in place. Key lives in `Deno.env.get('ANTHROPIC_API_KEY')` — no changes needed |
| GEN-03 | Token budget enforced per-package caps; hard cap on retries (max 2); never retry 4xx | Per-package caps documented. Retry logic pattern documented |
| GEN-04 | Generated HTML is mobile-responsive; viewport meta check; prompt enforces responsive layout | html-scanner.ts extension pattern documented; soft-check CSS scan pattern provided |
| GEN-05 | Generation queue with rate limiting — 429/529 retry vs 400 fail loudly | Queue state machine pattern via `client_sites` documented; pg_cron recommendation made |
| GEN-06 | Industry-contextual prompting — business industry + SA location shape generated copy | `industry-hints.ts` structure and verticals documented |
| GEN-07 | Per-build Claude cost logged (input + output tokens + ZAR cost); visible in admin dashboard | Exact pricing constants verified from official docs |
| GEN-08 | Build pipeline split across Edge Functions to stay under 150s wall-clock limits | Function split documented; chaining pattern via `supabase.functions.invoke()` documented |
| GEN-09 | Supabase Realtime replaces `setInterval` polling; 10s polling fallback | Channel filter pattern documented; RLS implications covered |
| CUST-05 | Auth/submit race condition fixed — awaits real session state instead of `setTimeout` | Code verified: `handleSubmit()` already calls `supabase.auth.getUser()` at line 136. Fix is safe. |
</phase_requirements>

---

## Summary

Phase 2 refactors and hardens the Claude-powered site generation pipeline. The key work is: (1) replacing fragile regex JSON parsing with the Anthropic SDK's `tool_choice` forced tool use pattern, (2) splitting the monolithic 581-line `build-site/index.ts` into a chain of smaller Edge Functions, (3) implementing a generation queue that distinguishes retryable errors from fatal ones, (4) adding mobile-responsive enforcement at both the prompt and output-scan layers, (5) replacing the 3-second polling loop with Supabase Realtime, and (6) fixing a one-line race condition in the onboarding form.

**Critical finding:** `tool_choice: { type: 'tool', name: '...' }` is mutually exclusive with `thinking: { type: 'enabled' }` — the API returns a 400 error if both are set simultaneously. This is confirmed by official Anthropic documentation. The CONTEXT.md decision to use both together as written will fail. The planner must choose: either use `tool_choice` (structured output, no thinking), or use thinking with `tool_choice: { type: 'auto' }` (thinking, no guaranteed tool call). Given the phase goal of reliability and cost control, the recommendation is `tool_choice` without thinking. This also aligns with the CONTEXT's primary concern: eliminating fragile regex parsing.

**Primary recommendation:** Use `tool_choice: { type: 'tool' }` without `thinking` for both agents. Drop the thinking budget entirely from the Code Agent call. The structured output guarantee is more valuable for reliability than the thinking bonus is for quality at this product stage. If thinking is still desired, it must use `tool_choice: { type: 'auto' }` and rely on a strongly-worded prompt instruction — not forced tool selection.

---

## Critical Finding: thinking vs tool_choice Incompatibility

**Status: CONFIRMED from official Anthropic documentation (HIGH confidence)**
**Source:** https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use

> "When using extended thinking with tool use, `tool_choice: {"type": "any"}` and `tool_choice: {"type": "tool", "name": "..."}` are not supported and will result in an error. Only `tool_choice: {"type": "auto"}` (the default) and `tool_choice: {"type": "none"}` are compatible with extended thinking."

The CONTEXT.md decision to change `thinking: { type: 'adaptive' }` to `thinking: { type: 'enabled', budget_tokens: 8000 }` AND to use `tool_choice: { type: 'tool' }` cannot be implemented simultaneously. They are API-level incompatible.

**Resolution options for the planner:**

| Option | Structured Output | Thinking | Cost Impact | Recommendation |
|--------|------------------|----------|-------------|---------------|
| A: `tool_choice: { type: 'tool' }` only (no thinking) | YES — guaranteed | NO | Saves ~8,000 thinking tokens per call (~$0.096/call savings at Sonnet rates) | **RECOMMENDED** |
| B: `thinking: { type: 'enabled' }` + `tool_choice: { type: 'auto' }` | NO — relies on prompt | YES | +8,000 thinking tokens per call, no structured output guarantee | Not recommended |
| C: Two-call approach — thinking first, then structured extract | Partial | YES on first call | 2x latency, 2x cost | Over-engineered for this phase |

Option A is the right call for this phase. The primary goal is reliable structured output. `tool_choice` achieves that. Thinking adds tokens and removes the reliability guarantee. The current code already has `thinking: { type: 'adaptive' }` — removing it entirely is the correct change, not upgrading it to enabled.

---

## Standard Stack

### Core (no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.81.0 (already installed) | Claude API streaming + tool_use | Existing project dependency |
| `@supabase/supabase-js` | 2.101.1 (already installed) | Realtime channel subscriptions | Existing project dependency |
| `vitest` | 4.1.4 (already installed) | Test runner for shared TS modules | Wired in Phase 1 |

### Supporting (Deno Edge Functions — no npm install needed)

| Import | Purpose | Pattern |
|--------|---------|---------|
| `npm:@anthropic-ai/sdk` | Anthropic SDK in Deno context | `import Anthropic from 'npm:@anthropic-ai/sdk'` (already working) |
| `jsr:@supabase/functions-js/edge-runtime.d.ts` | Deno type shims | Already in `build-site/index.ts` |

### No new packages needed

All Phase 2 work uses libraries already present. New shared modules (`_shared/prompts.ts`, `_shared/cost-calc.ts`, `_shared/industry-hints.ts`) are pure TypeScript with no external imports.

---

## Architecture Patterns

### Recommended Project Structure Changes

```
supabase/functions/
├── generate-site/           # RENAMED from build-site/
│   └── index.ts             # Image Agent + Code Agent + HTML scanner only
├── persist-files/           # NEW — write generated files to Supabase Storage
│   └── index.ts
├── build-orchestrator/      # NEW — read client_sites state, invoke next function
│   └── index.ts
├── _shared/
│   ├── cors.ts              # KEEP AS-IS
│   ├── supabase-admin.ts    # KEEP AS-IS
│   ├── sanitize.ts          # KEEP AS-IS (Phase 1 output)
│   ├── html-scanner.ts      # EXTEND — add viewport meta check (GEN-04)
│   ├── prompts.ts           # NEW — CODE_AGENT_SYSTEM + industry_hints slot
│   ├── cost-calc.ts         # NEW — pricing constants + cost calculation function
│   └── industry-hints.ts    # NEW — typed map of SA SMME industry hints
src/
├── hooks/
│   └── useBuildStatus.ts    # NEW or extract — Realtime subscription + polling fallback
```

### Pattern 1: Forced Tool Use (GEN-01) — without thinking

The critical change. Remove the `thinking` parameter entirely. Add `tools` array and `tool_choice`.

```typescript
// Source: official Anthropic docs + SDK 0.81.0
// supabase/functions/generate-site/index.ts

const stream = anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: maxOutputTokens,      // per-package cap (12000/24000/48000)
  // NO thinking param — incompatible with tool_choice: { type: 'tool' }
  system: CODE_AGENT_SYSTEM,        // imported from _shared/prompts.ts
  tools: [
    {
      name: 'deliver_site_files',
      description: 'Deliver the generated website files as structured JSON. You MUST call this tool with all generated HTML files.',
      input_schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  pattern: '^(index\\.html|pages/[a-z0-9-]+\\.html|assets/[a-z0-9./-]+)$',
                  description: 'File path relative to site root',
                },
                content: {
                  type: 'string',
                  description: 'Complete file content',
                },
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

const response = await stream.finalMessage()

// response.content will contain a tool_use block (guaranteed by tool_choice)
const toolBlock = response.content.find((b) => b.type === 'tool_use')
if (!toolBlock || toolBlock.type !== 'tool_use') {
  throw new Error('No tool_use block in response — unexpected with tool_choice forced')
}
// toolBlock.input is typed as Record<string, unknown> by the SDK
const files = (toolBlock.input as { files: Array<{ path: string; content: string }> }).files
```

**TypeScript type for `toolBlock.input`:** The SDK types `input` as `Record<string, unknown>`. Cast it manually with `as { files: Array<... }` after the `find()` check.

### Pattern 2: Image Agent with tool_choice (GEN-01)

Same pattern for the Image Agent. Remove the regex fallback. Use `deliver_search_queries` tool.

```typescript
// Image Agent tool — also without thinking
const imageStream = anthropic.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,          // Image Agent is cheap — no thinking needed
  tools: [{
    name: 'deliver_search_queries',
    description: 'Deliver Pexels image search queries for the website',
    input_schema: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              query:     { type: 'string', description: 'Pexels search term, 2-4 words' },
              placement: { type: 'string', description: 'Where image goes on page' },
              alt:       { type: 'string', description: 'Descriptive alt text' },
            },
            required: ['query', 'placement', 'alt'],
          },
        },
      },
      required: ['queries'],
    },
  }],
  tool_choice: { type: 'tool', name: 'deliver_search_queries' },
  messages: [{ role: 'user', content: imageAgentPrompt }],
})
const imageResponse = await imageStream.finalMessage()
const imageToolBlock = imageResponse.content.find((b) => b.type === 'tool_use')
const queries = (imageToolBlock?.input as { queries: Array<{query: string, placement: string, alt: string}> })?.queries ?? []
```

### Pattern 3: Streaming still works, use it for logging

`messages.stream()` works normally with `tool_choice`. The stream events fire as the tool_use block is constructed. Use the stream events for live progress logging; call `stream.finalMessage()` only once to get the complete parsed result.

```typescript
// Live progress logging — works even with tool_choice
const stream = anthropic.messages.stream({ /* ... */ })

// Log streaming events to build_events for customer dashboard UX
stream.on('streamEvent', (event) => {
  if (event.type === 'content_block_delta') {
    // Optionally count bytes for progress estimate
  }
})

// Then wait for full response
const response = await stream.finalMessage()
// Usage data available here for cost tracking
const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } = response.usage
```

### Pattern 4: Per-attempt cost tracking (GEN-07)

```typescript
// _shared/cost-calc.ts
// Source: https://platform.claude.com/docs/en/about-claude/pricing (verified 2026-04-09)
export const SONNET_4_6_PRICING = {
  input_per_mtok:           3.00,  // USD per million input tokens
  output_per_mtok:         15.00,  // USD per million output tokens
  cache_read_per_mtok:      0.30,  // USD per million cache-read tokens (10% of input)
  cache_write_5m_per_mtok:  3.75,  // USD per million 5-min cache-write tokens
  cache_write_1h_per_mtok:  6.00,  // USD per million 1-hr cache-write tokens
  tool_system_prompt_tokens: 313,   // Additional system prompt tokens when tool_choice: { type: 'tool' }
  // Source: tool_choice: "tool" adds 313 tokens for Sonnet 4.6
  usd_to_zar:              18.85,  // Hardcoded at 2026-04-09. Update in Phase 6 admin.
  model:                   'claude-sonnet-4-6',
  pricing_date:            '2026-04-09',
}

export function calcCostUsd(usage: {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number  // 5-min write assumed
}): number {
  const input  = (usage.input_tokens / 1_000_000) * SONNET_4_6_PRICING.input_per_mtok
  const output = (usage.output_tokens / 1_000_000) * SONNET_4_6_PRICING.output_per_mtok
  const cacheRead  = ((usage.cache_read_input_tokens ?? 0) / 1_000_000) * SONNET_4_6_PRICING.cache_read_per_mtok
  const cacheWrite = ((usage.cache_creation_input_tokens ?? 0) / 1_000_000) * SONNET_4_6_PRICING.cache_write_5m_per_mtok
  return input + output + cacheRead + cacheWrite
}

export function usdToZar(usd: number): number {
  return Math.round(usd * SONNET_4_6_PRICING.usd_to_zar * 100) / 100
}
```

**Cost math for a typical Starter site build:**
- Input: ~3,500 tokens → $0.0105
- Output: ~12,000 tokens → $0.18
- Tool system prompt: 313 tokens → $0.00094
- Total: ~$0.19 USD = ~R3.58 ZAR (within the R25 soft alert threshold)

### Pattern 5: Retry with exponential backoff (GEN-05)

```typescript
// Inside generate-site/index.ts
async function callWithRetry<T>(
  fn: () => Promise<T>,
  siteId: string,
  supabase: any,
  maxRetries = 2,
): Promise<T> {
  let attempt = 0
  const baseDelayMs = 2000
  
  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode ?? 0
      const isRetryable = status === 429 || status === 529 || status >= 500
      
      if (!isRetryable || attempt >= maxRetries) {
        // 4xx errors (except 429): fail loudly, no retry
        throw err
      }
      
      attempt++
      // Jitter: ±25% of base delay, doubled per attempt
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      const jitter = delay * (0.5 + Math.random() * 0.5)  // 50–100% of delay
      
      await logEvent(supabase, siteId, 'retry_scheduled', 'info',
        `Attempt ${attempt}/${maxRetries + 1} after ${Math.round(jitter)}ms (status ${status})`)
      
      await new Promise(r => setTimeout(r, jitter))
    }
  }
  throw new Error('Max retries exhausted')  // TypeScript satisfaction
}
```

### Pattern 6: Edge Function chaining (GEN-08)

Chain functions by calling `supabase.functions.invoke()` from inside another function. Use the service role key for inter-function auth.

```typescript
// From generate-site/index.ts — invoke persist-files after generation
const supabaseAdmin = getSupabaseAdmin()  // uses SUPABASE_SERVICE_ROLE_KEY

const { error: invokeError } = await supabaseAdmin.functions.invoke('persist-files', {
  body: { siteId, files },
  // Service role key is used by getSupabaseAdmin() — fire-and-forget OK
})
if (invokeError) {
  await logEvent(supabaseAdmin, siteId, 'persist_invoke_error', 'error', invokeError.message)
  // Don't throw — files will be recovered from in-memory on this run
}
```

**Key facts about Edge Function chaining:**
- `supabase.functions.invoke()` is an HTTP call to the function's public URL
- Authentication: use `getSupabaseAdmin()` (service role key) — this sets the Authorization header with the service role JWT, bypassing RLS
- The invoked function must verify the service role JWT via Supabase's JWT verification
- Cold-start implication: the chained function may cold-start (+200–500ms). For the generation pipeline, this is acceptable (fire-and-forget pattern)
- Do NOT await the `persist-files` invoke if you want fire-and-forget (omit await, handle error in background)
- Idempotency: `persist-files` must check if files already exist before writing

### Pattern 7: Supabase Realtime subscription (GEN-09)

```typescript
// src/hooks/useBuildStatus.ts — replaces the setInterval pattern in DashboardPage
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useBuildStatus(siteId: string | null) {
  const [events, setEvents] = useState<BuildEvent[]>([])
  const [buildStatus, setBuildStatus] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!siteId) return

    // Primary: Realtime subscription filtered by site_id
    const channel = supabase
      .channel(`build-${siteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'build_events',
          filter: `site_id=eq.${siteId}`,  // RLS must allow SELECT on build_events for this user
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as BuildEvent])
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_sites',
          filter: `id=eq.${siteId}`,
        },
        (payload) => {
          setBuildStatus((payload.new as any).build_status)
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Clear the fallback polling if Realtime connected
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          startFallbackPolling()
        }
      })

    // Fallback: 10-second polling when WebSocket drops
    function startFallbackPolling() {
      if (pollIntervalRef.current) return  // Already polling
      pollIntervalRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('build_events')
          .select('*')
          .eq('site_id', siteId)
          .order('created_at', { ascending: true })
        if (data) setEvents(data)
      }, 10_000)
    }

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [siteId])

  return { events, buildStatus }
}
```

**RLS implication:** The `build_events` table's SELECT policy must allow the authenticated user to read rows where `site_id` corresponds to their own site. The service role in Edge Functions bypasses RLS for writes. Client-side Realtime reads go through RLS. Verify this policy exists.

### Pattern 8: Database migration for GEN-05 queue columns

```sql
-- Migration 004 (new file for Phase 2)
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
```

### Pattern 9: CUST-05 fix — remove setTimeout

**Verified from code inspection:** `handleSubmit()` at line 135-136 of `OnboardingPage.tsx` already calls:
```typescript
const currentUser = (await supabase.auth.getUser()).data.user
if (!currentUser) { toast.error('Please sign in first'); return }
```

This is a direct API call that always re-fetches the current session — it does NOT use the `useAuth` hook's cached `user` state. The `setTimeout` at line 118 was never needed for this reason.

**The fix:**
```typescript
// BEFORE (OnboardingPage.tsx line ~118):
setTimeout(() => handleSubmit(), 500)

// AFTER:
await handleSubmit()
```

**Safe to remove:** No dependent side-effects observed. The `setShowAuth(false)` at line 117 happens synchronously before either pattern. The `authLoading` state is managed correctly. The `finally { setAuthLoading(false) }` block at line 123 always runs regardless of `handleSubmit` outcome.

### Pattern 10: html-scanner.ts viewport meta extension (GEN-04)

```typescript
// Extension to supabase/functions/_shared/html-scanner.ts
// Add as a NEW violation category AFTER existing checks

// 6. Viewport meta tag — mobile-responsive hard check
const hasViewportMeta = /<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i.test(html)
if (!hasViewportMeta) {
  violations.push('Missing <meta name="viewport"> tag (mobile-responsive requirement)')
}
```

**Also add a separate soft-check function** (doesn't block deploy):
```typescript
export interface MobileWarnings {
  hardcoded_widths: string[]  // e.g. ['body { width: 1200px }']
}

export function scanForMobileWarnings(html: string): MobileWarnings {
  const hardcoded_widths: string[] = []
  // Look for px widths on container-level selectors
  const widthPattern = /(body|main|\.container|section)[^{]*\{[^}]*width\s*:\s*(\d+)px/gi
  let match
  while ((match = widthPattern.exec(html)) !== null) {
    hardcoded_widths.push(`${match[1]} has hardcoded width: ${match[2]}px`)
  }
  return { hardcoded_widths }
}
```

### Pattern 11: pg_cron for retry scheduler (GEN-05 — Claude's Discretion resolved)

**Recommendation: Use Supabase-managed pg_cron, NOT Deno.cron.**

Reasons:
- `Deno.cron` is a Deno Deploy feature. Supabase Edge Functions use a Deno runtime but NOT Deno Deploy's cron feature. The Supabase Edge Function runtime does not support `Deno.cron`.
- Supabase's `pg_cron` extension is the documented, supported way to schedule jobs. It runs inside Postgres and invokes Edge Functions via HTTP (using `pg_net`).
- Source: https://supabase.com/docs/guides/functions/schedule-functions

```sql
-- Schedule build-orchestrator to run every 2 minutes
SELECT cron.schedule(
  'generation-queue-poll',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/build-orchestrator',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

The `build-orchestrator` function reads `client_sites` where `build_status IN ('pending', 'retry') AND next_retry_at <= now()` and invokes `generate-site` for up to 2 concurrent sites (concurrency cap).

### Anti-Patterns to Avoid

- **Setting `thinking: { type: 'enabled' }` AND `tool_choice: { type: 'tool' }`** — will 400 error from the API. Choose one.
- **Retrying on 4xx errors** — 400 (bad request), 401 (auth), 403 (forbidden) must fail immediately. Only 429, 529, and 5xx are retryable.
- **Calling `stream.finalMessage()` before the stream completes** — the SDK handles this correctly but do not interrupt the stream early.
- **Using the `user` state from `useAuth` hook in `handleSubmit`** — it may be stale. Always call `supabase.auth.getUser()` directly for auth decisions.
- **Building `generation_jobs` table** — explicitly deferred. `client_sites` as the queue works for launch volume.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured Claude output | Regex JSON extraction | `tool_choice: { type: 'tool' }` | Regex fails on markdown fences, partial output, explanatory text |
| Test runner for shared TS | Custom Deno test harness | Vitest (already installed) | Pure TS in `_shared/` runs in both Deno and Node — no new infrastructure |
| Retry with jitter | Custom exponential backoff from scratch | Inline pattern (simple enough — see Pattern 5) | No npm package needed for 2-attempt backoff |
| Scheduled jobs | `Deno.cron` | `pg_cron` via Supabase dashboard | Deno.cron is not available in Supabase Edge Functions |
| Realtime subscription | Custom WebSocket client | `supabase.channel().on('postgres_changes')` | Already available in `@supabase/supabase-js` |

**Key insight:** The Anthropic SDK already does everything needed for structured output via `tool_choice`. No external libraries required. The main work is removing code (the regex parser) and adding the tool definition objects.

---

## Common Pitfalls

### Pitfall 1: thinking + tool_choice forced tool — API 400 error

**What goes wrong:** Setting `thinking: { type: 'enabled', budget_tokens: N }` and `tool_choice: { type: 'tool', name: '...' }` in the same API call returns HTTP 400 with error message `"Thinking may not be enabled when tool_choice forces tool use."`.

**Why it happens:** The Anthropic API prohibits this combination at the API level. The model's extended thinking chain needs the freedom to decide whether to use a tool — forcing tool use is fundamentally incompatible.

**How to avoid:** Remove `thinking` entirely when using forced `tool_choice`. If you want thinking, use `tool_choice: { type: 'auto' }` and rely on prompting.

**Warning signs:** HTTP 400 errors from the Anthropic API immediately on Code Agent call.

### Pitfall 2: Tool schema path pattern regex too strict

**What goes wrong:** The `deliver_site_files` schema includes `path: { pattern: '^(index\\.html|pages/[a-z0-9-]+\\.html|assets/[a-z0-9./-]+)$' }`. If Claude generates a file path that doesn't match — e.g., `pages/services-overview.html` (fine) vs `pages/Services.html` (uppercase, fails) — the model will attempt to conform but may produce an error or truncated output.

**How to avoid:** Test the path regex against realistic file paths. Consider relaxing the pattern if legitimate paths are being rejected. Alternatively, validate paths client-side and skip files with invalid paths rather than failing the whole build.

### Pitfall 3: finalMessage() times out on large Enterprise builds

**What goes wrong:** Enterprise package with `max_tokens: 48000` and a complex site can generate 45,000+ tokens taking 60–90 seconds. The Edge Function has a 150s wall-clock limit. If generation takes 90s + file persistence takes 30s, the function times out.

**How to avoid:** The split into `generate-site` + `persist-files` exists precisely to handle this. `generate-site` must complete before 120s, then fire-and-forget `persist-files`. Consider logging partial progress to `build_events` to give customers feedback during long generations.

### Pitfall 4: Realtime `build_events` RLS missing — subscription receives no events

**What goes wrong:** The Realtime channel subscribes correctly but receives no events. The `build_events` table's RLS SELECT policy blocks the anon/auth key from reading rows.

**How to avoid:** Add a RLS policy: `CREATE POLICY "Users can view own build events" ON build_events FOR SELECT USING (site_id IN (SELECT id FROM client_sites WHERE user_id = auth.uid()))`.

**Warning signs:** Realtime channel subscribes successfully (status: SUBSCRIBED) but no INSERT events fire even though Edge Function is writing to `build_events`.

### Pitfall 5: Inter-function invoke cold starts on Enterprise tier

**What goes wrong:** `generate-site` invokes `persist-files` at the end of a long generation. `persist-files` cold-starts (+500ms). If the `generate-site` function is already at 140s wall-clock, the cold-start pushes it over 150s.

**How to avoid:** Fire the `persist-files` invoke asynchronously (don't await it). `generate-site` immediately returns after firing the invoke. `persist-files` processes independently with its own 150s budget.

### Pitfall 6: Cost tracking `try/catch` must not suppress the build failure

**What goes wrong:** Per CONTEXT.md, cost tracking failures should not fail the build. But a `catch(() => {})` around ALL of the generation code suppresses real errors.

**How to avoid:** Wrap only the `generation_cost` JSONB update in try/catch. The main `try/catch` block should still surface real Claude API errors.

---

## Code Examples

### Verified: `stream.finalMessage()` TypeScript pattern

```typescript
// Source: https://platform.claude.com/docs/en/api/messages-streaming (official docs)
const stream = client.messages.stream({
  max_tokens: 128000,
  messages: [{ role: 'user', content: 'Write a detailed analysis...' }],
  model: 'claude-opus-4-6'
})

const message = await stream.finalMessage()
// message.content is ContentBlock[] — may include tool_use blocks
const textBlock = message.content.find((block) => block.type === 'text')
// OR for tool_use:
const toolBlock = message.content.find((block) => block.type === 'tool_use')
```

### Verified: Tool use system prompt token overhead

```
// Source: https://platform.claude.com/docs/en/about-claude/pricing#tool-use-pricing (official docs)
// Sonnet 4.6 with tool_choice: { type: 'tool' } (the "tool" row):
// Additional system prompt tokens: 313 tokens
// This overhead applies to EVERY call using forced tool selection.
// Factor into cost calculations:
const TOOL_SYSTEM_OVERHEAD = 313  // tokens
```

### Verified: Supabase Realtime channel filter syntax

```typescript
// Source: https://supabase.com/docs/guides/realtime/postgres-changes (official docs)
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'build_events',
    filter: 'site_id=eq.UUID_HERE',  // column=operator.value format
  }, handler)
  .subscribe()
```

### Verified: Claude Sonnet 4.6 pricing (official Anthropic docs)

```typescript
// Source: https://platform.claude.com/docs/en/about-claude/pricing (verified 2026-04-09)
// Claude Sonnet 4.6:
// Base input:       $3.00 / MTok
// Output:          $15.00 / MTok
// Cache read:       $0.30 / MTok  (10% of base input)
// Cache write 5m:   $3.75 / MTok  (125% of base input)
// Cache write 1h:   $6.00 / MTok  (200% of base input)

// Example build cost calculation (Starter package):
// Image Agent:  400 input + 300 output = $0.0012 + $0.0045 = $0.006
// Code Agent:   3500 input + 12000 output = $0.0105 + $0.18 = $0.19
// Total:        ~$0.196 USD = ~R3.70 ZAR (at 18.85 rate)
// Max alert threshold from PROJECT.md: R25 (~$1.33 USD)
```

---

## Current build-site/index.ts Refactoring Map

### What stays in generate-site/index.ts (renamed)

| Current Code | Action | Notes |
|-------------|--------|-------|
| `runImageAgent()` | REFACTOR — add `tool_choice` | Remove regex parse, add `deliver_search_queries` tool |
| `getCuratedImages()` | KEEP AS-IS | Fallback still needed |
| `CODE_AGENT_SYSTEM` constant | EXTRACT to `_shared/prompts.ts` | Add `{industry_hints}` slot, add viewport/responsive line |
| `logEvent()` helper | KEEP AS-IS | Move to bottom of file or `_shared/` |
| SEC-07 HTML scan call | EXTEND — add viewport check | Call `scanForMobileWarnings()` separately, log to `build_events` |
| `sanitizeForPrompt()` calls | KEEP AS-IS | SEC-06 — Phase 1 output |
| Pexels fetch loop | KEEP AS-IS | Working pattern |

### What leaves generate-site (moves to persist-files)

| Current Code | Destination | Notes |
|-------------|-------------|-------|
| File storage write | `persist-files/index.ts` | Writes to Supabase Storage bucket `client-sites/{site_id}/` |
| `client_sites.generated_files` update | `persist-files/index.ts` | Sets JSONB metadata |

### What leaves build-site entirely (Phase 3 removes)

| Current Code | Status | Notes |
|-------------|--------|-------|
| `deployToGitHub()` function | LEAVE UNTOUCHED in this phase | Phase 3 removes it |
| `deployToNetlify()` function | LEAVE UNTOUCHED in this phase | Phase 3 replaces with zip-deploy |
| GitHub deploy calls | LEAVE UNTOUCHED | Don't break what's working — Phase 3's job |

### New files to create

| File | Purpose | Pattern |
|------|---------|---------|
| `_shared/prompts.ts` | Extract `CODE_AGENT_SYSTEM` | Pure TS, no Deno imports |
| `_shared/cost-calc.ts` | Pricing constants + `calcCostUsd()` | Pure TS, no Deno imports |
| `_shared/industry-hints.ts` | SA SMME industry hint map | Pure TS, no Deno imports |
| `generate-site/index.ts` | Renamed from `build-site/index.ts` | Refactored with tool_choice |
| `persist-files/index.ts` | File persistence to Storage | New function |
| `build-orchestrator/index.ts` | Cron-invoked coordinator | New function |
| `src/hooks/useBuildStatus.ts` | Realtime + polling fallback hook | Extract from DashboardPage |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Regex JSON extraction from Claude text | `tool_choice` forced tool use | SDK 0.81.0+ (2024) | Eliminates parse failures, schema-validated output |
| `thinking: { type: 'adaptive' }` | Remove thinking (incompatible with forced tool_choice) | This phase | Saves thinking token cost, achieves structured output |
| `setInterval` polling every 3s | Supabase Realtime `postgres_changes` subscription | @supabase/supabase-js 2.x | Eliminates timer leaks, reduces DB load |
| `setTimeout(() => handleSubmit(), 500)` | `await handleSubmit()` | This phase | Fixes race condition on slow networks |
| GitHub-linked Netlify deploy | Phase 3 replaces with zip-deploy | Phase 3 (NOT this phase) | Leave untouched |

**Deprecated/outdated in this codebase:**
- `thinking: { type: 'adaptive' }` — non-deterministic token usage. Remove in favor of no thinking (more predictable cost).
- `textBlock.text.match(/\{[\s\S]*"files"[\s\S]*\}/)` — the regex JSON extractor. Gone in this phase.

---

## Open Questions

1. **`build_events` SELECT RLS policy status**
   - What we know: Edge Functions write to `build_events` using the service role key (bypasses RLS). Realtime client subscriptions go through RLS.
   - What's unclear: Whether a SELECT RLS policy allowing users to read their own `build_events` already exists from Phase 1 migrations.
   - Recommendation: Verify in `supabase/migrations/` before implementing Realtime. Add the policy in Migration 004 if missing.

2. **`generate-site` function rename vs. new directory**
   - What we know: CONTEXT.md calls the renamed function `generate-site`. Current function is `build-site`.
   - What's unclear: Whether to rename the directory (simpler) or deploy a new function and deprecate the old one.
   - Recommendation: Rename the directory. Supabase function names must match directory names. A clean rename avoids running two competing functions.

3. **POPIA consent flag check in prompt construction**
   - What we know: CONTEXT.md says "respect a consent flag if present." The `profiles.popia_consent_at` column exists from Phase 1.
   - What's unclear: How the generation pipeline should behave if consent is null — block? Warn?
   - Recommendation: If `profiles.popia_consent_at IS NULL`, log a `build_events` warning and proceed (the POPIA UI gate comes in Phase 6). Do not block generation in this phase.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — this section is REQUIRED.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (already installed in Phase 1) |
| Config file | `vite.config.ts` (already configured, includes `supabase/functions/**/*.{test,spec}.{ts,tsx}`) |
| Quick run command | `npm run test:ci` (vitest run --reporter=dot) |
| Full suite command | `npm test` (vitest watch) |

**DO NOT reinstall Vitest.** It is wired and working. The `vite.config.ts` already includes `supabase/functions/**/*.{test,spec}.{ts,tsx}` in the include glob.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEN-01 | `deliver_site_files` tool_use block returned; no regex fallback | unit | `npm run test:ci -- --reporter=verbose src/test/gen01.test.ts` | ❌ Wave 0 |
| GEN-01 | `deliver_search_queries` tool_use block returned from Image Agent | unit | `npm run test:ci -- --reporter=verbose src/test/gen01.test.ts` | ❌ Wave 0 |
| GEN-02 | `ANTHROPIC_API_KEY` absent from client bundle (no VITE_ prefix) | unit / file scan | `npm run test:ci -- src/test/gen02.test.ts` | ❌ Wave 0 |
| GEN-03 | Starter package capped at 12000 tokens; Professional at 24000; Enterprise at 48000 | unit | `npm run test:ci -- src/test/gen03.test.ts` | ❌ Wave 0 |
| GEN-03 | 4xx errors (400) are NOT retried | unit | `npm run test:ci -- src/test/gen03.test.ts` | ❌ Wave 0 |
| GEN-03 | 429 errors retry up to 2 times with backoff | unit | `npm run test:ci -- src/test/gen03.test.ts` | ❌ Wave 0 |
| GEN-04 | `scanGeneratedHtml` returns violation when viewport meta missing | unit | `npm run test:ci -- supabase/functions/_shared/html-scanner.test.ts` | ❌ Wave 0 (extend existing) |
| GEN-04 | `scanGeneratedHtml` passes when viewport meta present | unit | `npm run test:ci -- supabase/functions/_shared/html-scanner.test.ts` | ❌ Wave 0 |
| GEN-04 | `scanForMobileWarnings` detects hardcoded `body { width: 1200px }` | unit | `npm run test:ci -- supabase/functions/_shared/html-scanner.test.ts` | ❌ Wave 0 |
| GEN-05 | Retry count increments and `next_retry_at` is set on transient error | unit | `npm run test:ci -- src/test/gen05.test.ts` | ❌ Wave 0 |
| GEN-06 | `getIndustryHints('plumber')` returns expected SA copy hints | unit | `npm run test:ci -- supabase/functions/_shared/industry-hints.test.ts` | ❌ Wave 0 |
| GEN-06 | Unknown industry falls back to neutral hints without throwing | unit | `npm run test:ci -- supabase/functions/_shared/industry-hints.test.ts` | ❌ Wave 0 |
| GEN-07 | `calcCostUsd()` calculates correctly for known input/output token counts | unit | `npm run test:ci -- supabase/functions/_shared/cost-calc.test.ts` | ❌ Wave 0 |
| GEN-07 | `usdToZar()` applies 18.85 conversion correctly | unit | `npm run test:ci -- supabase/functions/_shared/cost-calc.test.ts` | ❌ Wave 0 |
| GEN-08 | `generate-site` function file exists and has correct entry point | file-exists check | `npm run test:ci -- src/test/gen08.test.ts` | ❌ Wave 0 |
| GEN-09 | `useBuildStatus` hook subscribes to Realtime and cleans up on unmount | unit (RTL) | `npm run test:ci -- src/test/gen09.test.ts` | ❌ Wave 0 |
| GEN-09 | Fallback polling starts when channel errors; clears on reconnect | unit | `npm run test:ci -- src/test/gen09.test.ts` | ❌ Wave 0 |
| CUST-05 | `handleAuth` calls `await handleSubmit()` not `setTimeout` | unit | `npm run test:ci -- src/test/cust05.test.ts` | ❌ Wave 0 |
| CUST-05 | Slow `signUp()` resolve still calls `handleSubmit` exactly once | unit | `npm run test:ci -- src/test/cust05.test.ts` | ❌ Wave 0 |

**Manual-only verifications** (cannot be automated in unit tests):
- GEN-01 LIVE: actual Claude API call with `tool_choice` returns structured JSON (requires API key + network)
- GEN-04 LIVE: generated site renders correctly on a mobile viewport (Lighthouse mobile score ≥ 70)
- GEN-08 LIVE: `generate-site` function stays under 120s for all package tiers
- GEN-09 LIVE: Realtime events fire within 2s of a `build_events` INSERT

### Wave 0 Gaps (test files to create before implementation)

- [ ] `supabase/functions/_shared/html-scanner.test.ts` — extend existing html-scanner tests with viewport meta + mobile-warning tests
- [ ] `supabase/functions/_shared/cost-calc.test.ts` — unit tests for `calcCostUsd()` and `usdToZar()`
- [ ] `supabase/functions/_shared/industry-hints.test.ts` — unit tests for all industry keys + fallback
- [ ] `src/test/gen01.test.ts` — mocked Anthropic SDK: verifies tool_use block extraction, no regex path
- [ ] `src/test/gen02.test.ts` — verifies no `VITE_ANTHROPIC` env var in any source file
- [ ] `src/test/gen03.test.ts` — retry logic: 4xx no-retry, 429 retry up to 2x, token cap per package
- [ ] `src/test/gen05.test.ts` — queue state: retry_count, next_retry_at logic
- [ ] `src/test/gen08.test.ts` — file existence check for generate-site, persist-files, build-orchestrator
- [ ] `src/test/gen09.test.ts` — React Testing Library: useBuildStatus hook subscription + cleanup
- [ ] `src/test/cust05.test.ts` — OnboardingPage: mock slow signUp, assert handleSubmit called once without setTimeout

**Note on mocking the Anthropic SDK in tests:** The shared pure-TS modules (`cost-calc.ts`, `industry-hints.ts`, `prompts.ts`, `html-scanner.ts`) have no Deno or Anthropic imports — they test directly in Vitest/jsdom without mocking. The gen01.test.ts file mocks `@anthropic-ai/sdk` using `vi.mock()`.

### Sampling Rate

- **Per task commit:** `npm run test:ci` (vitest run, non-interactive)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

---

## Sources

### Primary (HIGH confidence)

- Anthropic official pricing page — `https://platform.claude.com/docs/en/about-claude/pricing` — verified Claude Sonnet 4.6 pricing: $3/$15 input/output, $0.30 cache read, tool_choice:tool adds 313 system prompt tokens
- Anthropic tool use docs — `https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use` — confirmed: `tool_choice: { type: 'tool' }` is incompatible with `thinking: { type: 'enabled' }` (400 error)
- Anthropic streaming docs — `https://platform.claude.com/docs/en/api/messages-streaming` — confirmed: `stream.finalMessage()` returns complete Message with tool_use blocks; streaming + tool_choice is compatible
- Project codebase direct read: `supabase/functions/build-site/index.ts`, `src/pages/OnboardingPage.tsx`, `supabase/functions/_shared/html-scanner.ts`, `supabase/functions/_shared/sanitize.ts`, `src/hooks/useAuth.ts`

### Secondary (MEDIUM confidence)

- Supabase Realtime postgres_changes docs — `https://supabase.com/docs/guides/realtime/postgres-changes` — filter syntax: `filter: 'column=eq.value'`; RLS applies to SELECT on Realtime; service role bypasses RLS
- Supabase scheduling docs — `https://supabase.com/docs/guides/functions/schedule-functions` — pg_cron is the supported pattern; `Deno.cron` is NOT available in Supabase Edge Functions
- GitHub issue cross-reference confirming thinking + forced tool_choice = 400 error: `https://github.com/run-llama/llama_index/issues/19641`, `https://github.com/pydantic/pydantic-ai/issues/2425`

### Tertiary (LOW confidence — training data)

- Inter-Edge-Function chaining via `supabase.functions.invoke()`: pattern based on Supabase SDK API shape; verified from `@supabase/supabase-js` type definitions in project

---

## Metadata

**Confidence breakdown:**
- thinking/tool_choice incompatibility: HIGH — confirmed from official Anthropic docs
- Sonnet 4.6 pricing constants: HIGH — verified from official pricing page
- `stream.finalMessage()` with tool_choice: HIGH — verified from official streaming docs
- CUST-05 fix safety: HIGH — verified directly from code at OnboardingPage.tsx:135-136
- Supabase Realtime filter syntax: HIGH — official Supabase docs
- pg_cron recommendation over Deno.cron: HIGH — official Supabase scheduling docs confirm Deno.cron not supported
- Inter-function chaining auth pattern: MEDIUM — inferred from SDK + service role key documentation

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days for Anthropic pricing; may change with new model releases)
