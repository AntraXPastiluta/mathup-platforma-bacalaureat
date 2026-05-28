import { supabase } from '../supabaseClient'

export function normalizeAdminEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

export function isEmailPrimaryAdmin(email, primaryAdminEmail) {
  if (!primaryAdminEmail) return false
  return normalizeAdminEmail(email) === primaryAdminEmail
}

export async function checkCurrentUserIsAdmin() {
  const { data, error } = await supabase.rpc('is_curriculum_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return false
    throw error
  }
  return Boolean(data)
}

export async function checkCurrentUserIsPrimaryAdmin() {
  const { data, error } = await supabase.rpc('is_primary_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return false
    throw error
  }
  return Boolean(data)
}

export async function fetchPrimaryAdminEmail() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase.rpc('get_primary_admin_email')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return null
    throw error
  }
  return normalizeAdminEmail(data) || null
}

export async function requireCurriculumAdmin() {
  const isAdmin = await checkCurrentUserIsAdmin()
  if (!isAdmin) {
    throw new Error('Acces neautorizat.')
  }
}

export async function requirePrimaryAdmin() {
  const isPrimary = await checkCurrentUserIsPrimaryAdmin()
  if (!isPrimary) {
    throw new Error('Doar administratorul principal poate efectua această acțiune.')
  }
}

export async function getCurriculumAdminEmails() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('curriculum_admin_emails')
    .select('id, email, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addCurriculumAdminEmail(email) {
  await requirePrimaryAdmin()

  const normalized = normalizeAdminEmail(email)
  if (!normalized) {
    throw new Error('Introdu o adresă de email validă.')
  }

  const { data: userExists, error: lookupError } = await supabase.rpc('auth_user_email_exists', {
    p_email: normalized,
  })

  if (lookupError) {
    if (lookupError.code === 'PGRST202' || lookupError.code === '42883') {
      throw new Error('Verificarea emailului nu este disponibilă momentan.')
    }
    throw lookupError
  }

  if (!userExists) {
    throw new Error('Nu am putut adăuga administratorul. Verifică că persoana are cont activ.')
  }

  const { data, error } = await supabase
    .from('curriculum_admin_emails')
    .insert([{ email: normalized }])
    .select('id, email, created_at')
    .single()

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Doar administratorul principal poate adăuga administratori.')
    }
    if (error.code === '23505') {
      throw new Error('Acest email este deja administrator.')
    }
    throw error
  }

  return data
}

export async function removeCurriculumAdminEmail(id, email) {
  await requirePrimaryAdmin()

  const primaryAdminEmail = await fetchPrimaryAdminEmail()
  if (isEmailPrimaryAdmin(email, primaryAdminEmail)) {
    throw new Error('Administratorul principal nu poate fi eliminat.')
  }

  const { error } = await supabase
    .from('curriculum_admin_emails')
    .delete()
    .eq('id', id)

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Doar administratorul principal poate elimina administratori.')
    }
    throw error
  }
}
