import { supabase } from '../supabaseClient'

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

export async function startPremiumCheckout() {
  const { data, error } = await supabase.functions.invoke('create-checkout-session')
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  if (!data?.url) throw new Error('Nu am putut porni plata Premium.')
  window.location.assign(data.url)
}
