import { supabase } from '../supabaseClient'
import { isPrimaryAdminEmail } from './curriculumAdminService'

export async function getPremiumUsersForAdmin() {
  const { data, error } = await supabase.rpc('list_premium_entitlements_for_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Lista Premium nu este disponibilă. Aplică migrarea pentru administratori Premium în Supabase.')
    }
    throw error
  }
  return data ?? []
}

export async function revokePremiumEntitlement(userId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  if (!isPrimaryAdminEmail(user?.email)) {
    throw new Error('Doar administratorul principal poate elimina statusul Premium.')
  }

  const { error } = await supabase.rpc('revoke_premium_entitlement', {
    p_user_id: userId,
  })

  if (error) throw error
}
