/**
 * Serviciu pentru rolurile de administrare. Distinge:
 *  - profesor: admin de conținut (Curriculum, Roadmaps, Variante);
 *  - administrator tehnic (superset): conținut + Rapoarte, Acces, Platformă;
 *  - administrator principal: super-adminul care gestionează lista de admini.
 * Verificările de rol se bazează pe funcții RPC din baza de date, dublate de RLS.
 */
import { supabase } from '../supabaseClient'

/** Rolurile valide pentru un admin de curriculum. */
export const ADMIN_ROLES = ['profesor', 'technical']

/** Normalizează un email (trim + lowercase) și returnează null dacă nu e valid. */
export function normalizeAdminEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  return value
}

/** Verifică dacă un email coincide cu cel al administratorului principal. */
export function isEmailPrimaryAdmin(email, primaryAdminEmail) {
  if (!primaryAdminEmail) return false
  return normalizeAdminEmail(email) === primaryAdminEmail
}

/** Returnează true dacă utilizatorul curent este admin de curriculum. */
export async function checkCurrentUserIsAdmin() {
  const { data, error } = await supabase.rpc('is_curriculum_admin')
  if (error) {
    // Funcția RPC lipsește (ex. migrare neaplicată) — tratăm ca „nu e admin”
    // în loc să blocăm aplicația cu o eroare.
    if (error.code === 'PGRST202' || error.code === '42883') return false
    throw error
  }
  return Boolean(data)
}

/** Returnează true dacă utilizatorul curent este administratorul principal. */
export async function checkCurrentUserIsPrimaryAdmin() {
  const { data, error } = await supabase.rpc('is_primary_admin')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return false
    throw error
  }
  return Boolean(data)
}

/**
 * Returnează true dacă utilizatorul curent este administrator tehnic (rol
 * 'technical' sau administratorul principal). Aceștia au acces complet (superset);
 * profesorii sunt restricționați la secțiunile de conținut.
 */
export async function checkCurrentUserIsTechnicalAdmin() {
  const { data, error } = await supabase.rpc('is_technical_admin')
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

/** Aruncă eroare dacă utilizatorul curent nu e admin de curriculum (gardă reutilizabilă). */
export async function requireCurriculumAdmin() {
  const isAdmin = await checkCurrentUserIsAdmin()
  if (!isAdmin) {
    throw new Error('Acces neautorizat.')
  }
}

/** Aruncă eroare dacă utilizatorul curent nu e administratorul principal. */
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
    .select('id, email, created_at, role')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Adaugă un email în lista de admini. Doar administratorul principal poate face
 * asta, iar emailul trebuie să aparțină unui cont existent. `role` decide accesul:
 * 'profesor' (doar conținut) sau 'technical' (superset).
 */
export async function addCurriculumAdminEmail(email, role = 'profesor') {
  await requirePrimaryAdmin()

  if (!ADMIN_ROLES.includes(role)) {
    throw new Error('Rol invalid.')
  }

  const normalized = normalizeAdminEmail(email)
  if (!normalized) {
    throw new Error('Introdu o adresă de email validă.')
  }

  // Acordăm rol de admin doar unei persoane care are deja cont în aplicație.
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
    .insert([{ email: normalized, role }])
    .select('id, email, created_at, role')
    .single()

  if (error) {
    // 42501 / RLS = blocat de politicile bazei de date; 23505 = email deja prezent.
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

/**
 * Schimbă rolul unui admin existent (profesor ↔ technical). Doar administratorul
 * principal poate face asta (RLS pe UPDATE).
 */
export async function updateCurriculumAdminRole(id, role) {
  await requirePrimaryAdmin()

  if (!ADMIN_ROLES.includes(role)) {
    throw new Error('Rol invalid.')
  }

  const { data, error } = await supabase
    .from('curriculum_admin_emails')
    .update({ role })
    .eq('id', id)
    .select('id, email, created_at, role')
    .single()

  if (error) {
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      throw new Error('Doar administratorul principal poate modifica rolurile.')
    }
    throw error
  }

  return data
}

/** Elimină un admin de curriculum; administratorul principal nu poate fi șters. */
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
