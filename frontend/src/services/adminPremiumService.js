import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin, requirePrimaryAdmin } from './curriculumAdminService'

export async function getPremiumUsersForAdmin() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase.rpc('list_premium_entitlements_for_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Lista Premium nu este disponibilă momentan.')
    }
    throw error
  }
  return data ?? []
}

export async function revokePremiumEntitlement(userId) {
  await requirePrimaryAdmin()

  const { error } = await supabase.rpc('revoke_premium_entitlement', {
    p_user_id: userId,
  })

  if (error) throw error
}
