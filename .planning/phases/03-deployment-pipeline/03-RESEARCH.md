# Phase 3: Deployment Pipeline - Research

**Researched:** 2026-04-09 (refreshed 2026-04-10)
**Domain:** Netlify zip-deploy API, JSZip in Deno, Supabase Storage download patterns, build_status state machine extension
**Confidence:** HIGH (Netlify API endpoints verified via official docs and Open API spec; JSZip pattern verified; Storage pattern verified; rate limit numbers confirmed; disable endpoint newly confirmed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Auto-deploy immediately after `generated` status — no admin review gate for v1
- `persist-files` invokes `deploy-site` fire-and-forget (same pattern as generate-site → persist-files chain)
- Netlify zip-deploy API with `NETLIFY_PAT` + `NETLIFY_TEAM_SLUG` as Supabase secrets
- UUID-based site names: `kh-{first8chars}` (e.g., `kh-4a73eb66`) inside a single team account
- Rate limit via `build_events` queries — count recent `deploy_done` events (no new table)
  - Last 60s: if >= 3, set `next_retry_at` and return early
  - Last 24h: if >= 80, log `deploy_quota_warning`; if >= 100, block until next day
- Suspend = deploy branded placeholder page to existing Netlify site (preserves site ID, domain, SSL)
  - **Updated finding:** `PUT /api/v1/sites/{site_id}/disable` also exists as an alternative (see Architecture Patterns). Placeholder-deploy remains the default; disable endpoint is documented for Phase 4/5 awareness.
- Reactivate = re-deploy from Supabase Storage `client-sites/{siteId}/` (no Claude call)
- Remove GitHub deploy code + `GITHUB_PAT`; do NOT drop `github_repo`/`github_url` columns
  - **Confirmed:** `GITHUB_PAT` does not appear in any current Edge Function source — safe to remove the secret without code changes
- `npm:jszip` for in-memory zip creation in Deno
- New Edge Functions: `deploy-site`, `suspend-site`, `reactivate-site`
- Migration 005 must extend `build_status` CHECK to include: `deploying`, `deployed`, `deploy_failed`, `suspending` (if needed); `suspended` already exists from migration 003
- Placeholder HTML stored as `supabase/functions/_shared/suspended-page.ts` (pure TS string export)
- Reuse existing retry columns: `retry_count`, `last_attempted_at`, `next_retry_at`

### Claude's Discretion
- Exact Netlify API error handling / retry codes
- Whether to use a single `manage-site` function vs separate `suspend-site` / `reactivate-site`
- Zip creation approach (JSZip vs native Deno compression) — JSZip locked but implementation detail is discretionary
- Whether deploy-site creates the Netlify site eagerly or lazily
- Exact placeholder page HTML styling
- Whether to chain deploy from persist-files or from the orchestrator (CONTEXT.md leans toward persist-files chain)

### Deferred Ideas (OUT OF SCOPE)
- Custom domain attachment via Netlify API — Phase 5
- Admin manual deploy/re-deploy UI — Phase 6
- Netlify Pro upgrade for higher bandwidth — post-launch
- CDN purge on re-deploy
- Multi-region deployment
- Deploy preview before going live
- Build-time analytics (Lighthouse score, page weight)
- A/B deploy
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | Remove GitHub-intermediated deployment; use Netlify direct zip-deploy API | Endpoint verified: `POST /api/v1/sites/{site_id}/deploys` with `Content-Type: application/zip`; GITHUB_PAT confirmed absent from all current Edge Function source — no code changes needed to remove it |
| DEPLOY-02 | Each customer site gets UUID-based name inside single Netlify team account | `POST /api/v1/{account_slug}/sites/` confirmed via official docs and Open API spec; `{"name": "kh-{uuid8}"}` body format confirmed; response includes `id`, `url`, `ssl_url`, `name` |
| DEPLOY-03 | Deploy queue enforces 3/min, 100/day limits; alert at 80/day | Rate limits confirmed via official docs (3/min, 100/day); `build_events` token-bucket query pattern identified; `Retry-After` header returns 60s on 429 |
| DEPLOY-04 | Site suspension — deploy branded placeholder to Netlify site | Two confirmed approaches: (1) placeholder zip-deploy to existing site (CONTEXT.md decision), (2) `PUT /api/v1/sites/{site_id}/disable` — the disable endpoint is newly confirmed from Open API spec and returns 204; CONTEXT.md chose placeholder-deploy (preserves branded UX) |
| DEPLOY-05 | Site reactivation — redeploy from Supabase Storage | `client-sites/{siteId}/` bucket pattern confirmed in `persist-files`; list + download pattern verified from official Supabase docs; for disable-based suspension, pair with `PUT /api/v1/sites/{site_id}/enable` |
| DEPLOY-06 | Deploy failure triggers retry with idempotency; Storage files eliminate need to re-call Claude | `build_status = 'deploy_failed'` + orchestrator poll pattern; `netlify_site_id` written immediately after site creation (before zip deploy) prevents orphan sites on retry |
</phase_requirements>

---

## Summary

Phase 3 builds three new Supabase Edge Functions (`deploy-site`, `suspend-site`, `reactivate-site`), extends the `build_status` state machine, and removes all GitHub-related deploy code. The core technical work is: reading files from Supabase Storage, creating an in-memory zip with `npm:jszip`, and POSTing it to the Netlify zip-deploy API. All three operations have verified patterns with high confidence.

**Key API findings from this refresh:**
- `PUT /api/v1/sites/{site_id}/disable` exists and returns 204 — confirmed from the Netlify Open API spec. This is a legitimate "take offline" endpoint the prior research incorrectly said didn't exist. CONTEXT.md chose the placeholder-deploy approach for suspension (better branding), but the disable endpoint should be documented for Phase 4/5 awareness.
- Polling endpoint is `GET /api/v1/deploys/{deploy_id}` (top-level deploys, not nested under sites). Both `GET /api/v1/sites/{site_id}/deploys/{deploy_id}` and `GET /api/v1/deploys/{deploy_id}` work.
- `ssl_url` IS included in the site creation response per the Open API spec, confirming the prior pattern.
- `GITHUB_PAT` is confirmed absent from all Edge Function source — only the secret itself needs removal, no code changes.

The Netlify zip-deploy API is synchronous at submission but the deploy requires polling until `state === 'ready'`. Deploy typically completes in 5–30 seconds for static HTML.

**Critical Netlify pricing:** As of September 4, 2025, all new Netlify accounts use credit-based pricing: 300 free credits/month at 15 credits per production deploy = 20 free production deploys/month on a new account. This is a launch blocker. Legacy accounts (created before Sep 4, 2025) are unaffected. This is also a cost consideration for the placeholder-deploy approach to suspension — each placeholder deploy costs 15 credits, same as a real deploy. The disable endpoint approach costs 0 credits.

**Primary recommendation:** Use placeholder-deploy for suspension as per CONTEXT.md (better branded UX). Write `netlify_site_id` immediately after site creation, before the zip deploy, to ensure idempotent retries. Poll `GET /api/v1/deploys/{deploy_id}` until `state === 'ready'` with a 5-second sleep loop, max 12 iterations (60 seconds total — within the 50s wall-clock limit issue only if the 50s is measured from request receipt; deploy-site runs as a background task via `EdgeRuntime.waitUntil()`).

---

## Standard Stack

### Core (deploy-site Edge Function)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `npm:jszip` | `^3.10.1` | In-memory zip creation from string file contents | Battle-tested; `npm:` imports work in Deno Edge Functions; Deno's native `CompressionStream` produces gzip not zip |
| `fetch` (native Deno) | built-in | Netlify API calls | No wrapper needed; Netlify REST API surface is narrow (4–5 calls max) |
| `@supabase/supabase-js` | `2` (via `https://esm.sh/`) | Storage list/download + DB updates | Already used in `_shared/supabase-admin.ts` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsr:@supabase/functions-js` | latest | Deno edge runtime types + `EdgeRuntime` global | Already in every function; provides `EdgeRuntime.waitUntil()` global |
| `deno.land/x/jszip` | `0.11.0` | Alternative Deno-native JSZip wrapper | Only if `npm:jszip` has import issues in Supabase runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npm:jszip` | `CompressionStream` (native Deno) | Native produces gzip, not zip; Netlify requires `.zip` format |
| `npm:jszip` | `deno.land/x/jszip` | The deno.land wrapper is a thin re-export of jszip; `npm:` is simpler |
| Separate `suspend-site` + `reactivate-site` | Single `manage-site` with action param | Separate functions are cleaner for RLS/auth scoping; easier to invoke from Phase 4 Yoco webhook |
| Placeholder-deploy for suspension | `PUT /api/v1/sites/{site_id}/disable` | Disable endpoint: free (0 credits), but shows Netlify's generic "site offline" page; placeholder-deploy: costs 15 credits but shows branded keep-hosting suspension page with payment CTA |

**Installation:**
No npm install needed for Edge Functions — Deno resolves `npm:jszip` at runtime.

For Wave 0 test stubs (Vitest, Node), jszip can be imported:
```bash
npm install jszip --save-dev  # only for test files that import jszip directly
```

---

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
├── deploy-site/
│   └── index.ts              # New: zip-deploy to Netlify
├── suspend-site/
│   └── index.ts              # New: deploy placeholder page
├── reactivate-site/
│   └── index.ts              # New: re-deploy from Storage
├── build-orchestrator/
│   └── index.ts              # Extend: add deploy_failed polling
├── persist-files/
│   └── index.ts              # Extend: chain to deploy-site after success
├── _shared/
│   ├── supabase-admin.ts     # Unchanged
│   ├── cors.ts               # Unchanged
│   └── suspended-page.ts     # New: exported HTML string constant
└── (no __tests__ directory — tests live in src/test/)

supabase/migrations/
└── 005_deploy_pipeline.sql   # New: extend build_status CHECK, add indexes

src/types/
└── database.ts               # Update: build_status union type to include new values

src/test/
├── deploy01.test.ts          # New Wave 0 stub
├── deploy02.test.ts          # New Wave 0 stub
├── deploy03.test.ts          # New Wave 0 stub
├── deploy04.test.ts          # New Wave 0 stub
├── deploy05.test.ts          # New Wave 0 stub
└── deploy06.test.ts          # New Wave 0 stub
```

### Pattern 1: Netlify Site Creation (Team Account)

**What:** Create a Netlify site under the team account with a UUID-based name.
**When to use:** When `client_sites.netlify_site_id` is null (first deploy only — lazy creation).

```typescript
// Source: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/
// Source: https://open-api.netlify.com/#tag/site/operation/createSiteInTeam
const teamSlug = Deno.env.get('NETLIFY_TEAM_SLUG')!
const pat = Deno.env.get('NETLIFY_PAT')!

const res = await fetch(`https://api.netlify.com/api/v1/${teamSlug}/sites`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${pat}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: `kh-${siteId.slice(0, 8)}` }),
})
if (!res.ok) throw new Error(`Netlify site create failed: ${res.status}`)
const site = await res.json()
// site.id      = netlify site UUID (canonical reference for all future API calls)
// site.url     = "http://kh-4a73eb66.netlify.app"
// site.ssl_url = "https://kh-4a73eb66.netlify.app"  ← prefer this (HTTPS)
// site.name    = "kh-4a73eb66"
netlifysSiteId = site.id
netlifyUrl = site.ssl_url || site.url
// Write netlify_site_id to DB IMMEDIATELY here — before zip deploy attempt
```

### Pattern 2: Supabase Storage List + Download

**What:** List all files in a site's Storage folder, download each as text.
**When to use:** In `deploy-site` and `reactivate-site` before zipping.

```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-list
// Source: https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/read-storage/index.ts
const supabase = getSupabaseAdmin()

const { data: fileList, error: listErr } = await supabase.storage
  .from('client-sites')
  .list(siteId, { limit: 100 })
if (listErr) throw listErr

// Filter out folder entries (item.metadata === null means it's a folder, not a file)
const fileItems = (fileList ?? []).filter(item => item.metadata !== null)

const files: Array<{ path: string; content: string }> = []
for (const item of fileItems) {
  const filePath = `${siteId}/${item.name}`
  const { data: blob, error: dlErr } = await supabase.storage
    .from('client-sites')
    .download(filePath)
  if (dlErr || !blob) continue
  const content = await blob.text()
  files.push({ path: item.name, content })
}
// files is now [{path: 'index.html', content: '<html>...'}, ...]
```

### Pattern 3: JSZip In-Memory Zip Creation

**What:** Create a zip buffer from file path/content pairs for the Netlify deploy body.
**When to use:** After reading files from Storage; before POSTing to Netlify.

```typescript
// Source: https://stuk.github.io/jszip/documentation/examples.html
import JSZip from 'npm:jszip'

const zip = new JSZip()
for (const file of files) {
  zip.file(file.path, file.content)
}
// ALWAYS use uint8array — blob type may not be available in all Deno environments
const zipBuffer: Uint8Array = await zip.generateAsync({ type: 'uint8array' })
// Pass zipBuffer directly as fetch body — Deno's fetch accepts Uint8Array
```

### Pattern 4: Netlify Zip Deploy + Polling

**What:** POST a zip to an existing Netlify site and poll until ready.
**When to use:** After site creation (or with existing `netlify_site_id`).

```typescript
// Source: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/#deploy-with-a-zip-file
const NETLIFY_API = 'https://api.netlify.com/api/v1'

const deployRes = await fetch(
  `${NETLIFY_API}/sites/${netlifysSiteId}/deploys`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('NETLIFY_PAT')}`,
      'Content-Type': 'application/zip',
    },
    body: zipBuffer,
  }
)
if (deployRes.status === 429) {
  const retryAfter = deployRes.headers.get('Retry-After') ?? '60'
  // Set next_retry_at = now + retryAfter seconds, update build_status = 'deploy_failed', return early
}
if (!deployRes.ok) throw new Error(`Netlify deploy failed: ${deployRes.status}`)
const deploy = await deployRes.json()
// deploy.id    = deploy UUID for polling
// deploy.state = initial state ('uploading' or 'preparing')

// Poll using top-level deploys endpoint (confirmed in official docs)
// GET /api/v1/deploys/{deploy_id} — NOT /sites/{site_id}/deploys/{deploy_id}
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000))
  const check = await fetch(
    `${NETLIFY_API}/deploys/${deploy.id}`,
    { headers: { 'Authorization': `Bearer ${Deno.env.get('NETLIFY_PAT')}` } }
  )
  const status = await check.json()
  if (status.state === 'ready') break
  if (i === 11) throw new Error('Deploy did not reach ready state in 60s')
}
// state values: 'preparing' | 'prepared' | 'uploading' | 'uploaded' | 'ready' | 'current' | 'old'
```

### Pattern 5: persist-files → deploy-site Fire-and-Forget Chain

**What:** After persist-files writes to Storage, it invokes deploy-site without awaiting.
**When to use:** End of `persist-files/index.ts`, after the successful Storage write block.

```typescript
// Source: Established pattern from generate-site → persist-files (build-orchestrator/index.ts line 51)
// EdgeRuntime is a global — no import needed (provided by jsr:@supabase/functions-js/edge-runtime.d.ts)
EdgeRuntime.waitUntil(
  supabase.functions.invoke('deploy-site', { body: { siteId } })
    .catch(async (err: Error) => {
      await logEvent(supabase, siteId, 'deploy_invoke_error', 'error', err.message)
    })
)
// Return response immediately — deploy runs in background
return jsonResponse({ success: true, persisted_count: persisted.length })
```

**Note:** `EdgeRuntime.waitUntil()` is a global in the Supabase Edge Function environment. It marks the background promise so the runtime does not kill it when the HTTP response is sent. Without it, the fire-and-forget invoke may be killed before completing.

### Pattern 6: Rate Limit Check via build_events

**What:** Count recent deploy_done events to enforce 3/min and 100/day limits.
**When to use:** At the start of `deploy-site`, before any Netlify API call.

```typescript
// Token bucket using build_events table — no new table needed
const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()

const { count: perMinute } = await supabase
  .from('build_events')
  .select('*', { count: 'exact', head: true })
  .eq('event_type', 'deploy_done')
  .gte('created_at', oneMinuteAgo)

const { count: perDay } = await supabase
  .from('build_events')
  .select('*', { count: 'exact', head: true })
  .eq('event_type', 'deploy_done')
  .gte('created_at', oneDayAgo)

if ((perMinute ?? 0) >= 3) {
  const nextRetry = new Date(Date.now() + 60_000).toISOString()
  await supabase.from('client_sites')
    .update({ next_retry_at: nextRetry, build_status: 'deploy_failed' })
    .eq('id', siteId)
  return jsonResponse({ queued: true, reason: 'rate_limit_per_min' })
}
if ((perDay ?? 0) >= 100) {
  const tomorrow = new Date()
  tomorrow.setUTCHours(24, 0, 0, 0)
  await supabase.from('client_sites')
    .update({ next_retry_at: tomorrow.toISOString(), build_status: 'deploy_failed' })
    .eq('id', siteId)
  return jsonResponse({ queued: true, reason: 'rate_limit_per_day' })
}
if ((perDay ?? 0) >= 80) {
  await logEvent(supabase, siteId, 'deploy_quota_warning', 'warning',
    `Daily deploy count at ${perDay}/100 — approaching quota`)
}
```

### Pattern 7: Suspend via Placeholder Deploy (Primary — per CONTEXT.md)

**What:** Deploy a single-file placeholder HTML zip to an existing Netlify site.
**When to use:** `suspend-site` function.

```typescript
// Deploy placeholder — same zip-deploy endpoint, one file zip
import JSZip from 'npm:jszip'
import { SUSPENDED_PAGE_HTML } from '../_shared/suspended-page.ts'

const zip = new JSZip()
zip.file('index.html', SUSPENDED_PAGE_HTML)
const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

// POST to same /deploys endpoint with existing netlify_site_id
// On success: update build_status = 'suspended', orders.status = 'suspended'
// Log 'site_suspended' to build_events
// NOTE: Each placeholder deploy costs 15 credits (same as real deploy) on new credit-based accounts
```

### Pattern 7b: Suspend via Netlify Disable Endpoint (Alternative — document for Phase 4/5)

**What:** Disable a Netlify site via the official API endpoint — no deploy credit consumed.
**When to use:** Not the CONTEXT.md choice for v1 (unbranded visitor experience), but document for Phase 4/5 consideration.

```typescript
// Source: https://open-api.netlify.com/#tag/site/operation/disableSite
// Returns 204 No Content on success
const disableRes = await fetch(
  `https://api.netlify.com/api/v1/sites/${netlifysSiteId}/disable`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${pat}` },
  }
)
// Visitor behavior: shows Netlify's generic "site not available" page (not branded)
// Site ID, custom domain, SSL preserved — can re-enable with PUT /sites/{site_id}/enable

// Re-enable:
const enableRes = await fetch(
  `https://api.netlify.com/api/v1/sites/${netlifysSiteId}/enable`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${pat}` },
  }
)
// After enable, the last deployed content is live again (no new deploy needed)
```

### Pattern 8: build-orchestrator Extension for deploy_failed

**What:** Add `deploy_failed` to the status query so stuck deploys get retried.
**When to use:** Extend `build-orchestrator/index.ts` query.

```typescript
// Current: .in('build_status', ['pending', 'retry'])
// Extended: .in('build_status', ['pending', 'retry', 'deploy_failed'])
// Route to correct function based on status

const fn = row.build_status === 'deploy_failed' ? 'deploy-site' : 'generate-site'
supabase.functions.invoke(fn, { body: { siteId: row.id } })
  .catch(async (err: Error) => {
    await logEvent(supabase, row.id, 'orchestrator_invoke_error', 'error', err.message)
  })
```

### Anti-Patterns to Avoid

- **Awaiting deploy-site from persist-files:** Kills the 150s wall-clock budget — use fire-and-forget with `EdgeRuntime.waitUntil()`.
- **Deleting the Netlify site for suspension:** Loses the site ID, custom domain attachment, and SSL cert — always use placeholder deploy or the disable endpoint.
- **Naming Netlify sites after business name:** Collision-guaranteed (common SA business names already exist globally in Netlify) — use `kh-{uuid8}`.
- **Not persisting `netlify_site_id` before deploy:** If site creation succeeds but deploy fails, retries create orphan Netlify sites — write `netlify_site_id` immediately after site creation, before the zip POST.
- **Using personal account endpoint `POST /api/v1/sites`:** Sites accumulate in the personal account, not the team. Always use `POST /api/v1/{team_slug}/sites`.
- **Parsing Netlify `url` field for the live URL:** Use `ssl_url` when available (HTTPS); fall back to `url`.
- **Polling `/sites/{site_id}/deploys/{deploy_id}`:** The confirmed polling endpoint is `GET /api/v1/deploys/{deploy_id}` (top-level). Both work but the top-level form is what the official docs show.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-memory zip from strings | Custom binary zip encoder | `npm:jszip` | ZIP format has complex header/trailer structure, local file headers, CRC checksums — not trivial |
| Netlify deploy state polling | Exponential backoff scheduler | Simple 5s sleep loop, max 12 iterations | Netlify static deploys are fast (5–30s); complex scheduler wastes edge function budget |
| Rate limit tracking | New `netlify_quota` table | `build_events` count query | `build_events` already exists; adding a table is unnecessary complexity |
| Netlify site disable/enable | Custom "suspend placeholder" for credit efficiency | `PUT /api/v1/sites/{site_id}/disable` | The disable endpoint is free (0 credits); placeholder deploy costs 15 credits — if the credit budget becomes a concern post-launch, switch to disable endpoint |

**Key insight:** The entire deploy flow is narrow (4–5 API calls: create site, write site_id, POST zip, poll state, optionally suspend/enable). No SDK or abstraction layer is needed.

---

## Common Pitfalls

### Pitfall 1: Netlify Credit-Based Pricing — 20 Deploys/Month on New Free Account

**What goes wrong:** A Netlify account created after September 4, 2025 is on credit-based pricing: 300 free credits/month, 15 credits per production deploy = only 20 free deploys/month. At 20+ customers, the free plan runs out before month end. The same 15-credit charge applies to placeholder suspension deploys.

**Why it happens:** Netlify changed pricing in September 2025. Prior research documented "3/min, 100/day" API rate limits — those are separate from the credit consumption quota.

**How to avoid:**
1. Use a Netlify account created **before** September 4, 2025 (legacy plan — unlimited deploys on free tier apply under legacy pricing).
2. OR use the Pro plan ($20/member/month) which gives 3,000 credits/month = ~200 deploys/month.
3. OR consider `PUT /sites/{site_id}/disable` for suspension instead of placeholder deploy — disable endpoint costs 0 credits.
4. The plan must include a human checkpoint: confirm account creation date and credit balance before go-live.

**Warning signs:** Deploy API returns 402 or billing-related 422 after ~20 deploys in a month. Netlify dashboard shows credit balance at zero.

### Pitfall 2: ZIP Deploy Not Immediately Live — Must Poll

**What goes wrong:** After POSTing the zip, code assumes the site is live and immediately updates `build_status = 'deployed'`. The Netlify site is actually still in `preparing` state — not accessible yet.

**Why it happens:** Zip deploys enter post-processing (asset fingerprinting, routing setup) before going live. Initial deploy response state is `uploading` or `preparing`, not `ready`.

**How to avoid:** Always poll `GET /api/v1/deploys/{deploy_id}` until `state === 'ready'` before marking `build_status = 'deployed'`. Typical wait: 5–30 seconds for pure static HTML.

**Warning signs:** Customer sees netlify_url but site 404s or shows a Netlify error page.

### Pitfall 3: netlify_site_id Not Written Before Deploy Attempt

**What goes wrong:** `deploy-site` creates the Netlify site, then fails during the zip deploy step. On retry, it creates ANOTHER Netlify site (because `netlify_site_id` is still null in the DB), leaving orphan sites accumulating in the team account.

**Why it happens:** Transactional gap between site creation and DB write.

**How to avoid:** Write `netlify_site_id` to the DB immediately after the site creation API call succeeds — before the zip deploy POST. That way, retries find the existing `netlify_site_id` and re-deploy to the correct site.

### Pitfall 4: Supabase Storage `.list()` Returns Only Root-Level Items

**What goes wrong:** `persist-files` stores files at `{siteId}/index.html`, `{siteId}/style.css`, etc. If a file was stored at a nested path like `{siteId}/assets/logo.png`, calling `.list(siteId)` returns `assets/` as a folder object (with `metadata === null`), not as a file. The download loop fails silently.

**Why it happens:** Supabase Storage `.list()` is not recursive.

**How to avoid:** For Phase 3 (v1), all persisted files from `persist-files` are flat (no subdirectories — confirmed by reading `persist-files/index.ts`). The file loop is safe for v1. Add a `metadata !== null` guard to skip folder entries if the structure ever changes:
```typescript
const fileItems = (fileList ?? []).filter(item => item.metadata !== null)
```

### Pitfall 5: JSZip `generateAsync` in Deno — Use `uint8array` Not `blob`

**What goes wrong:** JSZip's `generateAsync({type: 'blob'})` requires the Web `Blob` constructor. Some Deno runtime versions or edge function environments may not have it fully available.

**How to avoid:** Always use `generateAsync({ type: 'uint8array' })` in Deno Edge Functions. Pass the resulting `Uint8Array` directly as the `fetch` body — Deno's `fetch` accepts `Uint8Array`.

### Pitfall 6: Rate Limit Query Performance Under Load

**What goes wrong:** The `build_events` count query for rate limiting runs on every deploy attempt. At high volume, `COUNT(*)` without covering indexes adds latency.

**How to avoid:** Migration 005 should add an index on `build_events(event_type, created_at)`:

```sql
CREATE INDEX IF NOT EXISTS idx_build_events_type_created
  ON public.build_events (event_type, created_at)
  WHERE event_type = 'deploy_done';
```

### Pitfall 7: Placeholder Suspend Deploys Consuming Credits

**What goes wrong:** On a credit-based account, every suspension of a site (placeholder deploy) costs 15 credits. At scale, if customers are frequently suspended and reactivated (churn, payment failures), the credit budget erodes from suspend/reactivate operations, not just initial deploys.

**Why it happens:** Any successful production deploy costs 15 credits regardless of what it deploys.

**How to avoid:** Post-launch, if credit usage becomes a concern, switch the suspension mechanism to `PUT /api/v1/sites/{site_id}/disable` (0 credits) and reactivation to `PUT /api/v1/sites/{site_id}/enable` + re-deploy from Storage when needed. For v1, placeholder-deploy is acceptable at low scale.

---

## Code Examples

### Complete deploy-site Skeleton

```typescript
// supabase/functions/deploy-site/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import JSZip from 'npm:jszip'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const NETLIFY_API = 'https://api.netlify.com/api/v1'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()
  const supabase = getSupabaseAdmin()
  const pat = Deno.env.get('NETLIFY_PAT')!
  const teamSlug = Deno.env.get('NETLIFY_TEAM_SLUG')!

  try {
    const { siteId } = await req.json()
    if (!siteId) return jsonResponse({ error: 'siteId required' }, 400)

    // 1. Rate limit check (Pattern 6 above)
    // ... (omitted for brevity — see Pattern 6)

    // 2. Fetch site record
    const { data: site } = await supabase
      .from('client_sites').select('*').eq('id', siteId).single()
    if (!site) return jsonResponse({ error: 'site not found' }, 404)

    // 3. Update status → deploying
    await supabase.from('client_sites')
      .update({ build_status: 'deploying', last_attempted_at: new Date().toISOString() })
      .eq('id', siteId)

    // 4. Read files from Storage (Pattern 2 above)
    const { data: fileList } = await supabase.storage
      .from('client-sites').list(siteId, { limit: 100 })
    const files: Array<{ path: string; content: string }> = []
    for (const item of (fileList ?? []).filter(f => f.metadata !== null)) {
      const { data: blob } = await supabase.storage
        .from('client-sites').download(`${siteId}/${item.name}`)
      if (blob) files.push({ path: item.name, content: await blob.text() })
    }
    if (files.length === 0) throw new Error('No files found in Storage')

    // 5. Create zip (Pattern 3 above)
    const zip = new JSZip()
    files.forEach(f => zip.file(f.path, f.content))
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    // 6. Create Netlify site if needed (lazy creation — Pattern 1)
    let netlifysSiteId = site.netlify_site_id
    let netlifyUrl = site.netlify_url
    if (!netlifysSiteId) {
      const createRes = await fetch(`${NETLIFY_API}/${teamSlug}/sites`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `kh-${siteId.slice(0, 8)}` }),
      })
      if (!createRes.ok) throw new Error(`Site create failed: ${createRes.status}`)
      const created = await createRes.json()
      netlifysSiteId = created.id
      netlifyUrl = created.ssl_url || created.url
      // CRITICAL: Write netlify_site_id BEFORE zip deploy to prevent orphan sites on retry
      await supabase.from('client_sites')
        .update({ netlify_site_id: netlifysSiteId, netlify_url: netlifyUrl })
        .eq('id', siteId)
    }

    // 7. Deploy zip (Pattern 4)
    const deployRes = await fetch(`${NETLIFY_API}/sites/${netlifysSiteId}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/zip' },
      body: zipBuffer,
    })
    if (deployRes.status === 429) {
      const retryAfter = parseInt(deployRes.headers.get('Retry-After') ?? '60', 10)
      const nextRetry = new Date(Date.now() + retryAfter * 1000).toISOString()
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed', next_retry_at: nextRetry })
        .eq('id', siteId)
      return jsonResponse({ queued: true, reason: '429_rate_limited' })
    }
    if (!deployRes.ok) throw new Error(`Deploy failed: ${deployRes.status}`)
    const deploy = await deployRes.json()

    // 8. Poll until ready — GET /api/v1/deploys/{deploy_id} (top-level endpoint)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const check = await fetch(
        `${NETLIFY_API}/deploys/${deploy.id}`,
        { headers: { 'Authorization': `Bearer ${pat}` } }
      )
      const status = await check.json()
      if (status.state === 'ready') break
      if (i === 11) throw new Error('Deploy timed out (60s)')
    }

    // 9. Mark deployed
    await supabase.from('client_sites')
      .update({ build_status: 'deployed', netlify_url: netlifyUrl })
      .eq('id', siteId)
    await logEvent(supabase, siteId, 'deploy_done', 'success',
      `Deployed to ${netlifyUrl}`)

    return jsonResponse({ success: true, netlify_url: netlifyUrl })
  } catch (err) {
    const msg = (err as Error).message
    console.error('deploy-site error:', msg)
    // Best-effort: update status and log event
    // Note: siteId may not be available if req.json() failed — handle gracefully
    return jsonResponse({ error: msg }, 500)
  }
})
```

### Migration 005 — build_status Extension

```sql
-- supabase/migrations/005_deploy_pipeline.sql
BEGIN;

-- Drop and re-add CHECK to include deploy states
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE 'client_sites_build_status%'
  ) THEN
    ALTER TABLE public.client_sites DROP CONSTRAINT IF EXISTS client_sites_build_status_check;
  END IF;
END $$;

ALTER TABLE public.client_sites
  ADD CONSTRAINT client_sites_build_status_check
  CHECK (build_status IN (
    'pending', 'generating', 'generated', 'retry', 'failed',
    'pushing_github',  -- kept for backwards compat (old rows may have this value)
    'deploying', 'deployed', 'deploy_failed',
    'suspending', 'suspended',
    'live'
  ));

-- Index for rate-limit counting query (no index on event_type alone currently)
CREATE INDEX IF NOT EXISTS idx_build_events_type_created
  ON public.build_events (event_type, created_at DESC)
  WHERE event_type = 'deploy_done';

-- Index for orchestrator's new deploy_failed poll
CREATE INDEX IF NOT EXISTS idx_client_sites_deploy_queue
  ON public.client_sites (build_status, next_retry_at)
  WHERE build_status IN ('deploy_failed');

COMMIT;
```

### TypeScript Type Update

```typescript
// In src/types/database.ts — update build_status union type in client_sites Row, Insert, Update:
build_status:
  | 'pending' | 'generating' | 'generated' | 'retry' | 'failed'
  | 'pushing_github'   // legacy — kept for existing rows
  | 'deploying' | 'deployed' | 'deploy_failed'
  | 'suspending' | 'suspended' | 'live'
```

### DashboardPage.tsx — BUILD_STEPS Update Required

The current `BUILD_STEPS` array uses `pushing_github` and `deploying_netlify` as step keys. These need updating to match the new status values:

```typescript
// Current (needs update):
const BUILD_STEPS = [
  { key: 'pending', ... },
  { key: 'generating', ... },
  { key: 'generated', ... },
  { key: 'pushing_github', ... },    // ← remove or remap
  { key: 'deploying_netlify', ... }, // ← rename to 'deploying'
  { key: 'live', ... },              // ← add 'deployed' step
]

// Updated:
const BUILD_STEPS = [
  { key: 'pending', label: 'Queued', icon: Clock, pct: 5 },
  { key: 'generating', label: 'Designing your site', icon: Sparkles, pct: 30 },
  { key: 'generated', label: 'Code generated', icon: Code2, pct: 55 },
  { key: 'deploying', label: 'Deploying preview', icon: Rocket, pct: 80 },
  { key: 'deployed', label: 'Preview ready!', icon: CheckCircle2, pct: 100 },
]
// Also add 'suspended' to statusConfig with a warning-style badge
// 'deploy_failed' should map to the 'failed' statusConfig entry (red)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub repo → Netlify CI deploy | Direct zip-deploy API | Phase 3 (now) | Eliminates 30–120s CI queue wait; no GitHub PAT; no repo cleanup debt |
| No suspend mechanism | Deploy placeholder page (or disable endpoint) | Phase 3 (now) | Preserves Netlify site ID + SSL for reactivation; branded UX during suspension |
| GitHub PAT required | Only NETLIFY_PAT + NETLIFY_TEAM_SLUG | Phase 3 (now) | Fewer secrets; simpler security surface |
| Netlify free plan unlimited deploys | Credit-based: 15 credits/deploy, 300/mo free | Sep 4, 2025 | Legacy accounts unaffected; new accounts get only ~20 free deploys/month |
| No native "unpublish" endpoint (prior research) | `PUT /api/v1/sites/{site_id}/disable` exists | Confirmed April 2026 | 0-credit suspension alternative; prior research was incorrect |

**Deprecated/outdated:**
- `GITHUB_PAT`, `GITHUB_ORG` secrets: safe to remove — confirmed absent from all Edge Function source code (grepped the full `supabase/functions/` tree, zero matches)
- `deployToGitHub()` / `deployToNetlify()` functions: were in the original 581-line `build-site` function; the current `build-site/index.ts` is a 35-line shim with none of that code — nothing to delete there; Phase 4 will delete the shim entirely

---

## Open Questions

1. **Netlify account creation date and pricing tier**
   - What we know: Accounts created before Sep 4, 2025 are on legacy pricing (unlimited deploys on free tier). New accounts get 300 credits/month (20 production deploys).
   - What's unclear: When was the project's Netlify account created? Is it legacy or credit-based?
   - Recommendation: Add as a human-verify checkpoint in Plan 1. User must confirm account type before deploying. If credit-based, upgrade to Pro ($20/mo = 3,000 credits = ~200 deploys/month) before launch.

2. **`NETLIFY_TEAM_SLUG` value**
   - What we know: Required for `POST /api/v1/{team_slug}/sites/` endpoint.
   - What's unclear: Has the user created a dedicated Netlify Team account? What is the slug?
   - Recommendation: Plan 1 Wave 0 must include a task: "Create dedicated Netlify Team → obtain NETLIFY_TEAM_SLUG → set as Supabase secret alongside NETLIFY_PAT."

3. **DashboardPage.tsx `BUILD_STEPS` alignment**
   - What we know: Current steps include `pushing_github` and `deploying_netlify` which don't match new status values `deploying` and `deployed`.
   - Recommendation: Update `BUILD_STEPS` array and `statusConfig` in `DashboardPage.tsx` to map `deploying` → "Deploying preview", `deployed` → "Preview ready!", `suspended` → warning state, `deploy_failed` → error state (same red style as `failed`).

4. **disable endpoint visitor behavior (LOW confidence)**
   - What we know: `PUT /api/v1/sites/{site_id}/disable` returns 204; site "takes offline while keeping existing configuration"; re-enabled with `PUT /api/v1/sites/{site_id}/enable`.
   - What's unclear: Exactly what visitors see when they hit a disabled site (Netlify generic error page vs 404). Community reports suggest a Netlify-branded "site not available" page.
   - Recommendation: Stick with placeholder-deploy for v1 (CONTEXT.md decision + branded UX). Document disable endpoint as Phase 4/5 credit-optimization option.

5. **50s wall-clock vs deploy polling**
   - What we know: Supabase free-tier Edge Functions have a 50s wall-clock limit. `EdgeRuntime.waitUntil()` is designed to allow background work past this limit.
   - What's unclear: Whether `waitUntil()` genuinely bypasses the 50s limit or if it only applies to the response-return timing. The polling loop (12 × 5s = 60s) technically exceeds 50s.
   - Recommendation: Use `EdgeRuntime.waitUntil()` and test on the actual Supabase project. If the 50s limit is still hit, reduce the poll loop to 8 × 5s = 40s and mark as `deploy_failed` if not ready — the orchestrator will retry once the deploy completes (Netlify site will be in `ready` state by then and the next deploy attempt to an already-deployed-but-unknown-to-us site will succeed idempotently if `netlify_site_id` is already set).

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (configured in `vite.config.ts`) |
| Config file | `vite.config.ts` (test block present, DO NOT reinstall) |
| Quick run command | `npm run test:ci -- --reporter=dot src/test/deploy01.test.ts` |
| Full suite command | `npm run test:ci` |
| Stub template | `src/test/gen05.test.ts` (source-scan pattern — read file, assert on string content) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `deploy-site/index.ts` has no GitHub API calls; `persist-files/index.ts` invokes `deploy-site`; no `GITHUB_PAT` references in any Edge Function | unit (source scan) | `npm run test:ci -- src/test/deploy01.test.ts` | ❌ Wave 0 |
| DEPLOY-02 | Site name pattern is `kh-{8chars}`; site creation URL contains team account slug (not `/api/v1/sites` personal endpoint) | unit (source scan) | `npm run test:ci -- src/test/deploy02.test.ts` | ❌ Wave 0 |
| DEPLOY-03 | Rate limit function counts `deploy_done` events; blocks at 3/min and 100/day; logs warning at 80/day | unit (logic test) | `npm run test:ci -- src/test/deploy03.test.ts` | ❌ Wave 0 |
| DEPLOY-04 | `suspend-site/index.ts` deploys a zip containing only `index.html` to existing `netlify_site_id`; uses `SUSPENDED_PAGE_HTML` from `_shared/suspended-page.ts` | unit (source scan) | `npm run test:ci -- src/test/deploy04.test.ts` | ❌ Wave 0 |
| DEPLOY-05 | `reactivate-site/index.ts` reads from Storage bucket `client-sites`; does NOT call Claude or invoke `generate-site` | unit (source scan) | `npm run test:ci -- src/test/deploy05.test.ts` | ❌ Wave 0 |
| DEPLOY-06 | `deploy-site/index.ts` writes `netlify_site_id` to DB before the zip POST; sets `build_status = 'deploy_failed'` on error; orchestrator polls `deploy_failed` rows | unit (source scan) | `npm run test:ci -- src/test/deploy06.test.ts` | ❌ Wave 0 |
| Full deploy flow | Netlify API response → `build_status = 'deployed'` transition with real credentials | manual-only | N/A — requires real NETLIFY_PAT + team account | - |
| Rate limit 429 | 429 response from Netlify triggers `next_retry_at` via Retry-After header | manual-only | N/A — requires real Netlify account at quota | - |

**Manual-only justification:** Live Netlify API tests require real credentials, a funded team account, and consume deploy credits. Not suitable for automated CI runs.

### Sampling Rate

- **Per task commit:** `npm run test:ci -- src/test/deploy0N.test.ts` (the relevant stub for the task)
- **Per wave merge:** `npm run test:ci`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All six DEPLOY test files must be created as `it.todo()` stubs before Wave 1 implementation:

- [ ] `src/test/deploy01.test.ts` — covers DEPLOY-01 (no GitHub calls, persist-files chains to deploy-site, GITHUB_PAT absent)
- [ ] `src/test/deploy02.test.ts` — covers DEPLOY-02 (site name `kh-{8chars}` pattern, team account endpoint used)
- [ ] `src/test/deploy03.test.ts` — covers DEPLOY-03 (rate limit logic: 3/min blocking, 100/day blocking, 80/day warning)
- [ ] `src/test/deploy04.test.ts` — covers DEPLOY-04 (suspend-site deploys single-file zip, uses SUSPENDED_PAGE_HTML)
- [ ] `src/test/deploy05.test.ts` — covers DEPLOY-05 (reactivate-site reads Storage, no Claude or generate-site invoke)
- [ ] `src/test/deploy06.test.ts` — covers DEPLOY-06 (netlify_site_id written before deploy, deploy_failed on error, orchestrator retries deploy_failed)

Use `it.todo()` stub pattern from Phase 2 — see `src/test/gen05.test.ts` for the source-scan approach (readFileSync + string assertions). Do NOT import production modules in stubs — gen05.test.ts shows the correct pattern.

---

## Sources

### Primary (HIGH confidence)
- [Netlify API: Get started](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/) — zip deploy workflow, team account site creation endpoint, polling requirement, rate limit headers, 3/min + 100/day limits
- [Netlify Open API spec](https://open-api.netlify.com/) — deploy state values (`uploading`, `prepared`, `ready`), `POST /{account_slug}/sites` endpoint, `ssl_url` in site creation response, `PUT /sites/{site_id}/disable` + `PUT /sites/{site_id}/enable` endpoints confirmed
- [Netlify: Credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) — 300 free credits/month, 15 credits/production deploy, Sep 4 2025 cutoff for legacy vs credit accounts
- [Netlify: How credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) — failed deploys do NOT consume credits; successful production deploys do (15 credits each)
- [Netlify: Disable projects](https://docs.netlify.com/site-deploys/disable-sites/) — official docs for disable/enable site functionality
- [JSZip: generateAsync examples](https://stuk.github.io/jszip/documentation/examples.html) — `generateAsync({type: 'uint8array'})` pattern confirmed
- [Supabase Storage: list files](https://supabase.com/docs/reference/javascript/storage-from-list) — `.list()` API including folder entry behavior
- [Supabase Edge Functions: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks) — `EdgeRuntime.waitUntil()` is a global (no import), marks async work to prevent runtime kill
- Codebase: `supabase/functions/persist-files/index.ts` — Storage write pattern, `client-sites` bucket path convention, current end-of-function return (no deploy chain yet)
- Codebase: `supabase/functions/build-orchestrator/index.ts` — fire-and-forget invoke pattern at line 51, retry column usage
- Codebase: `supabase/migrations/004_generation_queue.sql` — current `build_status` CHECK values (includes `deploy_failed` and `suspended` already)
- Codebase: `src/types/database.ts` — TypeScript type definitions needing update
- Codebase: `src/pages/DashboardPage.tsx` — `BUILD_STEPS` array with stale `pushing_github`/`deploying_netlify` keys
- Grep scan: `GITHUB_PAT` — zero matches in any `.ts` file in `supabase/functions/` — safe to remove the secret

### Secondary (MEDIUM confidence)
- [Netlify: Deploy zip to production](https://developers.netlify.com/guides/deploy-zip-file-to-production-website/) — confirmed zip is the correct format; polling endpoint is `GET /api/v1/deploys/{deploy_id}`
- WebSearch: 429 Netlify rate limit returns `Retry-After: 60` header — corroborated by multiple community reports; `X-RateLimit-*` headers exist on general API (500 req/min limit)
- [Supabase storage read example](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/read-storage/index.ts) — `.download()` → `.text()` pattern

### Tertiary (LOW confidence)
- WebSearch: Netlify disabled site shows "site not available" Netlify-branded page — community reports only; not verified in official docs
- WebSearch: `npm:jszip` in Deno works with `npm:` specifier — no direct official Supabase example found; Deno's npm compatibility is well-documented generally

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — JSZip and fetch confirmed; Netlify endpoints verified via official docs and Open API spec
- Architecture: HIGH — fire-and-forget pattern already exists in codebase; patterns are direct extensions of Phase 2
- Pitfalls: HIGH for credit pricing (verified via official docs); HIGH for polling requirement; HIGH for `netlify_site_id` write-before-deploy pattern; MEDIUM for disable endpoint visitor UX (community reports only)
- Rate limits: HIGH for 3/min, 100/day API limits; HIGH for 15 credit/deploy (confirmed in billing docs)

**New findings vs prior research:**
- `PUT /api/v1/sites/{site_id}/disable` endpoint EXISTS — prior research said "no native unpublish endpoint exists" — this was incorrect
- Polling endpoint confirmed as `GET /api/v1/deploys/{deploy_id}` (top-level) per official zip deploy guide
- `ssl_url` confirmed in site creation response via Open API spec
- `GITHUB_PAT` confirmed absent from all Edge Function source — removal is secret-only, no code change needed
- Failed deploys do NOT consume credits (good for retry-heavy workloads)

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (Netlify API is stable; credit pricing documented since Sep 2025)
