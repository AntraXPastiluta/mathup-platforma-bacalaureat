/**
 * Operațiuni de administrare a abonamentelor Premium.
 * Citirea listei e permisă oricărui admin de curriculum, dar revocarea
 * efectivă a unui abonament e rezervată administratorului principal.
 */
import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin, requirePrimaryAdmin } from './curriculumAdminService'

/** Returnează utilizatorii cu Premium activ, pentru panoul de admin. */
export async function getPremiumUsersForAdmin() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase.rpc('list_premium_entitlements_for_admin')
  if (error) {
    // PGRST202/42883 = funcția RPC lipsește (ex. migrare neaplicată); afișăm un
    // mesaj prietenos în loc să propagăm eroarea tehnică spre interfață.
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Lista Premium nu este disponibilă momentan.')
    }
    throw error
  }
  return data ?? []
}

/** Revocă manual abonamentul Premium al unui utilizator (doar admin principal). */
export async function revokePremiumEntitlement(userId) {
  await requirePrimaryAdmin()

  const { error } = await supabase.rpc('revoke_premium_entitlement', {
    p_user_id: userId,
  })

  if (error) throw error
}
