import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

interface PersistRequest {
  siteId: string
  files: Array<{ path: string; content: string }>
}

async function logEvent(supabase: any, siteId: string, eventType: string, status: string, message: string) {
  await supabase.from('build_events').insert({ site_id: siteId, event_type: eventType, status, message })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()
  const supabase = getSupabaseAdmin()

  try {
    const { siteId, files } = await req.json() as PersistRequest
    if (!siteId || !Array.isArray(files) || files.length === 0) {
      return jsonResponse({ error: 'siteId and files[] are required' }, 400)
    }

    await logEvent(supabase, siteId, 'persist_start', 'info', `Persisting ${files.length} file(s) to Storage...`)

    const persisted: Array<{ path: string; bytes: number }> = []

    for (const file of files) {
      // Path safety: reject traversal and absolute paths
      if (file.path.includes('..') || file.path.startsWith('/')) {
        await logEvent(supabase, siteId, 'persist_skip', 'warning', `Skipped unsafe path: ${file.path}`)
        continue
      }

      const storagePath = `${siteId}/${file.path}`
      const body = new TextEncoder().encode(file.content)
      const contentType = file.path.endsWith('.html')
        ? 'text/html'
        : file.path.endsWith('.css') ? 'text/css'
        : file.path.endsWith('.js')  ? 'application/javascript'
        : 'application/octet-stream'

      const { error: upErr } = await supabase.storage
        .from('client-sites')
        .upload(storagePath, body, { contentType, upsert: true })

      if (upErr) {
        await logEvent(supabase, siteId, 'persist_upload_error', 'error',
          `${file.path}: ${upErr.message}`)
        continue
      }
      persisted.push({ path: file.path, bytes: body.byteLength })
    }

    // Update generated_files metadata + confirm generated status
    await supabase.from('client_sites').update({
      generated_files: { files: persisted, persisted_at: new Date().toISOString() },
      build_status: 'generated',
    }).eq('id', siteId)

    await logEvent(supabase, siteId, 'persist_done', 'success',
      `Persisted ${persisted.length}/${files.length} file(s) to Storage`)

    // Chain to deploy-site — fire-and-forget via EdgeRuntime.waitUntil
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('deploy-site', { body: { siteId } })
        .catch(async (err: Error) => {
          await logEvent(supabase, siteId, 'deploy_invoke_error', 'error', err.message)
        })
    )

    return jsonResponse({ success: true, persisted_count: persisted.length })
  } catch (err) {
    const msg = (err as Error).message
    console.error('persist-files error:', msg)
    return jsonResponse({ error: msg }, 500)
  }
})
