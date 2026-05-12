import { supabase } from '../supabaseClient'

export const PRIMARY_ADMIN_EMAIL = 'cruceanu.cristian3004@gmail.com'

export function normalizeAdminEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

export function isPrimaryAdminEmail(email) {
  return normalizeAdminEmail(email) === PRIMARY_ADMIN_EMAIL
}

export async function checkCurrentUserIsAdmin() {
  const { data, error } = await supabase.rpc('is_curriculum_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return false
    throw error
  }
  return Boolean(data)
}

export async function getCurriculumAdminEmails() {
  const { data, error } = await supabase
    .from('curriculum_admin_emails')
    .select('id, email, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addCurriculumAdminEmail(email) {
  const normalized = normalizeAdminEmail(email)
  if (!normalized) {
    throw new Error('Introdu o adresă de email validă.')
  }

  const { data, error } = await supabase
    .from('curriculum_admin_emails')
    .insert([{ email: normalized }])
    .select('id, email, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Acest email este deja administrator.')
    }
    throw error
  }

  return data
}

export async function removeCurriculumAdminEmail(id, email) {
  if (isPrimaryAdminEmail(email)) {
    throw new Error('Administratorul principal nu poate fi eliminat.')
  }

  const { error } = await supabase
    .from('curriculum_admin_emails')
    .delete()
    .eq('id', id)

  if (error) throw error
}
