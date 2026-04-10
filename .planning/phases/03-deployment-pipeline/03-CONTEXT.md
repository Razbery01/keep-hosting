# Phase 3: Deployment Pipeline - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning
**Gathering mode:** Claude's judgment (user delegated all decisions)

<domain>
## Phase Boundary

Deploy generated sites from Supabase Storage to Netlify via the zip-deploy API (no GitHub intermediary). Enforce rate limits (3/min, 100/day), track deploy counts, and support programmatic suspend/reactivate for the subscription lifecycle (Phase 4 wires payment triggers; Phase 3 builds the mechanism).

**Entry point:** `client_sites.build_status = 'generated'` (set by Phase 2 persist-files function after HTML is written to Storage).

**Exit point:** `client_sites.build_status = 'deployed'` with `netlify_url` populated and site accessible.

**Explicitly in scope:**
- New `deploy-site` Edge Function (zip-deploy to Netlify)
- New `suspend-site` Edge Function (deploy placeholder page)
- New `reactivate-site` Edge Function (re-deploy from Storage)
- Rate-limit queue for Netlify deploys
- Remove all GitHub-related code and secrets
- Migration to extend `build_status` CHECK + deploy tracking

**Explicitly out of scope (other phases):**
- Custom domain registration — Phase 5 (ZADOMAINS)
- Custom domain attachment to Netlify — Phase 5 (depends on domain being registered)
- Payment-triggered deployment — Phase 4 (Yoco webhook calls deploy-site)
- Admin manual deploy UI — Phase 6

</domain>

<decisions>
## Implementation Decisions

### Netlify Account Setup

- **Dedicated Netlify Team account** required. User must create one before deployment works (checkpoint task in plan).
- Store `NETLIFY_PAT` (Personal Access Token with deploy scope) and `NETLIFY_TEAM_SLUG` as Supabase Edge Function secrets.
- Each customer site gets a UUID-based name: `kh-{first8chars}` (e.g., `kh-4a73eb66`) to stay within Netlify's site name character limits while remaining collision-free.
- All sites live under the same team account — no per-customer Netlify accounts.

### Deploy Trigger

- **Auto-deploy immediately after `generated` status** — no admin review gate for v1.
- `persist-files` function, after successfully writing files to Storage, invokes `deploy-site` (fire-and-forget, same pattern as Phase 2's generate-site → persist-files chain).
- If `deploy-site` fails, it updates `build_status = 'deploy_failed'`. The build-orchestrator's cron poll can retry deploy-failed rows (same retry ladder pattern as generation queue).
- Add `deploy_status` tracking columns to `client_sites` for retry state (reuse the existing `retry_count`/`last_attempted_at`/`next_retry_at` from migration 004, since a site won't be generating AND deploying simultaneously).

### deploy-site Edge Function

The core new function. Flow:
1. Read generated files from Supabase Storage (`client-sites/{siteId}/`)
2. Create an in-memory zip using `JSZip` (npm: package) or raw Deno zip module
3. Check rate limit before deploying (query `build_events` for recent `deploy_done` events)
4. If over rate limit, set `next_retry_at` and return early
5. Create Netlify site if `netlify_site_id` is null: `POST /api/v1/{team_slug}/sites` with `{ name: 'kh-{uuid8}' }`
6. Deploy via zip: `POST /api/v1/sites/{site_id}/deploys` with `Content-Type: application/zip` body
7. Update `client_sites` with `netlify_site_id`, `netlify_url` (from API response), `build_status = 'deployed'`
8. Log all transitions to `build_events`

### Rate Limiting (DEPLOY-03)

- **Token bucket via build_events queries** — no new table needed.
- Before each deploy, count recent `deploy_done` events:
  - Last 60 seconds: if >= 3, delay (set `next_retry_at` to 60s from oldest in window)
  - Last 24 hours: if >= 80, log a `deploy_quota_warning` event. If >= 100, block until next day.
- This is simple, queryable, and uses infrastructure that already exists.

### Suspend Mechanism (DEPLOY-04)

- **Deploy a "suspended" placeholder page** to the Netlify site — NOT delete the site entirely.
- This preserves: Netlify site ID, any attached custom domain (Phase 5), SSL certificate.
- Placeholder HTML: a simple branded page saying "This website is temporarily unavailable. If you are the site owner, please update your payment details at keep-hosting.co.za" with a link to the keep-hosting dashboard.
- Store placeholder HTML as a static template in `supabase/functions/_shared/suspended-page.ts` (pure TS string export).
- `suspend-site` function: reads the placeholder template, zip-deploys it to the existing Netlify site. Updates `build_status = 'suspended'`, `orders.status = 'suspended'`.

### Reactivate Mechanism (DEPLOY-05)

- **Re-deploy from Supabase Storage** — NOT re-generate via Claude. Files are already persisted from Phase 2.
- `reactivate-site` function: same flow as `deploy-site` (reads from Storage, zip-deploys) but skips site creation (site already exists with `netlify_site_id`).
- Updates `build_status = 'deployed'` (or `'live'` if custom domain is attached — Phase 5 concern).
- Log `site_reactivated` to `build_events`.

### GitHub Code Removal (DEPLOY-01)

- Delete `deployToGitHub()` and `deployToNetlify()` functions from the old build-site code (the shim doesn't use them; they were in the original 581-line version).
- Remove `GITHUB_PAT` from Edge Function secrets (verify it's not used elsewhere first).
- `client_sites.github_repo` and `client_sites.github_url` columns can remain (don't drop columns in a running DB — just stop writing to them).

### Migration

- Extend `client_sites.build_status` CHECK to include `deploying`, `deployed`, `deploy_failed`, `suspending` (if needed).
- The existing `suspended` value is already in the CHECK from migration 003.
- `client_sites` already has `netlify_site_id`, `netlify_url`, `live_url` from migration 001.
- May need `deploy_count_today` or similar — but actually, querying `build_events` is sufficient.

### Zip Creation in Deno

- Use `npm:jszip` in the Edge Function (small library, well-established).
- Alternative: raw `CompressionStream` API — Deno supports it natively but zip format requires a library wrapper.
- JSZip is the pragmatic choice — small, battle-tested, `npm:jszip` works in Deno.

### Dashboard Integration

- `DashboardPage.tsx` already renders `deploying_netlify` status and `netlify_url` link.
- The new `deploy-site` function writes `netlify_url` to `client_sites`, which Realtime pushes to the dashboard.
- Minimal frontend changes needed — mostly status string mapping if names changed.

### Claude's Discretion

- Exact Netlify API error handling / retry codes
- Whether to use a single `manage-site` function vs separate `suspend-site` / `reactivate-site`
- Zip creation approach (JSZip vs native Deno compression)
- Whether deploy-site creates the Netlify site eagerly or lazily
- Exact placeholder page HTML styling
- Whether to chain deploy from persist-files or from the orchestrator

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- `supabase/functions/persist-files/index.ts` — writes files to Storage; currently sets `build_status = 'generated'`. This is the natural trigger point for deploy-site.
- `supabase/functions/build-orchestrator/index.ts` — polls for pending/retry rows. Can be extended to also poll for `deploy_failed` rows.
- `supabase/functions/_shared/supabase-admin.ts` — service role client for DB + Storage access.
- `supabase/functions/_shared/cors.ts` — standard CORS + JSON response helpers.
- `build_events` table — log all deploy transitions here (same pattern as generation).
- `client_sites` table — already has `netlify_site_id`, `netlify_url`, `live_url`, `build_status`, `retry_count`, `last_attempted_at`, `next_retry_at`.
- `DashboardPage.tsx` — already renders `deploying_netlify` status and netlify preview link.

### Established Patterns

- Fire-and-forget function chaining: `generate-site → persist-files` via `supabase.functions.invoke()`. Extend to `persist-files → deploy-site`.
- `build_events` for pipeline observability.
- `build_status` state machine on `client_sites` for queue coordination.
- `callClaudeWithRetry` retry ladder pattern — adapt for Netlify API retries.

### Integration Points

- **Entry:** `persist-files` (after writing to Storage, invokes deploy-site)
- **Deploy API:** `POST /api/v1/sites/{site_id}/deploys` with zip body, Bearer token
- **Site creation:** `POST /api/v1/{team_slug}/sites` with `{ name }` body
- **Suspend:** Same deploy API but with placeholder zip
- **Reactivate:** Same deploy API but re-read from Storage
- **Dashboard consumer:** Realtime on `client_sites` + `build_events` (already wired in Phase 2)
- **Phase 4 consumer:** Yoco webhook will call `deploy-site` after payment success (not built here)
- **Phase 5 consumer:** `netlify-domain` function will attach custom domain to the `netlify_site_id` (not built here)

</code_context>

<specifics>
## Specific Ideas

- The Netlify zip-deploy API is well-documented and returns the deploy URL immediately in the response. No polling needed for deploy status — it's synchronous for static sites.
- Keep the suspended placeholder branded: keep-hosting logo, professional design, clear payment-update CTA. This IS the face of keep-hosting when things go wrong — make it look intentional, not broken.
- Netlify Free tier allows unlimited sites per team. Pro tier ($19/mo) gets more bandwidth and build minutes (but we only use the deploy API, not Netlify builds). Free tier should work for launch.

</specifics>

<deferred>
## Deferred Ideas

- **Custom domain attachment via Netlify API** — Phase 5 (requires ZADOMAINS registration first)
- **Admin manual deploy/re-deploy UI** — Phase 6 (admin dashboard)
- **Netlify Pro upgrade for higher bandwidth** — post-launch when traffic warrants it
- **CDN purge on re-deploy** — Netlify handles this automatically, but worth monitoring if caching issues arise
- **Multi-region deployment** — Netlify CDN handles this natively, no configuration needed
- **Deploy preview before going live** — would require a separate "preview" site per customer. Defer to v2+.
- **Build-time analytics (Lighthouse score, page weight)** — Phase 6 admin features
- **A/B deploy** — not relevant for R49/mo SMME sites

</deferred>

---

*Phase: 03-deployment-pipeline*
*Context gathered: 2026-04-10*
