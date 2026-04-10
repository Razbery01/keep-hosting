import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import JSZip from 'npm:jszip'
import { SUSPENDED_PAGE_HTML } from '../_shared/suspended-page.ts'

const NETLIFY_API = 'https://api.netlify.com/api/v1'
const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 6

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
    // Step 2: Fetch netlify_site_id — must exist to suspend
    const { data: siteRow, error: fetchErr } = await supabase
      .from('client_sites')
      .select('netlify_site_id, order_id')
      .eq('id', siteId)
      .single()

    if (fetchErr) throw fetchErr

    const netlifySiteId: string | null = siteRow?.netlify_site_id
    if (!netlifySiteId) {
      return jsonResponse({ error: 'No Netlify site found for this siteId — cannot suspend' }, 400)
    }

    // Step 3: Log suspend_start
    await logEvent(supabase, siteId, 'suspend_start', 'info', `Suspending Netlify site ${netlifySiteId}`)

    // Step 4: Create single-file zip with placeholder HTML
    const zip = new JSZip()
    zip.file('index.html', SUSPENDED_PAGE_HTML)
    const zipBuffer: Uint8Array = await zip.generateAsync({ type: 'uint8array' })

    const pat = Deno.env.get('NETLIFY_PAT')!

    // Step 5: Deploy placeholder zip to existing site
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

    // Step 6: On 429 or non-2xx: log and return without changing build_status — caller should retry
    if (deployRes.status === 429) {
      await logEvent(supabase, siteId, 'suspend_rate_limited', 'warning', 'Netlify 429 during suspend — caller should retry')
      return jsonResponse({ error: 'Rate limited by Netlify', retryable: true }, 429)
    }

    if (!deployRes.ok) {
      const errText = await deployRes.text()
      await logEvent(supabase, siteId, 'suspend_deploy_error', 'error',
        `Netlify deploy failed (${deployRes.status}): ${errText}`)
      return jsonResponse({ error: `Netlify deploy failed: ${deployRes.status}` }, 500)
    }

    const deploy = await deployRes.json()
    const deployId: string = deploy.id

    // Step 7: Poll until ready (shorter timeout — 6 iterations)
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
      await logEvent(supabase, siteId, 'suspend_timeout', 'warning',
        `Suspend deploy ${deployId} did not reach ready state in ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`)
      // Don't fail hard — placeholder may still be live even if poll timed out
    }

    // Step 8: Update build_status to 'suspended'
    await supabase.from('client_sites')
      .update({ build_status: 'suspended' })
      .eq('id', siteId)

    // Step 9: Update associated order status to 'suspended'
    const orderId = siteRow?.order_id
    if (orderId) {
      await supabase.from('orders')
        .update({ status: 'suspended' })
        .eq('id', orderId)
    }

    // Step 10: Log success
    await logEvent(supabase, siteId, 'site_suspended', 'success',
      `Site suspended — placeholder page deployed to ${netlifySiteId}`)

    return jsonResponse({ success: true, deployId })

  } catch (err) {
    const msg = (err as Error).message
    console.error('suspend-site error:', msg)
    try {
      await logEvent(supabase, siteId, 'suspend_error', 'error', msg)
    } catch { /* ignore */ }
    return jsonResponse({ error: 'Suspension failed' }, 500)
  }
})
