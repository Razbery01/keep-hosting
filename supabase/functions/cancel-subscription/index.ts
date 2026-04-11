// cancel-subscription — Phase 4 PAY-08
// Customer-initiated subscription cancellation.
// Calls PayFast cancel API with signed headers, then updates local subscription status.
// @ts-ignore: Deno types resolved at runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { generateApiSignature } from '../_shared/payfast.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    // Parse request body
    const body = await req.json()
    const { subscriptionId } = body

    if (!subscriptionId) {
      return jsonResponse({ error: 'Missing required field: subscriptionId' }, 400)
    }

    // Auth: verify user JWT and ownership
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return jsonResponse({ error: 'Unauthorized: missing JWT' }, 401)
    }

    const supabase = getSupabaseAdmin()

    // Verify JWT and get user
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) {
      return jsonResponse({ error: 'Unauthorized: invalid JWT' }, 401)
    }

    // Fetch subscription and verify ownership
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('id, user_id, payfast_token, status, order_id')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (subErr || !subscription) {
      return jsonResponse({ error: 'Subscription not found' }, 404)
    }

    if (subscription.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden: subscription does not belong to this user' }, 403)
    }

    if (!subscription.payfast_token) {
      return jsonResponse({ error: 'Cannot cancel: no PayFast subscription token on record' }, 400)
    }

    // ── Call PayFast cancel API ────────────────────────────────────────────────
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')!
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? ''
    const sandbox = Deno.env.get('PAYFAST_SANDBOX') === 'true'

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00')
    const pfToken = subscription.payfast_token

    const url = `https://api.payfast.co.za/subscriptions/${pfToken}/cancel${sandbox ? '?testing=true' : ''}`

    // API signature per Pattern 5: merchant-id, passphrase, timestamp, version
    const headerData: Record<string, string> = {
      'merchant-id': merchantId,
      'passphrase': passphrase,
      'timestamp': timestamp,
      'version': 'v1',
    }
    const signature = generateApiSignature(headerData, passphrase)

    const pfResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'merchant-id': merchantId,
        'version': 'v1',
        'timestamp': timestamp,
        'signature': signature,
      },
    })

    if (!pfResponse.ok) {
      const errorText = await pfResponse.text().catch(() => 'unknown')
      console.error('[cancel-subscription] PayFast API error:', pfResponse.status, errorText)
      return jsonResponse({ error: 'PayFast cancellation request failed', details: errorText }, 502)
    }

    // Update local subscription status to 'cancelling'
    // Site remains live until PayFast sends CANCELLED ITN at end of billing period
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelling' })
      .eq('id', subscriptionId)

    await supabase.from('build_events').insert({
      site_id: null,
      event_type: 'subscription_cancel_requested',
      status: 'info',
      message: JSON.stringify({ subscription_id: subscriptionId, user_id: user.id }),
    }).catch(() => {})

    return jsonResponse({ ok: true, message: 'Cancellation requested. Your site will remain live until the end of your billing period.' })
  } catch (err) {
    console.error('[cancel-subscription] error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
