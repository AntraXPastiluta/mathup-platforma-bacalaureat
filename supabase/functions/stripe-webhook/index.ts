import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function seasonEndIso() {
  const configured = Deno.env.get('PREMIUM_SEASON_END')
  if (configured) return new Date(configured).toISOString()
  const year = new Date().getUTCFullYear()
  return new Date(Date.UTC(year, 6, 10, 21, 59, 59)).toISOString()
}

async function upsertEntitlement({
  userId,
  sessionId,
  paymentIntentId,
  amountPaid,
  currency,
  expiresAt,
  status,
}: {
  userId: string
  sessionId: string
  paymentIntentId: string | null
  amountPaid: number | null
  currency: string | null
  expiresAt: string
  status: 'active' | 'refunded'
}) {
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  const { error: entitlementError } = await supabase.from('premium_entitlements').upsert({
    user_id: userId,
    status,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    purchased_at: now,
    expires_at: expiresAt,
    amount_paid: amountPaid,
    currency,
    updated_at: now,
  }, { onConflict: 'user_id' })

  if (entitlementError) throw entitlementError

  const { error: orderError } = await supabase.from('premium_orders').upsert({
    user_id: userId,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    status,
    amount_paid: amountPaid,
    currency,
  }, { onConflict: 'stripe_checkout_session_id' })

  if (orderError) throw orderError
}

Deno.serve(async (req) => {
  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response('Missing webhook configuration.', { status: 500 })
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' })
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing Stripe signature.', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature.'
    return new Response(message, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['payment_intent'],
      })
      const userId = fullSession.metadata?.user_id ?? fullSession.client_reference_id
      const paymentIntent = fullSession.payment_intent
      const paymentIntentId = typeof paymentIntent === 'string'
        ? paymentIntent
        : paymentIntent?.id ?? null
      if (!userId) throw new Error('Checkout session missing user id metadata.')

      const expiresAt = fullSession.metadata?.premium_expires_at ?? seasonEndIso()
      await upsertEntitlement({
        userId,
        sessionId: fullSession.id,
        paymentIntentId,
        amountPaid: fullSession.amount_total ? fullSession.amount_total / 100 : null,
        currency: fullSession.currency,
        expiresAt,
        status: 'active',
      })
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
      if (!paymentIntentId) {
        return new Response('ok', { status: 200 })
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey)
      const { data, error } = await supabase
        .from('premium_entitlements')
        .select('user_id, stripe_checkout_session_id')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

      if (error) throw error
      if (data) {
        await upsertEntitlement({
          userId: data.user_id,
          sessionId: data.stripe_checkout_session_id,
          paymentIntentId,
          amountPaid: charge.amount_refunded ? charge.amount_refunded / 100 : null,
          currency: charge.currency,
          expiresAt: new Date().toISOString(),
          status: 'refunded',
        })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.'
    return new Response(message, { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
