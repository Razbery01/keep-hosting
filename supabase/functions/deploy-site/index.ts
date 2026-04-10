import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import JSZip from 'npm:jszip'

const NETLIFY_API = 'https://api.netlify.com/api/v1'
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 12

async function logEvent(supabase: any, siteId: string, eventType: string, status: string, message: string) {
  await supabase.from('build_events').insert({ site_id: siteId, event_type: eventType, status, message })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()
  const supabase = getSupabaseAdmin()

  // Parse body once so we can reference siteId in the catch block
  let siteId = ''
  try {
    const body = await req.json()
    siteId = body?.siteId ?? ''
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!siteId) {
    return jsonResponse({ error: 'siteId is required' }, 400)
  }

  try {
    // Step 2: Log deploy_start
    await logEvent(supabase, siteId, 'deploy_start', 'info', 'Starting deploy to Netlify')

    // Step 3: Update build_status to 'deploying'
    await supabase.from('client_sites')
      .update({ build_status: 'deploying', last_attempted_at: new Date().toISOString() })
      .eq('id', siteId)

    // Step 4: Rate limit check via build_events
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
      await logEvent(supabase, siteId, 'deploy_rate_limited', 'warning', 'Rate limit: >= 3 deploys/min — queued for retry')
      return jsonResponse({ queued: true, reason: 'rate_limit_per_min' })
    }

    if ((perDay ?? 0) >= 100) {
      const tomorrow = new Date()
      tomorrow.setUTCHours(24, 0, 0, 0)
      await supabase.from('client_sites')
        .update({ next_retry_at: tomorrow.toISOString(), build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'deploy_rate_limited', 'warning', 'Rate limit: >= 100 deploys/day — queued until tomorrow')
      return jsonResponse({ queued: true, reason: 'rate_limit_per_day' })
    }

    if ((perDay ?? 0) >= 80) {
      await logEvent(supabase, siteId, 'deploy_quota_warning', 'warning',
        `Daily deploy count at ${perDay}/100 — approaching quota`)
    }

    // Step 5: Read files from Supabase Storage (Pattern 2)
    const { data: fileList, error: listErr } = await supabase.storage
      .from('client-sites')
      .list(siteId, { limit: 100 })

    if (listErr) throw listErr

    const fileItems = (fileList ?? []).filter((item: any) => item.metadata !== null)

    if (fileItems.length === 0) {
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'deploy_no_files', 'error', 'No files found in Storage for this site')
      return jsonResponse({ error: 'No files found in Storage' }, 400)
    }

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

    // Step 6: Create zip with JSZip (Pattern 3)
    const zip = new JSZip()
    for (const f of files) {
      zip.file(f.path, f.content)
    }
    const zipBuffer: Uint8Array = await zip.generateAsync({ type: 'uint8array' })

    // Step 7: Create Netlify site if needed (Pattern 1)
    const { data: siteRow } = await supabase
      .from('client_sites')
      .select('netlify_site_id, netlify_url')
      .eq('id', siteId)
      .single()

    let netlifySiteId: string = siteRow?.netlify_site_id
    let netlifyUrl: string = siteRow?.netlify_url

    const pat = Deno.env.get('NETLIFY_PAT')!
    const teamSlug = Deno.env.get('NETLIFY_TEAM_SLUG')!

    if (!netlifySiteId) {
      // Create site under team account using kh-{uuid8} name
      let siteName = `kh-${siteId.slice(0, 8)}`
      let createRes = await fetch(`${NETLIFY_API}/${teamSlug}/sites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: siteName }),
      })

      // Handle 422 name conflict — append 4 more chars
      if (createRes.status === 422) {
        siteName = `kh-${siteId.slice(0, 8)}${siteId.slice(8, 12)}`
        createRes = await fetch(`${NETLIFY_API}/${teamSlug}/sites`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${pat}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: siteName }),
        })
      }

      if (!createRes.ok) {
        throw new Error(`Netlify site create failed: ${createRes.status}`)
      }

      const site = await createRes.json()
      netlifySiteId = site.id
      netlifyUrl = site.ssl_url || site.url

      // CRITICAL: Write netlify_site_id to DB IMMEDIATELY — before zip deploy
      // This prevents orphan Netlify sites when retrying after zip deploy failure
      await supabase.from('client_sites')
        .update({ netlify_site_id: netlifySiteId, netlify_url: netlifyUrl })
        .eq('id', siteId)

      await logEvent(supabase, siteId, 'netlify_site_created', 'info',
        `Created Netlify site: ${siteName} (${netlifySiteId})`)
    }

    // Step 8: Zip deploy to Netlify (Pattern 4)
    const deployRes = await fetch(
      `${NETLIFY_API}/sites/${netlifySiteId}/deploys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/zip',
        },
        body: zipBuffer,
      }
    )

    if (deployRes.status === 429) {
      const retryAfter = parseInt(deployRes.headers.get('Retry-After') ?? '60', 10)
      const nextRetry = new Date(Date.now() + retryAfter * 1000).toISOString()
      await supabase.from('client_sites')
        .update({ next_retry_at: nextRetry, build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'deploy_rate_limited', 'warning',
        `Netlify 429 — retry in ${retryAfter}s`)
      return jsonResponse({ queued: true, reason: 'netlify_429' })
    }

    if (!deployRes.ok) {
      throw new Error(`Netlify deploy failed: ${deployRes.status}`)
    }

    const deploy = await deployRes.json()
    const deployId: string = deploy.id

    // Step 9: Poll until ready (Pattern 4)
    let deployReady = false
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      const check = await fetch(
        `${NETLIFY_API}/deploys/${deployId}`,
        { headers: { 'Authorization': `Bearer ${pat}` } }
      )
      const pollStatus = await check.json()
      if (pollStatus.state === 'ready' || pollStatus.state === 'current') {
        deployReady = true
        break
      }
    }

    if (!deployReady) {
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'deploy_timeout', 'error',
        `Deploy ${deployId} did not reach ready state in ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`)
      return jsonResponse({ error: 'Deploy timed out waiting for ready state' }, 500)
    }

    // Step 10: Mark deployed
    await supabase.from('client_sites')
      .update({
        build_status: 'deployed',
        retry_count: 0,
        next_retry_at: null,
      })
      .eq('id', siteId)

    // Log deploy_done — this event is counted by the rate limiter
    await logEvent(supabase, siteId, 'deploy_done', 'success',
      `Site deployed to Netlify: ${netlifyUrl}`)

    return jsonResponse({ success: true, netlifyUrl, deployId })

  } catch (err) {
    const msg = (err as Error).message
    console.error('deploy-site error:', msg)
    // Best-effort: mark as deploy_failed and log error
    try {
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'deploy_error', 'error', msg)
    } catch { /* ignore cleanup errors */ }
    return jsonResponse({ error: 'Deploy failed' }, 500)
  }
})
