import { readEnv, type EnvSource } from './env.ts'
import type Stripe from 'stripe'

export function seasonEndIso(envSource?: EnvSource) {
  const configured = readEnv('PREMIUM_SEASON_END', envSource)
  if (!configured) return null

  const parsed = new Date(configured)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('PREMIUM_SEASON_END must be a valid date.')
  }

  return parsed.toISOString()
}

export function capExpiresAt(iso: string, envSource?: EnvSource) {
  const seasonEndIsoValue = seasonEndIso(envSource)
  if (!seasonEndIsoValue) return iso

  const seasonEnd = new Date(seasonEndIsoValue).getTime()
  const candidate = new Date(iso).getTime()

  // A stale season setting must never turn a newly-paid subscription into an
  // already-expired entitlement.  Operators can still set a future season end
  // deliberately; once it has passed, Stripe's own billing period is used.
  if (seasonEnd <= Date.now()) return iso

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

// Stripe API versions >= 2025-03-31.basil moved `current_period_end` off the
// Subscription object and onto each subscription item. Webhook event payloads are
// serialized with the endpoint's API version (not our pinned client version), so a
// `customer.subscription.deleted/updated` payload can arrive without the top-level
// field. Read it where it exists — top level first (older payloads / pinned acacia
// retrieves), then the latest item-level value — so the sync never throws and silently
// fails to revoke access.
function resolveCurrentPeriodEnd(subscription: Stripe.Subscription): number | null {
  const topLevel = (subscription as { current_period_end?: number | null }).current_period_end
  if (typeof topLevel === 'number') return topLevel

  const itemEnds = (subscription.items?.data ?? [])
    .map((item) => (item as { current_period_end?: number | null }).current_period_end)
    .filter((value): value is number => typeof value === 'number')

  return itemEnds.length > 0 ? Math.max(...itemEnds) : null
}

export function subscriptionPeriodEndIso(subscription: Stripe.Subscription, envSource?: EnvSource) {
  const periodEnd = resolveCurrentPeriodEnd(subscription)
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
