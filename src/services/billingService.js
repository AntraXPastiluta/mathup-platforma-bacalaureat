import { supabase } from '../supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export async function getPremiumEntitlement(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('premium_entitlements')
    .select('status,expires_at,purchased_at,amount_paid,currency')
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

function checkoutUnavailableMessage() {
  return 'Plata Premium nu este disponibilă momentan. Verifică că funcțiile Edge create-checkout-session și stripe-webhook sunt publicate în Supabase și că secretul APP_URL este setat.'
}

function parseCheckoutPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Nu am putut porni plata Premium.')
  }
  if (payload.error) throw new Error(payload.error)
  if (!payload.url) throw new Error('Nu am putut porni plata Premium.')
  return payload.url
}

async function invokeCheckoutSession(accessToken) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return parseCheckoutPayload(data)

  const message = error.message || ''
  const shouldRetryWithFetch =
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(message || checkoutUnavailableMessage())
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || checkoutUnavailableMessage())
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
