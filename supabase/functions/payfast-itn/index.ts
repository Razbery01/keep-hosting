// payfast-itn — Phase 4 PAY-03 to PAY-07
// ITN (Instant Transaction Notification) webhook handler.
// PayFast POSTs form-urlencoded data — NOT JSON.
// JWT verification is bypassed (verify_jwt = false in config.toml) so PayFast can reach us.
// @ts-ignore: Deno types resolved at runtime
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { verifyPayFastSignature } from '../_shared/payfast.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse()

  // PayFast ITN only arrives via POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = getSupabaseAdmin()
  const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? ''

  try {
    // Parse form-urlencoded body (PayFast sends application/x-www-form-urlencoded)
    const rawBody = await req.text()
    const params: Record<string, string> = {}
    new URLSearchParams(rawBody).forEach((value, key) => {
      params[key] = value
    })

    // Extract key ITN fields
    const paymentStatus = params['payment_status'] // 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'PENDING'
    const mPaymentId = params['m_payment_id']      // Our order UUID (idempotency key)
    const pfPaymentId = params['pf_payment_id']    // PayFast's own transaction ID
    const siteId = params['custom_str1']           // Our siteId (passed through from checkout)
    const token = params['token']                  // PayFast subscription token (recurring payments)
    const amountGross = params['amount_gross']     // e.g. "999.00"

    // Verify ITN signature — invalid signature = log and return 200 (prevent retries on permanent failures)
    const signatureValid = verifyPayFastSignature(params, params['signature'] ?? '', passphrase)
    if (!signatureValid) {
      console.error('[payfast-itn] Invalid signature for m_payment_id:', mPaymentId)
      await supabase.from('build_events').insert({
        site_id: siteId || null,
        event_type: 'itn_invalid_signature',
        status: 'error',
        message: JSON.stringify({ payment_status: paymentStatus, m_payment_id: mPaymentId }),
      }).catch(() => {})
      return jsonResponse({ error: 'Invalid signature' }, 200)
    }

    // ── PAY-04: Idempotency check ──────────────────────────────────────────────
    // Check if this m_payment_id was already processed (duplicate ITN detection)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, payment_id, user_id, package')
      .eq('id', mPaymentId)
      .maybeSingle()

    if (existingOrder?.status === 'paid' && paymentStatus === 'COMPLETE') {
      console.log('[payfast-itn] Duplicate COMPLETE ITN for order:', mPaymentId)
      await supabase.from('build_events').insert({
        site_id: siteId || null,
        event_type: 'itn_duplicate_skipped',
        status: 'info',
        message: JSON.stringify({ m_payment_id: mPaymentId, pf_payment_id: pfPaymentId }),
      }).catch(() => {})
      return jsonResponse({ ok: true, skipped: 'duplicate' })
    }

    // Log ITN receipt for observability
    await supabase.from('build_events').insert({
      site_id: siteId || null,
      event_type: 'itn_received',
      status: 'info',
      message: JSON.stringify({ payment_status: paymentStatus, m_payment_id: mPaymentId, pf_payment_id: pfPaymentId }),
    }).catch(() => {})

    // ── COMPLETE handler ───────────────────────────────────────────────────────
    if (paymentStatus === 'COMPLETE') {
      // Find order — m_payment_id equals our order UUID
      let order = existingOrder
      if (!order) {
        // Fallback: look up by payment_id field (for orders already updated)
        const { data: byPaymentId } = await supabase
          .from('orders')
          .select('id, status, payment_id, user_id, package')
          .eq('payment_id', mPaymentId)
          .maybeSingle()
        order = byPaymentId
      }

      if (!order) {
        console.error('[payfast-itn] No order found for m_payment_id:', mPaymentId)
        return jsonResponse({ ok: true })
      }

      // Check if a subscription already exists for this order (initial vs recurring)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('order_id', order.id)
        .maybeSingle()

      if (!existingSub) {
        // ── PAY-05: Initial COMPLETE — create subscription and trigger build ──

        // PAY-08: Resubscribe detection — check if siteId has a prior cancelled/suspended subscription
        let isResubscribe = false
        if (siteId) {
          const { data: priorSub } = await supabase
            .from('subscriptions')
            .select('id, status, order_id')
            .in('status', ['cancelled', 'suspended'])
            .eq('order_id', supabase.from('client_sites').select('order_id').eq('id', siteId))
            .maybeSingle()

          // Simpler alternative: query via join on client_sites
          if (!priorSub) {
            const { data: siteRow } = await supabase
              .from('client_sites')
              .select('order_id')
              .eq('id', siteId)
              .maybeSingle()

            if (siteRow && siteRow.order_id !== order.id) {
              const { data: priorSubByOrderId } = await supabase
                .from('subscriptions')
                .select('id, status')
                .eq('order_id', siteRow.order_id)
                .in('status', ['cancelled', 'suspended'])
                .maybeSingle()
              if (priorSubByOrderId) isResubscribe = true
            }
          } else {
            isResubscribe = true
          }
        }

        // Update order: paid + store PayFast payment ID
        await supabase
          .from('orders')
          .update({ status: 'paid', payment_id: mPaymentId })
          .eq('id', order.id)

        // Compute next charge date (today + 1 month)
        const nextChargeAt = new Date()
        nextChargeAt.setMonth(nextChargeAt.getMonth() + 1)

        // Insert subscription row
        await supabase.from('subscriptions').insert({
          user_id: order.user_id,
          order_id: order.id,
          plan: order.package,
          status: 'active',
          payfast_subscription_id: pfPaymentId,
          payfast_token: token || null,
          next_charge_at: nextChargeAt.toISOString(),
          amount_cents: 4900,
          failed_charge_count: 0,
        })

        if (isResubscribe) {
          // Resubscription: republish existing site without full Claude generation
          console.log('[payfast-itn] Resubscription detected — invoking reactivate-site for siteId:', siteId)
          await supabase.from('build_events').insert({
            site_id: siteId || null,
            event_type: 'itn_payment_complete_resubscribe',
            status: 'info',
            message: JSON.stringify({ m_payment_id: mPaymentId, amount_gross: amountGross }),
          }).catch(() => {})
          supabase.functions.invoke('reactivate-site', { body: { siteId } }).catch(() => {})
        } else {
          // First-time signup: full Claude generation flow
          console.log('[payfast-itn] Initial payment complete — invoking generate-site for siteId:', siteId)
          await supabase.from('build_events').insert({
            site_id: siteId || null,
            event_type: 'itn_payment_complete_initial',
            status: 'info',
            message: JSON.stringify({ m_payment_id: mPaymentId, amount_gross: amountGross }),
          }).catch(() => {})
          supabase.functions.invoke('generate-site', { body: { siteId } }).catch(() => {})
        }
      } else {
        // ── PAY-06: Recurring COMPLETE — update next_charge_at only ──
        console.log('[payfast-itn] Recurring payment complete for order:', order.id)

        const nextChargeAt = new Date()
        nextChargeAt.setMonth(nextChargeAt.getMonth() + 1)

        await supabase
          .from('subscriptions')
          .update({
            next_charge_at: nextChargeAt.toISOString(),
            failed_charge_count: 0,
            status: 'active',
          })
          .eq('order_id', order.id)

        await supabase.from('build_events').insert({
          site_id: siteId || null,
          event_type: 'itn_payment_complete_recurring',
          status: 'info',
          message: JSON.stringify({ m_payment_id: mPaymentId, amount_gross: amountGross }),
        }).catch(() => {})
        // Do NOT trigger generate-site or reactivate-site for recurring payments
      }

    } else if (paymentStatus === 'FAILED') {
      // ── PAY-07: FAILED handler — increment failure count, move to grace_period ──
      let order = existingOrder
      if (!order) {
        const { data: byPaymentId } = await supabase
          .from('orders')
          .select('id, status, payment_id, user_id, package')
          .eq('payment_id', mPaymentId)
          .maybeSingle()
        order = byPaymentId
      }

      if (order) {
        // Fetch current failed_charge_count and increment
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, failed_charge_count')
          .eq('order_id', order.id)
          .maybeSingle()

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'grace_period',
              failed_charge_count: (sub.failed_charge_count ?? 0) + 1,
            })
            .eq('id', sub.id)
        }

        await supabase.from('build_events').insert({
          site_id: siteId || null,
          event_type: 'itn_payment_failed',
          status: 'warning',
          message: JSON.stringify({ m_payment_id: mPaymentId, pf_payment_id: pfPaymentId }),
        }).catch(() => {})
      }

    } else if (paymentStatus === 'CANCELLED') {
      // ── PAY-07: CANCELLED handler — cancel subscription and suspend site ──
      let order = existingOrder
      if (!order) {
        const { data: byPaymentId } = await supabase
          .from('orders')
          .select('id, status, payment_id, user_id, package')
          .eq('payment_id', mPaymentId)
          .maybeSingle()
        order = byPaymentId
      }

      if (order) {
        // Update subscription to cancelled
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            suspended_at: new Date().toISOString(),
          })
          .eq('order_id', order.id)

        // Update order status
        await supabase
          .from('orders')
          .update({ status: 'suspended' })
          .eq('id', order.id)

        await supabase.from('build_events').insert({
          site_id: siteId || null,
          event_type: 'itn_subscription_cancelled',
          status: 'info',
          message: JSON.stringify({ m_payment_id: mPaymentId }),
        }).catch(() => {})

        // Fire-and-forget suspend-site
        supabase.functions.invoke('suspend-site', { body: { siteId } }).catch(() => {})
      }
    }
    // Any other payment_status (e.g. PENDING) — return 200 to prevent PayFast retries

    return jsonResponse({ ok: true })
  } catch (err) {
    // Always return 200 — PayFast must not retry on our server errors
    console.error('[payfast-itn] Unhandled error:', err)
    await supabase.from('build_events').insert({
      site_id: null,
      event_type: 'itn_error',
      status: 'error',
      message: String(err),
    }).catch(() => {})
    return jsonResponse({ ok: true })
  }
})
