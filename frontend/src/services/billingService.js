import { supabase } from '../supabaseClient'
import { USER_MESSAGES } from '../shared/utils/userFacingError'
import { checkCurrentUserIsAdmin } from './curriculumAdminService'
import { requireSelfUserId } from './sessionGuard'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const CHECKOUT_UNAVAILABLE = USER_MESSAGES.checkout
const CANCEL_UNAVAILABLE = USER_MESSAGES.cancelPremium

export async function getPremiumEntitlement(userId) {
  if (!userId) return null

  const isAdmin = await checkCurrentUserIsAdmin().catch(() => false)
  if (!isAdmin) {
    await requireSelfUserId(userId)
  }

  const { data, error } = await supabase
    .from('premium_entitlements')
    .select('status,expires_at,purchased_at,amount_paid,currency,stripe_subscription_id,cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export function isEntitlementActive(entitlement) {
  if (!entitlement || entitlement.status !== 'active') return false
  if (!entitlement.expires_at) return false
  return new Date(entitlement.expires_at).getTime() > Date.now()
}

function logBillingError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[billing:${context}]`, error)
  }
}

function parseCheckoutPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.url) {
    throw new Error(CHECKOUT_UNAVAILABLE)
  }
  return payload.url
}

async function invokeCheckoutSession(accessToken) {
  const returnOrigin = window.location.origin
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { return_origin: returnOrigin },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return parseCheckoutPayload(data)

  const message = error.message || ''
  const contextStatus = error?.context?.status
  if (contextStatus === 404) {
    logBillingError('checkout-not-deployed', error)
    throw new Error(CHECKOUT_UNAVAILABLE)
  }

  const shouldRetryWithFetch =
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    logBillingError('checkout-invoke', error)
    throw new Error(CHECKOUT_UNAVAILABLE)
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ return_origin: window.location.origin }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    logBillingError('checkout-fetch', { status: response.status, payload })
    throw new Error(CHECKOUT_UNAVAILABLE)
  }

  return parseCheckoutPayload(payload)
}

export async function startPremiumCheckout() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a cumpăra Premium.')
  }

  const checkoutUrl = await invokeCheckoutSession(session.access_token)
  window.location.assign(checkoutUrl)
}

function parseCancelPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(CANCEL_UNAVAILABLE)
  }
  if (payload.error) {
    logBillingError('cancel-payload', payload.error)
    throw new Error(CANCEL_UNAVAILABLE)
  }
  return payload
}

async function invokeCancelPremiumSubscription(accessToken) {
  const { data, error } = await supabase.functions.invoke('cancel-premium-subscription', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return parseCancelPayload(data)

  const message = error.message || ''
  const contextStatus = error?.context?.status
  if (contextStatus === 404) {
    logBillingError('cancel-not-deployed', error)
    throw new Error(CANCEL_UNAVAILABLE)
  }

  const shouldRetryWithFetch =
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    logBillingError('cancel-invoke', error)
    throw new Error(CANCEL_UNAVAILABLE)
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/cancel-premium-subscription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    logBillingError('cancel-fetch', { status: response.status, payload })
    throw new Error(CANCEL_UNAVAILABLE)
  }

  return parseCancelPayload(payload)
}

export async function cancelPremiumSubscription() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a gestiona abonamentul Premium.')
  }

  return invokeCancelPremiumSubscription(session.access_token)
}
