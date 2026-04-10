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
    // Step 2: Fetch netlify_site_id — must exist to reactivate
    const { data: siteRow, error: fetchErr } = await supabase
      .from('client_sites')
      .select('netlify_site_id, netlify_url, order_id')
      .eq('id', siteId)
      .single()

    if (fetchErr) throw fetchErr

    const netlifySiteId: string | null = siteRow?.netlify_site_id
    if (!netlifySiteId) {
      return jsonResponse({ error: 'No Netlify site found for this siteId — cannot reactivate' }, 400)
    }

    // Step 3: Log reactivate_start
    await logEvent(supabase, siteId, 'reactivate_start', 'info', `Reactivating site ${siteId} from Storage`)

    // Step 4: Update build_status to 'deploying'
    await supabase.from('client_sites')
      .update({ build_status: 'deploying', last_attempted_at: new Date().toISOString() })
      .eq('id', siteId)

    // Step 5: Read files from Supabase Storage (Pattern 2 — same as deploy-site)
    const { data: fileList, error: listErr } = await supabase.storage
      .from('client-sites')
      .list(siteId, { limit: 100 })

    if (listErr) throw listErr

    const fileItems = (fileList ?? []).filter((item: any) => item.metadata !== null)

    if (fileItems.length === 0) {
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'reactivate_no_files', 'error', 'No files found in Storage for this site')
      return jsonResponse({ error: 'No files found in Storage — cannot reactivate without stored files' }, 400)
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

    // Step 6: Create zip (Pattern 3 — same as deploy-site)
    const zip = new JSZip()
    for (const f of files) {
      zip.file(f.path, f.content)
    }
    const zipBuffer: Uint8Array = await zip.generateAsync({ type: 'uint8array' })

    const pat = Deno.env.get('NETLIFY_PAT')!

    // Step 7: Deploy to existing Netlify site — no site creation step needed
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

    // Step 8: Handle 429 — set deploy_failed + next_retry_at
    if (deployRes.status === 429) {
      const retryAfter = parseInt(deployRes.headers.get('Retry-After') ?? '60', 10)
      const nextRetry = new Date(Date.now() + retryAfter * 1000).toISOString()
      await supabase.from('client_sites')
        .update({ next_retry_at: nextRetry, build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'reactivate_rate_limited', 'warning',
        `Netlify 429 during reactivation — retry in ${retryAfter}s`)
      return jsonResponse({ queued: true, reason: 'netlify_429' })
    }

    if (!deployRes.ok) {
      throw new Error(`Netlify deploy failed during reactivation: ${deployRes.status}`)
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
      await logEvent(supabase, siteId, 'reactivate_timeout', 'error',
        `Reactivation deploy ${deployId} did not reach ready state in ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`)
      return jsonResponse({ error: 'Reactivation timed out' }, 500)
    }

    // Step 10: Mark deployed — reset retry columns
    await supabase.from('client_sites')
      .update({
        build_status: 'deployed',
        retry_count: 0,
        next_retry_at: null,
      })
      .eq('id', siteId)

    // Step 11: Log site_reactivated
    const netlifyUrl = siteRow?.netlify_url
    await logEvent(supabase, siteId, 'site_reactivated', 'success',
      `Site reactivated from Storage — deployed to ${netlifyUrl ?? netlifySiteId}`)

    return jsonResponse({ success: true, netlifyUrl, deployId })

  } catch (err) {
    const msg = (err as Error).message
    console.error('reactivate-site error:', msg)
    try {
      await supabase.from('client_sites')
        .update({ build_status: 'deploy_failed' })
        .eq('id', siteId)
      await logEvent(supabase, siteId, 'reactivate_error', 'error', msg)
    } catch { /* ignore cleanup errors */ }
    return jsonResponse({ error: 'Reactivation failed' }, 500)
  }
})
