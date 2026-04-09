import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

// 02-CONTEXT.md decision: concurrency cap of 2 for launch volume
const CONCURRENCY_CAP = 2

async function logEvent(supabase: any, siteId: string, eventType: string, status: string, message: string) {
  await supabase.from('build_events').insert({ site_id: siteId, event_type: eventType, status, message })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()
  const supabase = getSupabaseAdmin()

  try {
    // Pick at most CONCURRENCY_CAP rows ready to (re)generate
    // Reads client_sites where build_status IN ('pending','retry') AND next_retry_at <= now()
    const { data: candidates, error } = await supabase
      .from('client_sites')
      .select('id, build_status, retry_count, next_retry_at, created_at')
      .in('build_status', ['pending', 'retry'])
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(CONCURRENCY_CAP)

    if (error) {
      console.error('orchestrator query error:', error.message)
      return jsonResponse({ error: error.message }, 500)
    }

    if (!candidates || candidates.length === 0) {
      return jsonResponse({ picked: 0, message: 'no candidates' })
    }

    const results: Array<{ siteId: string; invoked: boolean; error?: string }> = []

    for (const row of candidates) {
      try {
        // Claim the row — bump retry_count and last_attempted_at BEFORE invoking
        await supabase.from('client_sites').update({
          retry_count: (row.retry_count ?? 0) + 1,
          last_attempted_at: new Date().toISOString(),
          build_status: 'generating',
        }).eq('id', row.id)

        await logEvent(supabase, row.id, 'orchestrator_pick', 'info',
          `Orchestrator claimed site (attempt ${(row.retry_count ?? 0) + 1})`)

        // Fire-and-forget invoke of generate-site
        supabase.functions.invoke('generate-site', { body: { siteId: row.id } })
          .catch(async (err: Error) => {
            await logEvent(supabase, row.id, 'orchestrator_invoke_error', 'error', err.message)
          })

        results.push({ siteId: row.id, invoked: true })
      } catch (rowErr) {
        results.push({ siteId: row.id, invoked: false, error: (rowErr as Error).message })
      }
    }

    return jsonResponse({ picked: results.length, results })
  } catch (err) {
    console.error('orchestrator error:', (err as Error).message)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
