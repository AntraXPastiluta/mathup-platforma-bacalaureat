import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import Stripe from 'npm:stripe@17.7.0'
import { assertSubscriptionPrice, entitlementStatusFromSubscription, subscriptionPeriodEndIso } from './premium.ts'

export async function upsertEntitlement({
  supabaseUrl,
  serviceRoleKey,
  createClientImpl = createClient,
  userId,
  sessionId,
  paymentIntentId,
  subscriptionId,
  customerId,
  amountPaid,
  currency,
  expiresAt,
  status,
  cancelAtPeriodEnd,
}: {
  supabaseUrl: string
  serviceRoleKey: string
  createClientImpl?: typeof createClient
  userId: string
  sessionId: string | null
  paymentIntentId: string | null
  subscriptionId: string | null
  customerId: string | null
  amountPaid: number | null
  currency: string | null
  expiresAt: string
  status: 'active' | 'refunded'
  cancelAtPeriodEnd: boolean
}) {
  const supabase = createClientImpl(supabaseUrl, serviceRoleKey)
  const now = new Date().toISOString()

  const { error: entitlementError } = await supabase.from('premium_entitlements').upsert({
    user_id: userId,
    status,
    stripe_checkout_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    purchased_at: now,
    expires_at: expiresAt,
    amount_paid: amountPaid,
    currency,
    cancel_at_period_end: cancelAtPeriodEnd,
    updated_at: now,
  }, { onConflict: 'user_id' })

  if (entitlementError) throw entitlementError

  if (!sessionId) return

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

export async function syncSubscriptionEntitlement(options: {
  stripePriceId: string
  supabaseUrl: string
  serviceRoleKey: string
  createClientImpl?: typeof createClient
  subscription: Stripe.Subscription
}) {
  const { stripePriceId, supabaseUrl, serviceRoleKey, createClientImpl, subscription } = options
  assertSubscriptionPrice(subscription, stripePriceId)

  const userId = subscription.metadata?.user_id
  if (!userId) {
    throw new Error('Subscription missing user id metadata.')
  }

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id ?? null

  await upsertEntitlement({
    supabaseUrl,
    serviceRoleKey,
    createClientImpl,
    userId,
    sessionId: null,
    paymentIntentId: null,
    subscriptionId: subscription.id,
    customerId,
    amountPaid: null,
    currency: subscription.currency ?? null,
    expiresAt: subscriptionPeriodEndIso(subscription),
    status: entitlementStatusFromSubscription(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}

export async function syncCheckoutSession(options: {
  stripePriceId: string
  supabaseUrl: string
  serviceRoleKey: string
  createClientImpl?: typeof createClient
  stripe: Stripe
  session: Stripe.Checkout.Session
}) {
  const { stripePriceId, supabaseUrl, serviceRoleKey, createClientImpl, stripe, session } = options
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['subscription', 'payment_intent'],
  })

  const userId = fullSession.metadata?.user_id ?? fullSession.client_reference_id
  if (!userId) throw new Error('Checkout session missing user id metadata.')

  const subscription = fullSession.subscription
  const subscriptionId = typeof subscription === 'string'
    ? subscription
    : subscription?.id ?? null

  if (!subscriptionId) {
    throw new Error('Checkout session missing subscription id.')
  }

  const fullSubscription = typeof subscription === 'object' && subscription
    ? subscription
    : await stripe.subscriptions.retrieve(subscriptionId)

  assertSubscriptionPrice(fullSubscription, stripePriceId)

  const paymentIntent = fullSession.payment_intent
  const paymentIntentId = typeof paymentIntent === 'string'
    ? paymentIntent
    : paymentIntent?.id ?? null

  const customerId = typeof fullSession.customer === 'string'
    ? fullSession.customer
    : fullSession.customer?.id ?? null

  await upsertEntitlement({
    supabaseUrl,
    serviceRoleKey,
    createClientImpl,
    userId,
    sessionId: fullSession.id,
    paymentIntentId,
    subscriptionId: fullSubscription.id,
    customerId,
    amountPaid: fullSession.amount_total ? fullSession.amount_total / 100 : null,
    currency: fullSession.currency,
    expiresAt: subscriptionPeriodEndIso(fullSubscription),
    status: entitlementStatusFromSubscription(fullSubscription),
    cancelAtPeriodEnd: fullSubscription.cancel_at_period_end,
  })
}
