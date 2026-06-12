// Pin the Stripe API version in a single place so every edge function speaks
// the same dialect. Bump this constant when upgrading Stripe rather than
// editing each `new Stripe(...)` call site individually.
export const STRIPE_API_VERSION = '2025-02-24.acacia' as const
