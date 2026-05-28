import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'
import { type EnvSource, readEnv } from '../_shared/env.ts'
import { createBaseApp, getCorsHeaders, textResponse } from '../_shared/http.ts'
import { syncCheckoutSession, syncSubscriptionEntitlement, upsertEntitlement } from '../_shared/stripe-webhook.ts'

type WebhookDeps = {
  stripe?: typeof Stripe
  createClient?: typeof createClient
  env?: EnvSource
}

export function createStripeWebhookApp(deps: WebhookDeps = {}) {
  const StripeCtor = deps.stripe ?? Stripe
  const createSupabaseClient = deps.createClient ?? createClient
  const env = deps.env
  const app = createBaseApp()

  app.options('*', (c) => textResponse('ok', 200, getCorsHeaders(c)))

  app.post('*', async (c) => {
    const stripeSecret = readEnv('STRIPE_SECRET_KEY', env) ?? ''
    const webhookSecret = readEnv('STRIPE_WEBHOOK_SECRET', env) ?? ''
    const stripePriceId = readEnv('STRIPE_PRICE_ID', env) ?? ''
    const supabaseUrl = readEnv('SUPABASE_URL', env) ?? ''
    const serviceRoleKey = readEnv('SERVICE_ROLE_KEY', env) ?? ''

    if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey || !stripePriceId) {
      return textResponse('Webhook unavailable.', 500, getCorsHeaders(c))
    }

    const stripe = new StripeCtor(stripeSecret, { apiVersion: '2025-02-24.acacia' })
    const signature = c.req.header('stripe-signature')
    if (!signature) {
      return textResponse('Missing Stripe signature.', 400, getCorsHeaders(c))
    }

    const body = await c.req.raw.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (error) {
      console.error('Stripe webhook signature verification failed:', error)
      return textResponse('Invalid webhook signature.', 400, getCorsHeaders(c))
    }

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await syncCheckoutSession({
            stripePriceId,
            supabaseUrl,
            serviceRoleKey,
            createClientImpl: createSupabaseClient,
            stripe,
            session,
          })
        }
      }

      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated' ||
        event.type === 'customer.subscription.deleted'
      ) {
        const subscription = event.data.object as Stripe.Subscription
        await syncSubscriptionEntitlement({
          stripePriceId,
          supabaseUrl,
          serviceRoleKey,
          createClientImpl: createSupabaseClient,
          subscription,
        })
      }

      if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id ?? null
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await syncSubscriptionEntitlement({
            stripePriceId,
            supabaseUrl,
            serviceRoleKey,
            createClientImpl: createSupabaseClient,
            subscription,
          })
        }
      }

      if (event.type === 'charge.refunded') {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
        if (!paymentIntentId) {
          return textResponse('ok', 200, getCorsHeaders(c))
        }

        const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {})
        const { data, error } = await supabase
          .from('premium_entitlements')
          .select('user_id, stripe_checkout_session_id, stripe_subscription_id, stripe_customer_id')
          .eq('stripe_payment_intent_id', paymentIntentId)
          .maybeSingle()

        if (error) throw error
        if (data) {
          await upsertEntitlement({
            supabaseUrl,
            serviceRoleKey,
            createClientImpl: createSupabaseClient,
            userId: data.user_id,
            sessionId: data.stripe_checkout_session_id,
            paymentIntentId,
            subscriptionId: data.stripe_subscription_id,
            customerId: data.stripe_customer_id,
            amountPaid: charge.amount_refunded ? charge.amount_refunded / 100 : null,
            currency: charge.currency,
            expiresAt: new Date().toISOString(),
            status: 'refunded',
            cancelAtPeriodEnd: false,
          })
        }
      }
    } catch (error) {
      console.error('Stripe webhook processing failed:', error)
      return textResponse('Webhook processing failed.', 500, getCorsHeaders(c))
    }

    return textResponse('ok', 200, getCorsHeaders(c))
  })

  app.all('*', (c) => textResponse('Method not allowed.', 405, getCorsHeaders(c)))

  return app
}

export const app = createStripeWebhookApp()
if (import.meta.main) {
  Deno.serve(app.fetch)
}
