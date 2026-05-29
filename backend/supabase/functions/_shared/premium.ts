import { readEnv, type EnvSource } from './env.ts'
import type Stripe from 'stripe'

export function seasonEndIso(envSource?: EnvSource) {
  const configured = readEnv('PREMIUM_SEASON_END', envSource)
  if (configured) return new Date(configured).toISOString()
  const year = new Date().getUTCFullYear()
  return new Date(Date.UTC(year, 6, 10, 21, 59, 59)).toISOString()
}

export function capExpiresAt(iso: string, envSource?: EnvSource) {
  const seasonEnd = new Date(seasonEndIso(envSource)).getTime()
  const candidate = new Date(iso).getTime()
  return new Date(Math.min(candidate, seasonEnd)).toISOString()
}

// Stripe subscription statuses that keep Premium access switched on.
// `past_due` is intentionally included so a user keeps access during Stripe's
// payment-retry grace period instead of being locked out the instant a renewal
// charge fails. Every other status (canceled, unpaid, paused, incomplete, ...)
// falls through to 'refunded' and revokes the entitlement.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
])

export function entitlementStatusFromSubscription(subscription: Stripe.Subscription) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
    ? ('active' as const)
    : ('refunded' as const)
}

export function subscriptionPeriodEndIso(subscription: Stripe.Subscription, envSource?: EnvSource) {
  const periodEnd = subscription.current_period_end
  if (!periodEnd) {
    throw new Error('Subscription missing current period end.')
  }
  return capExpiresAt(new Date(periodEnd * 1000).toISOString(), envSource)
}

export function assertSubscriptionPrice(subscription: Stripe.Subscription, stripePriceId: string) {
  if (!stripePriceId) {
    throw new Error('Missing STRIPE_PRICE_ID')
  }

  const matches = (subscription.items?.data ?? []).some(
    (item: Stripe.SubscriptionItem) => item.price?.id === stripePriceId,
  )
  if (!matches) {
    throw new Error('Unexpected subscription price.')
  }
}
