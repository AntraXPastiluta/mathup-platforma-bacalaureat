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

export async function updateUserProfile(profileKey) {
  const safeProfile = normalizeProfile(profileKey)
  const { data, error } = await supabase.auth.updateUser({
    data: { profile: safeProfile, profiles: [safeProfile] },
  })
  if (error) throw error
  return data?.user ?? null
}
