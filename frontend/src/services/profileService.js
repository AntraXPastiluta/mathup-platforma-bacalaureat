import { supabase } from '../supabaseClient'
import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'

const VALID_PROFILE_KEYS = new Set(PROFILES.map((profile) => profile.key))

export function normalizeProfile(value) {
  if (typeof value === 'string' && VALID_PROFILE_KEYS.has(value)) {
    return value
  }
  return DEFAULT_PROFILE
}

/** Dedupe, keep only valid keys, preserve order; default to one program if empty. */
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
 * High school programs from user metadata: `profiles` array, or legacy single `profile`.
 */
export function getProfilesFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return [DEFAULT_PROFILE]
  if (Array.isArray(metadata.profiles) && metadata.profiles.length > 0) {
    return normalizeProfilesList(metadata.profiles)
  }
  return [normalizeProfile(metadata.profile)]
}

const TARGET_GRADE_MAX = 10
const TARGET_GRADE_MIN = 0

export function normalizeTargetGrade(value, fallback = '10.00') {
  const cleaned = String(value ?? '').trim().replace(',', '.')
  if (!cleaned) return fallback

  const parsed = Number.parseFloat(cleaned)
  if (!Number.isFinite(parsed)) return fallback

  const clamped = Math.min(TARGET_GRADE_MAX, Math.max(TARGET_GRADE_MIN, parsed))
  return clamped.toFixed(2)
}

export function constrainTargetGradeInput(value) {
  const cleaned = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const [whole, ...fraction] = cleaned.split('.')
  const normalized = fraction.length > 0 ? `${whole}.${fraction.join('')}` : whole

  if (!normalized || normalized === '.') return normalized

  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return normalized
  if (parsed > TARGET_GRADE_MAX) return String(TARGET_GRADE_MAX)
  if (parsed < TARGET_GRADE_MIN) return String(TARGET_GRADE_MIN)

  return normalized
}

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
  return data?.user ?? null
}
