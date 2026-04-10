# Phase 3: Deployment Pipeline - Research

**Researched:** 2026-04-09
**Domain:** Netlify zip-deploy API, JSZip in Deno, Supabase Storage download patterns, build_status state machine extension
**Confidence:** HIGH (Netlify API endpoints verified via official docs; JSZip pattern verified; Storage pattern verified from official examples; rate limit numbers confirmed)

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
- Reactivate = re-deploy from Supabase Storage `client-sites/{siteId}/` (no Claude call)
- Remove GitHub deploy code + `GITHUB_PAT`; do NOT drop `github_repo`/`github_url` columns
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
| DEPLOY-01 | Remove GitHub-intermediated deployment; use Netlify direct zip-deploy API | Endpoint verified: `POST /api/v1/sites/{site_id}/deploys` with `Content-Type: application/zip`; GitHub code removal identified in `supabase/functions/build-site/index.ts` (legacy, now shimmed) |
| DEPLOY-02 | Each customer site gets UUID-based name inside single Netlify team account | `POST /api/v1/{account_slug}/sites/` with `{"name": "kh-{uuid8}"}` confirmed; collision-free by construction |
| DEPLOY-03 | Deploy queue enforces 3/min, 100/day limits; alert at 80/day | Rate limits confirmed via official docs; `build_events` token-bucket query pattern identified; `Retry-After` header returns 60s on 429 |
| DEPLOY-04 | Site suspension — deploy branded placeholder to Netlify site | No native "unpublish" endpoint exists; placeholder-deploy approach is correct strategy; confirmed by forum research |
| DEPLOY-05 | Site reactivation — redeploy from Supabase Storage | `client-sites/{siteId}/` bucket pattern confirmed in `persist-files`; list + download pattern verified from official Supabase docs |
| DEPLOY-06 | Deploy failure triggers retry with idempotency; Storage files eliminate need to re-call Claude | `build_status = 'deploy_failed'` + orchestrator poll pattern; `netlify_site_id` preserved across failures |
</phase_requirements>

---

## Summary

Phase 3 builds three new Supabase Edge Functions (`deploy-site`, `suspend-site`, `reactivate-site`), extends the `build_status` state machine, and removes all GitHub-related deploy code. The core technical work is: reading files from Supabase Storage, creating an in-memory zip with `npm:jszip`, and POSTing it to the Netlify zip-deploy API. All three operations have verified patterns with high confidence.

The Netlify zip-deploy API is well-documented and synchronous at submission — but the deploy itself requires polling until `state === 'ready'`. The deploy typically completes in 5–30 seconds for static HTML. Site creation under a team account uses `POST /api/v1/{account_slug}/sites/` (not the personal account endpoint). There is no native Netlify "unpublish" endpoint; the correct approach for suspension is exactly what CONTEXT.md decided: deploy a placeholder page to the existing Netlify site.

**Critical Netlify pricing change:** As of September 4, 2025, all new Netlify accounts use credit-based pricing. The free tier gives 300 credits/month, and each production deploy costs 15 credits — meaning only 20 free production deploys per month on a new account. The team should use a legacy account (created before Sep 4, 2025) OR budget for the paid plan. This is a launch blocker that the CONTEXT.md did not capture from prior research.

**Primary recommendation:** Deploy-site should create the Netlify site lazily (only when `netlify_site_id` is null), poll for `state === 'ready'` with a 5-second sleep loop up to 12 attempts (60 seconds max), and write `netlify_url` from the site object `ssl_url` or `url` field. The build-orchestrator extension for `deploy_failed` retry follows the exact same pattern as generation retry.

---

## Standard Stack

### Core (deploy-site Edge Function)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `npm:jszip` | `^3.10.1` | In-memory zip creation from string file contents | Battle-tested, `npm:` imports work in Deno Edge Functions; Deno's native `CompressionStream` produces gzip not zip |
| `fetch` (native Deno) | built-in | Netlify API calls | No wrapper needed; Netlify REST API surface is narrow (4 calls max) |
| `@supabase/supabase-js` | `2` (via `https://esm.sh/`) | Storage list/download + DB updates | Already used in `_shared/supabase-admin.ts` pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jsr:@supabase/functions-js` | latest | Deno edge runtime types | Already in every function; include it |
| `deno.land/x/jszip` | `0.11.0` | Alternative Deno-native JSZip wrapper | Only if `npm:jszip` has import issues in Supabase runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npm:jszip` | `CompressionStream` (native Deno) | Native produces gzip, not zip; Netlify requires `.zip` format |
| `npm:jszip` | `deno.land/x/jszip` | The deno.land wrapper is a thin re-export of jszip; `npm:` is simpler |
| Separate `suspend-site` + `reactivate-site` | Single `manage-site` with action param | Separate functions are cleaner for RLS/auth scoping; easier to invoke from Phase 4 Yoco webhook |

**Installation:**
No npm install needed for Edge Functions — Deno resolves `npm:jszip` at runtime.

For Wave 0 test stubs (Vitest, Node), jszip can be imported:
```bash
npm install jszip --save-dev  # only for test file that imports jszip directly
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
└── __tests__/
    └── (existing test files)

supabase/migrations/
└── 005_deploy_pipeline.sql   # New: extend build_status CHECK, add deploying/deployed/deploy_failed

src/types/
└── database.ts               # Update: build_status union type to include new values
```

### Pattern 1: Netlify Site Creation (Team Account)

**What:** Create a Netlify site under the team account with a UUID-based name.
**When to use:** When `client_sites.netlify_site_id` is null (first deploy only).

```typescript
// Source: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/
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
// site.id = netlify site UUID
// site.url = "https://kh-4a73eb66.netlify.app"
// site.ssl_url = "https://kh-4a73eb66.netlify.app"
netliftySiteId = site.id
netlifyUrl = site.ssl_url || site.url
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

const files: Array<{ path: string; content: string }> = []
for (const item of fileList ?? []) {
  if (!item.name) continue
  const filePath = `${siteId}/${item.name}`
  const { data: blob, error: dlErr } = await supabase.storage
    .from('client-sites')
    .download(filePath)
  if (dlErr || !blob) continue
  const content = await blob.text()
  files.push({ path: item.name, content })
}
// files is now [{path: 'index.html', content: '<html>...'}]
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
const zipBuffer: Uint8Array = await zip.generateAsync({ type: 'uint8array' })
// Pass zipBuffer directly as fetch body
```

### Pattern 4: Netlify Zip Deploy

**What:** POST a zip to an existing Netlify site and poll until ready.
**When to use:** After site creation (or with existing `netlify_site_id`).

```typescript
// Source: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/
const deployRes = await fetch(
  `https://api.netlify.com/api/v1/sites/${netlifysSiteId}/deploys`,
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
  // Set next_retry_at = now + retryAfter seconds, return early
}
if (!deployRes.ok) throw new Error(`Netlify deploy failed: ${deployRes.status}`)
const deploy = await deployRes.json()
// deploy.id = deploy UUID for polling
// deploy.state = 'uploading' | 'uploaded' | 'preparing' | 'prepared' | 'ready'

// Poll until ready (typically 5-30s for static HTML)
const deployId = deploy.id
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000))
  const check = await fetch(
    `https://api.netlify.com/api/v1/sites/${netlifysSiteId}/deploys/${deployId}`,
    { headers: { 'Authorization': `Bearer ${Deno.env.get('NETLIFY_PAT')}` } }
  )
  const status = await check.json()
  if (status.state === 'ready') break
  if (i === 11) throw new Error('Deploy did not reach ready state in 60s')
}
```

### Pattern 5: persist-files → deploy-site Fire-and-Forget Chain

**What:** After persist-files writes to Storage, it invokes deploy-site without awaiting.
**When to use:** End of `persist-files/index.ts`, after the successful Storage write block.

```typescript
// Source: Established pattern from generate-site → persist-files (build-orchestrator/index.ts line 51)
// Use EdgeRuntime.waitUntil for proper background task semantics
EdgeRuntime.waitUntil(
  supabase.functions.invoke('deploy-site', { body: { siteId } })
    .catch(async (err: Error) => {
      await logEvent(supabase, siteId, 'deploy_invoke_error', 'error', err.message)
    })
)
// Return response immediately — deploy runs in background
return jsonResponse({ success: true, persisted_count: persisted.length })
```

**Note:** `supabase.functions.invoke()` without `await` is the established pattern in this codebase (see `build-orchestrator/index.ts` line 51). `EdgeRuntime.waitUntil()` wrapping ensures the Deno runtime doesn't kill the background task before it completes.

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
  // Delay 60s from now
  const nextRetry = new Date(Date.now() + 60_000).toISOString()
  await supabase.from('client_sites').update({ next_retry_at: nextRetry, build_status: 'deploy_failed' }).eq('id', siteId)
  return jsonResponse({ queued: true, reason: 'rate_limit_per_min' })
}
if ((perDay ?? 0) >= 100) {
  // Delay until next day
  const tomorrow = new Date()
  tomorrow.setUTCHours(24, 0, 0, 0)
  await supabase.from('client_sites').update({ next_retry_at: tomorrow.toISOString(), build_status: 'deploy_failed' }).eq('id', siteId)
  return jsonResponse({ queued: true, reason: 'rate_limit_per_day' })
}
if ((perDay ?? 0) >= 80) {
  await logEvent(supabase, siteId, 'deploy_quota_warning', 'warning',
    `Daily deploy count at ${perDay}/100 — approaching quota`)
}
```

### Pattern 7: Suspend via Placeholder Deploy

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
```

### Pattern 8: build-orchestrator Extension for deploy_failed

**What:** Add `deploy_failed` to the status query so stuck deploys get retried.
**When to use:** Extend `build-orchestrator/index.ts` query.

```typescript
// Current: .in('build_status', ['pending', 'retry'])
// Extended: .in('build_status', ['pending', 'retry', 'deploy_failed'])
// Invoke deploy-site instead of generate-site when status is deploy_failed

const fn = row.build_status === 'deploy_failed' ? 'deploy-site' : 'generate-site'
supabase.functions.invoke(fn, { body: { siteId: row.id } })
  .catch(async (err: Error) => {
    await logEvent(supabase, row.id, 'orchestrator_invoke_error', 'error', err.message)
  })
```

### Anti-Patterns to Avoid

- **Awaiting deploy-site from persist-files:** Kills the 150s wall-clock budget — use fire-and-forget.
- **Deleting the Netlify site for suspension:** Loses the site ID, custom domain attachment, and SSL cert — always use placeholder deploy.
- **Naming Netlify sites after business name:** Collision-guaranteed (common SA business names will already exist globally in Netlify) — use `kh-{uuid8}`.
- **Not persisting `netlify_site_id` before deploy:** If site creation succeeds but deploy fails, you'd create a new orphan Netlify site on retry — write `netlify_site_id` immediately after site creation.
- **Using personal account endpoint `POST /api/v1/sites`:** All customer sites will accumulate in the personal account, not the team. Always use `POST /api/v1/{team_slug}/sites`.
- **Parsing Netlify `url` field for the live URL:** Use `ssl_url` when available (it includes `https://`); fall back to `url`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| In-memory zip from strings | Custom binary zip encoder | `npm:jszip` | ZIP format has complex header/trailer structure, local file headers, CRC checksums — not trivial |
| Netlify deploy state polling | Exponential backoff scheduler | Simple 5s sleep loop, max 12 iterations | Netlify static deploys are fast (5-30s); complex scheduler wastes edge function budget |
| Rate limit tracking | New `netlify_quota` table | `build_events` count query | `build_events` already exists; adding a table is unnecessary complexity |

**Key insight:** The entire deploy flow is narrow (4 API calls: create site, POST zip, poll state, optionally update site). No SDK or abstraction layer is needed.

---

## Common Pitfalls

### Pitfall 1: Netlify Credit-Based Pricing — 20 Deploys/Month on New Free Account

**What goes wrong:** A Netlify account created after September 4, 2025 is on credit-based pricing: 300 free credits/month, 15 credits per production deploy = only 20 free deploys/month. At 20+ customers, the free plan runs out before month end.

**Why it happens:** Netlify changed pricing in September 2025. Prior research documented "3/min, 100/day" API rate limits but those are separate from the credit consumption quota.

**How to avoid:**
1. Use a Netlify account created **before** September 4, 2025 (legacy plan — unlimited deploys on free tier still apply under legacy pricing).
2. OR use the Pro plan ($19/mo) which gives 1,000 credits/month = ~66 deploys/month.
3. The plan task must include a human checkpoint: confirm account creation date and credit balance before go-live.

**Warning signs:** Deploy API returns 402 or a billing-related 422 after ~20 deploys in a month.

### Pitfall 2: ZIP Deploy Not Immediately Live — Must Poll

**What goes wrong:** After POSTing the zip, code assumes the site is live and immediately updates `build_status = 'deployed'`. The Netlify site is actually still in `preparing` state — it's not accessible yet.

**Why it happens:** Zip deploys enter post-processing (minification, asset fingerprinting) before going live. Initial deploy response state is `uploading`, not `ready`.

**How to avoid:** Always poll `GET /api/v1/sites/{site_id}/deploys/{deploy_id}` until `state === 'ready'` before marking `build_status = 'deployed'`. Typical wait: 5–30 seconds for pure static HTML.

**Warning signs:** Customer sees netlify_url but site 404s or shows a Netlify error page.

### Pitfall 3: netlify_site_id Not Written Before Deploy Attempt

**What goes wrong:** `deploy-site` creates the Netlify site, then fails during the zip deploy step. On retry, it creates ANOTHER Netlify site (because `netlify_site_id` is still null in the DB), leaving orphan sites accumulating in the team account.

**Why it happens:** Transactional gap between site creation and DB write.

**How to avoid:** Write `netlify_site_id` to the DB immediately after the site creation API call succeeds — before the zip deploy POST. That way, retries find the existing `netlify_site_id` and re-deploy to the correct site.

### Pitfall 4: Supabase Storage `.list()` Returns Only Root-Level Items

**What goes wrong:** `persist-files` stores files at `{siteId}/index.html`, `{siteId}/style.css`, etc. If a file was stored at a nested path like `{siteId}/assets/logo.png`, calling `.list(siteId)` will return `assets/` as a folder object (with null `id`, `metadata`) not as a file. The download loop treats it as a file and fails silently.

**Why it happens:** Supabase Storage `.list()` is not recursive. It returns one level of the path.

**How to avoid:** For Phase 3 (v1), all persisted files from `persist-files` are flat (no subdirectories — confirmed by reading `persist-files/index.ts`). The file loop is safe for v1. Add a `metadata !== null` guard to skip folder entries if the structure ever changes:

```typescript
const files = fileList?.filter(item => item.metadata !== null) ?? []
```

### Pitfall 5: JSZip `generateAsync` in Deno — No `blob` Type Available

**What goes wrong:** JSZip's `generateAsync({type: 'blob'})` requires the Web `Blob` constructor. Deno supports `Blob` but some older Deno runtime versions or edge function environments may not have it fully. Using `uint8array` is the safe choice.

**Why it happens:** JSZip internally checks runtime capabilities.

**How to avoid:** Always use `generateAsync({ type: 'uint8array' })` in Deno Edge Functions. Pass the resulting `Uint8Array` directly as the `fetch` body — Deno's `fetch` accepts `Uint8Array`.

### Pitfall 6: Rate Limit Query Performance Under Load

**What goes wrong:** The `build_events` count query for rate limiting runs on every deploy attempt. At high volume, this adds latency to each deploy.

**Why it happens:** `COUNT(*)` queries without covering indexes are expensive.

**How to avoid:** Migration 005 should add an index on `build_events(event_type, created_at)` for the rate limit queries. The existing `idx_build_events_site_created` index covers `(site_id, created_at DESC)` — the rate limit query needs a different index:

```sql
CREATE INDEX IF NOT EXISTS idx_build_events_type_created
  ON public.build_events (event_type, created_at)
  WHERE event_type = 'deploy_done';
```

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

    // 1. Rate limit check
    // ... (see Pattern 6)

    // 2. Fetch site record
    const { data: site } = await supabase
      .from('client_sites').select('*').eq('id', siteId).single()
    if (!site) return jsonResponse({ error: 'site not found' }, 404)

    // 3. Update status → deploying
    await supabase.from('client_sites')
      .update({ build_status: 'deploying', last_attempted_at: new Date().toISOString() })
      .eq('id', siteId)

    // 4. Read files from Storage
    const { data: fileList } = await supabase.storage
      .from('client-sites').list(siteId, { limit: 100 })
    const files = []
    for (const item of (fileList ?? []).filter(f => f.metadata !== null)) {
      const { data: blob } = await supabase.storage
        .from('client-sites').download(`${siteId}/${item.name}`)
      if (blob) files.push({ path: item.name, content: await blob.text() })
    }
    if (files.length === 0) throw new Error('No files found in Storage')

    // 5. Create zip
    const zip = new JSZip()
    files.forEach(f => zip.file(f.path, f.content))
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' })

    // 6. Create Netlify site if needed (lazy)
    let netlifyySiteId = site.netlify_site_id
    let netlifyUrl = site.netlify_url
    if (!netlifyySiteId) {
      const createRes = await fetch(`${NETLIFY_API}/${teamSlug}/sites`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${pat}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `kh-${siteId.slice(0, 8)}` }),
      })
      if (!createRes.ok) throw new Error(`Site create failed: ${createRes.status}`)
      const created = await createRes.json()
      netlifyySiteId = created.id
      netlifyUrl = created.ssl_url || created.url
      // Write site_id immediately — before deploy attempt
      await supabase.from('client_sites')
        .update({ netlify_site_id: netlifyySiteId, netlify_url: netlifyUrl })
        .eq('id', siteId)
    }

    // 7. Deploy zip
    const deployRes = await fetch(`${NETLIFY_API}/sites/${netlifyySiteId}/deploys`, {
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

    // 8. Poll until ready
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const check = await fetch(
        `${NETLIFY_API}/sites/${netlifyySiteId}/deploys/${deploy.id}`,
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
    await supabase.from('build_events').insert({
      site_id: siteId, event_type: 'deploy_done', status: 'success',
      message: `Deployed to ${netlifyUrl}`,
    })

    return jsonResponse({ success: true, netlify_url: netlifyUrl })
  } catch (err) {
    const msg = (err as Error).message
    await supabase.from('client_sites')
      .update({ build_status: 'deploy_failed' })
      .eq('id', (await req.json().catch(() => ({}))).siteId ?? 'unknown')
    await supabase.from('build_events').insert({
      site_id: 'unknown', event_type: 'deploy_error', status: 'error', message: msg,
    }).catch(() => {})
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
    'pushing_github',  -- kept for backwards compat (old rows may have this)
    'deploying', 'deployed', 'deploy_failed',
    'suspending', 'suspended',
    'live'
  ));

-- Index for rate-limit counting query
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
// In src/types/database.ts — update build_status union type:
build_status:
  | 'pending' | 'generating' | 'generated' | 'retry' | 'failed'
  | 'pushing_github'   // legacy — kept for existing rows
  | 'deploying' | 'deployed' | 'deploy_failed'
  | 'suspending' | 'suspended' | 'live'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub repo → Netlify CI deploy | Direct zip-deploy API | Phase 3 (now) | Eliminates 30-120s CI queue wait; no GitHub PAT; no repo cleanup debt |
| No suspend mechanism | Deploy placeholder page | Phase 3 (now) | Preserves Netlify site ID + SSL for reactivation; branded UX during suspension |
| GitHub PAT required | Only NETLIFY_PAT + NETLIFY_TEAM_SLUG | Phase 3 (now) | Fewer secrets, simpler security surface |
| Netlify free plan unlimited deploys | Credit-based: 15 credits/deploy, 300/mo free | Sep 4, 2025 | Legacy accounts unaffected; new accounts get only ~20 free deploys/month |

**Deprecated/outdated:**
- `GITHUB_PAT`, `GITHUB_ORG` secrets: remove after Phase 3 (verify no other functions use them first)
- `deployToGitHub()` / `deployToNetlify()` functions in `build-site/index.ts`: delete (build-site is now a shim; these are dead code)

---

## Open Questions

1. **Netlify account creation date and pricing tier**
   - What we know: Accounts created before Sep 4, 2025 are on legacy pricing with unlimited deploys. New accounts get 300 credits/month (20 production deploys).
   - What's unclear: When was the project's Netlify account created? Is it legacy or credit-based?
   - Recommendation: Add as a human-verify checkpoint in Plan 1. User must confirm account type before deploying. If credit-based, upgrade to Pro ($19/mo) before launch.

2. **`NETLIFY_TEAM_SLUG` value**
   - What we know: Required for `POST /api/v1/{team_slug}/sites/` endpoint.
   - What's unclear: Has the user created a dedicated Netlify Team account? What is the slug?
   - Recommendation: Plan 1 Wave 0 must include a task: "Create dedicated Netlify Team → obtain NETLIFY_TEAM_SLUG → set as Supabase secret."

3. **DashboardPage.tsx `BUILD_STEPS` alignment**
   - What we know: Current steps include `pushing_github` and `deploying_netlify` which no longer match new status values `deploying` and `deployed`.
   - What's unclear: How much of the frontend needs updating for the renamed statuses.
   - Recommendation: Update `BUILD_STEPS` array and `statusConfig` in `DashboardPage.tsx` to map new `deploying` → "Deploying preview", `deployed` → "Preview ready!", `suspended` → warning state.

4. **GitHub PAT removal safety**
   - What we know: `GITHUB_PAT` and `GITHUB_ORG` appear in the codebase's existing edge function secrets.
   - What's unclear: Are they referenced anywhere other than `build-site/index.ts`?
   - Recommendation: Before removing, grep for `GITHUB_PAT` across all functions. Only remove if it's only in build-site.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured in `vite.config.ts`) |
| Config file | `vite.config.ts` (test block present, DO NOT reinstall) |
| Quick run command | `npm run test:ci -- --reporter=dot src/test/deploy01.test.ts` |
| Full suite command | `npm run test:ci` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `deploy-site` index.ts has no GitHub API calls; `persist-files` chains to deploy-site | unit (source scan) | `npm run test:ci -- src/test/deploy01.test.ts` | ❌ Wave 0 |
| DEPLOY-02 | Site name follows `kh-{8chars}` pattern; site creation uses team account slug endpoint | unit (source scan) | `npm run test:ci -- src/test/deploy02.test.ts` | ❌ Wave 0 |
| DEPLOY-03 | Rate limit function counts `deploy_done` events per minute and per day; blocks at 3/min and 100/day | unit (logic test) | `npm run test:ci -- src/test/deploy03.test.ts` | ❌ Wave 0 |
| DEPLOY-04 | `suspend-site` deploys a zip containing `index.html` to existing `netlify_site_id` | unit (source scan) | `npm run test:ci -- src/test/deploy04.test.ts` | ❌ Wave 0 |
| DEPLOY-05 | `reactivate-site` reads from Storage and deploys; does NOT call generate-site or Claude | unit (source scan) | `npm run test:ci -- src/test/deploy05.test.ts` | ❌ Wave 0 |
| DEPLOY-06 | `deploy-site` writes `netlify_site_id` BEFORE zip deploy; `build_status` set to `deploy_failed` on error; orchestrator retries `deploy_failed` rows | unit (source scan) | `npm run test:ci -- src/test/deploy06.test.ts` | ❌ Wave 0 |
| Full deploy | Netlify API response → `build_status = deployed` transition | manual-only | N/A — requires real NETLIFY_PAT + team account | - |
| Rate limit | 429 response from Netlify triggers `next_retry_at` | manual-only | N/A — requires real Netlify account at quota | - |

**Manual-only justification:** Live Netlify API tests require real credentials, a funded team account, and would consume deploy credits. Not suitable for automated test runs.

### Sampling Rate

- **Per task commit:** `npm run test:ci -- src/test/deploy0N.test.ts` (the relevant stub)
- **Per wave merge:** `npm run test:ci`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

All six DEPLOY test files must be created as `it.todo()` stubs before Wave 1 implementation:

- [ ] `src/test/deploy01.test.ts` — covers DEPLOY-01 (no GitHub calls, persist-files chains to deploy-site)
- [ ] `src/test/deploy02.test.ts` — covers DEPLOY-02 (site name pattern, team account endpoint)
- [ ] `src/test/deploy03.test.ts` — covers DEPLOY-03 (rate limit logic, 3/min + 100/day blocking)
- [ ] `src/test/deploy04.test.ts` — covers DEPLOY-04 (suspend-site deploys single-file zip)
- [ ] `src/test/deploy05.test.ts` — covers DEPLOY-05 (reactivate-site reads Storage, no Claude call)
- [ ] `src/test/deploy06.test.ts` — covers DEPLOY-06 (idempotency: netlify_site_id written before deploy, deploy_failed on error, orchestrator retries)

Follow the `it.todo()` stub pattern from Phase 2 (see `src/test/gen05.test.ts` as template) — do NOT import production modules in stubs to avoid import-resolution failures on not-yet-created functions.

---

## Sources

### Primary (HIGH confidence)
- [Netlify API: Get started](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/) — zip deploy workflow, team account site creation endpoint, polling requirement, rate limit headers
- [Netlify Open API spec](https://open-api.netlify.com/) — deploy state values (`uploading`, `prepared`, `ready`, `locked`), `POST /{account_slug}/sites` endpoint
- [JSZip documentation: examples](https://stuk.github.io/jszip/documentation/examples.html) — `generateAsync({type: 'uint8array'})` pattern
- [Supabase Storage: list files](https://supabase.com/docs/reference/javascript/storage-from-list) — `.list()` API including folder entry behavior
- [Supabase Edge Functions: Background Tasks](https://supabase.com/docs/guides/functions/background-tasks) — `EdgeRuntime.waitUntil()` pattern
- Codebase: `supabase/functions/persist-files/index.ts` — Storage write pattern, `client-sites` bucket path convention
- Codebase: `supabase/functions/build-orchestrator/index.ts` — fire-and-forget invoke pattern, retry column usage
- Codebase: `supabase/migrations/004_generation_queue.sql` — current `build_status` CHECK values
- Codebase: `src/types/database.ts` — TypeScript type definitions needing update

### Secondary (MEDIUM confidence)
- [Netlify: Deploy zip to production](https://developers.netlify.com/guides/deploy-zip-file-to-production-website/) — confirmed zip is the correct format; build endpoint vs deploy endpoint distinction
- [Netlify credit-based pricing plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/) — 300 free credits/month, 15 credits/production deploy = ~20 free deploys/month for new accounts
- WebSearch: 429 Netlify rate limit returns `Retry-After: 60` header — confirmed via community reports
- [Supabase storage read example](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/read-storage/index.ts) — `.download()` → `.text()` pattern

### Tertiary (LOW confidence)
- WebSearch: Netlify no native "unpublish" endpoint — corroborated by forum threads; placeholder deploy approach is the workaround recommended by community
- WebSearch: `npm:jszip` in Deno works with `npm:` specifier — no direct official Supabase example found, but Deno's npm compatibility is well-documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — JSZip and fetch are confirmed; Netlify endpoints verified via official docs
- Architecture: HIGH — fire-and-forget pattern already exists in codebase; patterns are direct extensions
- Pitfalls: HIGH for credit pricing (newly discovered, verified via official docs); HIGH for polling requirement; MEDIUM for storage list behavior
- Rate limits: HIGH for 3/min, 100/day API limits; MEDIUM for credit-per-deploy limits (may vary by plan)

**Research date:** 2026-04-09
**Valid until:** 2026-06-09 (Netlify API is stable; credit pricing is new but now documented)
