/**
 * Text shown in the Premium confirmation modal. Set `VITE_PREMIUM_PRICE_LABEL` in `.env.local`
 * to match your Stripe Price (e.g. `29,99 RON / lună`).
 */
const raw = import.meta.env.VITE_PREMIUM_PRICE_LABEL
export const PREMIUM_PRICE_LABEL = typeof raw === 'string' && raw.trim() ? raw.trim() : ''
