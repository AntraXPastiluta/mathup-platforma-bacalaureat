/**
 * Utilitare pentru profilul elevului: normalizarea programelor BAC (profiluri),
 * validarea notei-țintă și verificarea dacă onboarding-ul de profil e necesar.
 */
import { supabase } from '../supabaseClient'
import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'

const VALID_PROFILE_KEYS = new Set(PROFILES.map((profile) => profile.key))

/** Returnează profilul dacă e o cheie validă, altfel profilul implicit. */
export function normalizeProfile(value) {
  if (typeof value === 'string' && VALID_PROFILE_KEYS.has(value)) {
    return value
  }
  return DEFAULT_PROFILE
}

/** Elimină duplicatele și cheile invalide, păstrând ordinea; revine la un program implicit dacă lista e goală. */
export function normalizeProfilesList(value) {
  if (!Array.isArray(value)) return [DEFAULT_PROFILE]
  const seen = new Set()
  const out = []
  for (const item of value) {
    const key = typeof item === 'string' ? item : ''
    if (!VALID_PROFILE_KEYS.has(key) || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out.length > 0 ? out : [DEFAULT_PROFILE]
}

/**
 * Extrage programele BAC din metadatele utilizatorului: preferă tabloul `profiles`,
 * dar acceptă și formatul vechi cu un singur câmp `profile` (compatibilitate).
 */
export function getProfilesFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return [DEFAULT_PROFILE]
  if (Array.isArray(metadata.profiles) && metadata.profiles.length > 0) {
    return normalizeProfilesList(metadata.profiles)
  }
  return [normalizeProfile(metadata.profile)]
}

const TARGET_GRADE_MAX = 10
// Nota-țintă minimă acceptată la salvare: orice valoare sub 5 este rescrisă la 5.
const TARGET_GRADE_MIN = 5
// În timpul tastării permitem cifre sub 5 (ex. „1” pe drumul către „10”); plafonul
// minim de 5 se aplică doar la normalizare (onBlur / salvare).
const TARGET_GRADE_INPUT_MIN = 0

/** Normalizează nota-țintă la format „X.XX”, limitată în intervalul 5–10. */
export function normalizeTargetGrade(value, fallback = '10.00') {
  // Acceptăm și virgula ca separator zecimal (uzual în România).
  const cleaned = String(value ?? '').trim().replace(',', '.')
  if (!cleaned) return fallback

  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return fallback

  const clamped = Math.min(TARGET_GRADE_MAX, Math.max(TARGET_GRADE_MIN, parsed))
  return clamped.toFixed(2)
}

/**
 * Restrânge live ce poate tasta utilizatorul în câmpul notă-țintă: doar cifre și
 * un punct zecimal, cu maximum 2 zecimale, plafonat superior la 10. Nu impune
 * minimul de 5 în timpul tastării (altfel „10” s-ar rupe: „1” ar fi rescris la
 * „5”) — minimul se aplică la `normalizeTargetGrade` (onBlur / salvare). Nu
 * forțează exact 2 zecimale, ca să nu strice tastarea în curs.
 */
export function constrainTargetGradeInput(value) {
  const cleaned = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...fraction] = cleaned.split('.')
  // Limităm la cel mult 2 zecimale chiar în timpul tastării.
  const decimals = fraction.join('').slice(0, 2)
  const normalized = fraction.length > 0 ? `${whole}.${decimals}` : whole

  if (!normalized || normalized === '.') return normalized

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return normalized
  if (parsed > TARGET_GRADE_MAX) return String(TARGET_GRADE_MAX)
  if (parsed < TARGET_GRADE_INPUT_MIN) return String(TARGET_GRADE_INPUT_MIN)

  return normalized
}

/**
 * Onboarding-ul de profil e necesar dacă utilizatorul nu a acceptat documentele
 * legale sau nu și-a ales încă explicit niciun program BAC.
 */
export function needsProfileSetup(user) {
  const metadata = user?.user_metadata ?? {}
  const hasLegal = Boolean(
    metadata.terms_accepted_at && metadata.privacy_accepted_at && metadata.legal_docs_version,
  )
  const hasExplicitProfile =
    (Array.isArray(metadata.profiles) && metadata.profiles.length > 0)
    || (typeof metadata.profile === 'string' && metadata.profile.length > 0)
  return !hasLegal || !hasExplicitProfile
}

export async function updateUserProfile(profileKey) {
  const safeProfile = normalizeProfile(profileKey)
  const { data, error } = await supabase.auth.updateUser({
    data: { profile: safeProfile, profiles: [safeProfile] },
  })
  if (error) throw error

  const { error: syncError } = await supabase.rpc('sync_user_enrolled_profiles', {
    p_profile_keys: [safeProfile],
  })
  if (syncError) throw syncError

  return data?.user ?? null
}

/** Sincronizează programele BAC în tabela server-side (sursa de adevăr pentru RLS). */
export async function syncEnrolledProfiles(profileKeys) {
  const list = normalizeProfilesList(profileKeys)
  const { data, error } = await supabase.rpc('sync_user_enrolled_profiles', {
    p_profile_keys: list,
  })
  if (error) throw error
  return Array.isArray(data) ? data : list
}
