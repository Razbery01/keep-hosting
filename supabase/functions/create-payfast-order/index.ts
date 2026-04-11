// create-payfast-order — Phase 4 PAY-02
// Receives order details from OnboardingPage, generates signed PayFast checkout params,
// returns them to the client which auto-submits a hidden form to redirect to PayFast.
// @ts-ignore: Deno types resolved at runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { generatePayFastSignature, getPayFastUrl } from '../_shared/payfast.ts'

const PACKAGE_PRICES: Record<string, number> = {
  starter: 999,
  professional: 2499,
  enterprise: 4999,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    // Parse request body
    const body = await req.json()
    const { orderId, siteId, packageId, userEmail, userFirstName, userLastName } = body

    // Validate required fields
    if (!orderId || !siteId || !packageId || !userEmail || !userFirstName) {
      return jsonResponse({ error: 'Missing required fields: orderId, siteId, packageId, userEmail, userFirstName' }, 400)
    }

    // Get package amount
    const amountCents = (PACKAGE_PRICES[packageId] ?? 999) * 100
    const amount = (amountCents / 100).toFixed(2) // e.g. "999.00"

    // Read secrets
    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID')!
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY')!
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? ''
    const sandbox = Deno.env.get('PAYFAST_SANDBOX') === 'true'

    const siteUrl = Deno.env.get('SITE_URL') || 'https://keep-hosting.co.za'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    // Build checkout params per PayFast spec
    const params: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${siteUrl}/dashboard`,
      cancel_url: `${siteUrl}/dashboard?payment=cancelled`,
      notify_url: `${supabaseUrl}/functions/v1/payfast-itn`,
      name_first: userFirstName,
      name_last: userLastName || 'Customer',
      email_address: userEmail,
      m_payment_id: orderId,
      amount,
      item_name: `keep-hosting ${packageId} subscription`,
      // Subscription params
      subscription_type: '1',
      billing_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      recurring_amount: '49.00', // R49/mo
      frequency: '3', // monthly
      cycles: '0', // indefinite
      // Custom fields — siteId carried through every ITN
      custom_str1: siteId,
    }

    // Generate signature server-side (passphrase must never be client-side)
    const signature = generatePayFastSignature(params, passphrase)
    params.signature = signature

    // Determine PayFast checkout URL
    const payfast_url = getPayFastUrl(sandbox)

    // Update order status to payment_pending
    const supabase = getSupabaseAdmin()
    await supabase
      .from('orders')
      .update({ status: 'payment_pending' })
      .eq('id', orderId)

    // Return params + URL — client builds hidden form and submits
    return jsonResponse({ params, payfast_url })
  } catch (err) {
    console.error('[create-payfast-order] error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
