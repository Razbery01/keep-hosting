import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

/**
 * LEGACY SHIM — Phase 2 refactor (02-04-PLAN.md).
 *
 * The original 581-line build-site function was split into:
 *   - supabase/functions/generate-site   (Image Agent + Code Agent + HTML scan + cost tracking)
 *   - supabase/functions/persist-files   (Supabase Storage writes)
 *   - supabase/functions/build-orchestrator (queue poller)
 *
 * GitHub + Netlify deploy code was REMOVED — Phase 3 will add a `deploy-site`
 * function using the Netlify zip-deploy API directly (no GitHub intermediary).
 *
 * This shim exists only so existing client calls to `build-site` continue to work
 * until Phase 4, when the Yoco webhook becomes the direct trigger for generate-site.
 * The shim is slated for deletion in Phase 4 (02-CONTEXT.md / 02-04-PLAN.md output spec).
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()
  try {
    const { siteId } = await req.json()
    if (!siteId) return jsonResponse({ error: 'siteId is required' }, 400)

    const supabase = getSupabaseAdmin()
    // Delegate to the new generate-site function
    const { data, error } = await supabase.functions.invoke('generate-site', { body: { siteId } })
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ shim: true, ...(data ?? {}) })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
