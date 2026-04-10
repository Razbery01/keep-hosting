---
phase: 02-generation-hardening
plan: "04"
subsystem: generation-pipeline
tags: [tool_choice, edge-functions, retry-ladder, cost-tracking, pg_cron, storage]
dependency_graph:
  requires:
    - 02-02  # shared modules (prompts, cost-calc, industry-hints, html-scanner)
    - 02-01  # test stubs
    - 02-03  # Realtime hook (consumed by the pipeline's event log)
  provides:
    - generate-site Edge Function (Image Agent + Code Agent, tool_choice, retry ladder, cost tracking)
    - persist-files Edge Function (Supabase Storage writes)
    - build-orchestrator Edge Function (queue poller, pg_cron target)
    - Migration 004 (retry_count, last_attempted_at, next_retry_at, extended CHECK)
    - Backward-compat build-site shim
  affects:
    - src/types/database.ts (ClientSite extended with queue columns + typed build_status)
    - .planning/REQUIREMENTS.md (GEN-03 wording corrected)
tech_stack:
  added: []
  patterns:
    - "tool_choice: { type: 'tool', name: '...' } with messages.stream() + finalMessage()"
    - "callClaudeWithRetry: exponential backoff 2s/8s, ±25% jitter, never retry 4xx"
    - "fire-and-forget functions.invoke('persist-files') with .catch() error logging"
    - "pg_cron + pg_net scheduled Edge Function invocation"
    - "partial-index on (build_status, next_retry_at) WHERE IN ('pending','retry')"
key_files:
  created:
    - supabase/migrations/004_generation_queue.sql
    - supabase/functions/generate-site/index.ts
    - supabase/functions/persist-files/index.ts
    - supabase/functions/build-orchestrator/index.ts
  modified:
    - supabase/functions/build-site/index.ts (581→35 line shim)
    - src/types/database.ts (retry_count, last_attempted_at, next_retry_at, typed build_status)
    - src/test/gen01.test.ts (all it.todo replaced)
    - src/test/gen03.test.ts (all it.todo replaced)
    - src/test/gen05.test.ts (all it.todo replaced)
    - src/test/gen08.test.ts (all it.todo replaced)
    - .planning/REQUIREMENTS.md (GEN-03 wording)
decisions:
  - "tool_choice: forced tool use replaces regex parsing for both Claude agents — resolves 02-RESEARCH.md Critical Finding (thinking incompatible with forced tool_choice)"
  - "thinking parameter removed entirely from all Anthropic calls — API returns HTTP 400 if thinking + forced tool_choice are combined"
  - "getCuratedImages helper moved into generate-site/index.ts (not a shared module) — only generate-site uses it; no cross-function import needed"
  - "build-site shim chosen over updating OnboardingPage.tsx — preserves client contract until Phase 4 Yoco webhook becomes direct trigger"
  - "path validation: permissive approach (no regex pattern in schema) per 02-RESEARCH.md Pitfall 2 — code-level filter rejects '..' and '/'-prefixed paths"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-10"
  tasks_completed: 6
  tasks_total: 7
  files_created: 4
  files_modified: 7
  checkpoint_task: 7
---

# Phase 2 Plan 4: Generation Pipeline Refactor Summary

**One-liner:** Three-way Edge Function split (generate-site / persist-files / build-orchestrator) with tool_choice forced tool use replacing regex parsing, per-package token caps (12k/24k/48k), retry ladder, cost telemetry, and pg_cron queue polling.

## What Was Built

### Migration 004 — Queue State Columns
`supabase/migrations/004_generation_queue.sql` adds three columns to `client_sites`:
- `retry_count INT NOT NULL DEFAULT 0` — incremented by orchestrator before each attempt
- `last_attempted_at TIMESTAMPTZ` — set on claim (orchestrator visibility)
- `next_retry_at TIMESTAMPTZ` — nullable; NULL means "ready now"

Also: extends the `build_status` CHECK constraint to include `'retry'`, `'deploy_failed'`, `'suspended'` (forward-compatible with Phase 3); adds a partial index on `(build_status, next_retry_at)` for the orchestrator query.

Storage bucket and pg_cron schedule are documented in the migration header as manual steps (same LOW CONFIDENCE SQL policy as Phase 1 migration 003 for managed Supabase projects).

### generate-site Edge Function (~330 lines)
The core refactor. Replaces the regex-parsing, thinking-enabled, GitHub/Netlify-deploying monolith with:

**Image Agent** — `tool_choice: { type: 'tool', name: 'deliver_search_queries' }`. Queries `anthropic.messages.stream()` + `finalMessage()` to get structured Pexels search queries. Falls back to `getCuratedImages(industry)` on any failure (Pexels key missing, Claude API error, empty result).

**Code Agent** — `tool_choice: { type: 'tool', name: 'deliver_site_files' }`. Per-package `max_tokens` (starter 12k, professional 24k, enterprise 48k). System prompt from `buildCodeAgentPrompt({ industry })` in `_shared/prompts.ts`. Zero regex parsing — files extracted from `response.content.find(b => b.type === 'tool_use')`.

**`callClaudeWithRetry`** — Retries on 429/529/5xx with base 2s exponential (2s, 8s), ±25% jitter. Never retries 4xx (fails loudly). Max 2 retries (3 attempts total). Logs `retry_scheduled` events to `build_events`.

**Cost tracking** — Wrapped in `try/catch` so failures never break the build. Reads existing `generation_cost` JSONB, appends a new attempt record with per-agent token counts, USD cost, and ZAR equivalent (rate 18.85). Accumulates `lifetime_total_usd/zar`.

**HTML scan** — Hard: `scanGeneratedHtml()` failure (including missing viewport meta) → `build_status = 'failed'`. Soft: `scanForMobileWarnings()` findings → `mobile_warning` build_event, build continues.

**Fire-and-forget** — `supabase.functions.invoke('persist-files', { body: { siteId, files } })` with `.catch()` error logging. No `await` — generate-site returns immediately after setting `build_status = 'generated'`.

### persist-files Edge Function (~70 lines)
Receives `{ siteId, files[] }`. Iterates files, validates paths (no `..`, no `/`-prefix), uploads each to Storage bucket `client-sites/{siteId}/{file.path}` via `upsert: true` (idempotent). Updates `client_sites.generated_files` with metadata and sets `build_status = 'generated'` (redundant safety belt). Logs `persist_done` or per-file `persist_upload_error`.

### build-orchestrator Edge Function (~65 lines)
Cron target. Reads at most 2 rows from `client_sites` where `build_status IN ('pending', 'retry') AND (next_retry_at IS NULL OR next_retry_at <= now())`, ordered by `created_at`. For each candidate: claims the row (bumps `retry_count`, sets `last_attempted_at`, flips status to `'generating'`), logs `orchestrator_pick`, fire-and-forgets `generate-site` invoke.

### Legacy build-site Shim (~35 lines)
The original 581-line monolith is replaced with a thin shim that delegates to `generate-site`. Client contract (`POST { siteId }` to `build-site`) is preserved. GitHub/Netlify deploy code removed — Phase 3 adds `deploy-site`. Shim slated for deletion in Phase 4.

### TypeScript Types
`ClientSite.Row` extended with `retry_count: number`, `last_attempted_at: string | null`, `next_retry_at: string | null`. `build_status` promoted from `string` to a typed union literal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing validation] getCuratedImages kept in generate-site, not extracted to _shared/**

- **Found during:** Task 4 (build-site shim)
- **Issue:** The plan said "confirm getCuratedImages is either in generate-site or extracted to _shared/curated-images.ts". Since only generate-site uses it, extracting to _shared would be over-engineering.
- **Fix:** Copied verbatim into generate-site/index.ts (Plan 04 Task 2). No _shared module created.
- **Impact:** None — build-site shim does not need getCuratedImages.

None of the other plan tasks required deviation.

## Manual Steps Required (Task 7 Checkpoint)

The following steps are blocked on human action and require the live Supabase project `YOUR_PROJECT_REF`:

1. `supabase db push` — applies migration 004
2. Enable `pg_cron` and `pg_net` extensions via Dashboard → Database → Extensions
3. Create `client-sites` Storage bucket (private) via Dashboard → Storage
4. Deploy four Edge Functions: `generate-site`, `persist-files`, `build-orchestrator`, `build-site`
5. Run `cron.schedule()` SQL in Dashboard → SQL Editor (project ref pre-filled in migration 004 header)
6. End-to-end generation test (full ~30–90s Claude build)

## Test Coverage

All four stub test files (gen01, gen03, gen05, gen08) have zero `it.todo` remaining and all assertions pass:

| File | Tests | Pattern |
|------|-------|---------|
| gen01.test.ts | 7 | Source-grep: tool_choice, no thinking, no regex fallback, imports |
| gen03.test.ts | 10 | Source-grep: PACKAGE_MAX_TOKENS, retry ladder shape |
| gen05.test.ts | 7 | Source-grep: orchestrator queue filter, concurrency cap, retry_count increment |
| gen08.test.ts | 6 | File existence, Deno.serve, key imports, fire-and-forget pattern |

Full Vitest suite: **133 tests passing, 16 files** (2 pre-existing todo stubs in Phase 1 RLS tests; 2 skipped integration test files requiring live DB).

## Phase 3 Reference Notes

- `build-site/index.ts` shim is the deletion target for Phase 4 (when Yoco webhook triggers `generate-site` directly)
- `client_sites.build_status = 'generated'` is the handoff state — Phase 3's `deploy-site` function picks up from here
- `generation_cost.attempts[]` shape is forward-compatible with Phase 6 admin dashboard cost analytics

## Self-Check: PENDING

Self-check will be completed after Task 7 human-verify checkpoint is resolved.
