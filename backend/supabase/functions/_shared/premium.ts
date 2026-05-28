import { readEnv, type EnvSource } from './env.ts'
import type Stripe from 'npm:stripe@17.7.0'

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

export function entitlementStatusFromSubscription(subscription: Stripe.Subscription) {
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return 'active' as const
  }
  if (subscription.status === 'past_due') {
    return 'active' as const
  }
  return 'refunded' as const
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
