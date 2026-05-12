import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'
import { normalizeProfilesList } from './profileService'

export function isLessonPremium() {
  return false
}

export function canAccessLessonForUser(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  if (isPremium) return true
  return normalizeProfilesList(activeProfiles).includes(lesson.profile)
}

export function canAccessProgram(profileKey, isPremium, activeProfiles) {
  if (isPremium) return true
  const registered = normalizeProfilesList(activeProfiles)
  if (registered.length > 0) return registered.includes(profileKey)
  return profileKey === DEFAULT_PROFILE
}

export function getSelectablePrograms(isPremium, activeProfiles) {
  if (isPremium) return PROFILES
  const registered = normalizeProfilesList(activeProfiles)
  return PROFILES.filter((profile) => registered.includes(profile.key))
}

export function getPreviewPartCount(lesson) {
  const count = Number(lesson?.preview_part_count)
  if (!Number.isFinite(count) || count < 1) return 1
  return count
}

export function canAccessLessonContent() {
  return true
}

export function canAccessLessonPart() {
  return true
}

export function canAccessQuiz() {
  return true
}

export function canAccessLessonFiles() {
  return true
}

export function canAccessSolvedVariants(isPremium) {
  return Boolean(isPremium)
}

export function canDownloadSolvedContent(isPremium) {
  return Boolean(isPremium)
}

export function canTrackLessonCompletion() {
  return true
}
