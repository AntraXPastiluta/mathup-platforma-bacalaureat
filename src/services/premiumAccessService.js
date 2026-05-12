import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'
import { normalizeProfilesList } from './profileService'

export function isLessonPremium(lesson) {
  if (!lesson) return false
  if (lesson.is_premium) return true
  return (lesson.subject_part ?? 1) === 3
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

export function canAccessLessonContent(lesson, isPremium) {
  return isPremium || !isLessonPremium(lesson)
}

export function canAccessLessonPart(lesson, partIndex, isPremium) {
  if (isPremium) return true
  if (isLessonPremium(lesson)) return partIndex < getPreviewPartCount(lesson)
  return true
}

export function canAccessQuiz(_lesson, isPremium) {
  return isPremium
}

export function canAccessLessonFiles(_lesson, isPremium) {
  return isPremium
}

export function canDownloadSolvedContent(isPremium) {
  return isPremium
}

export function canTrackLessonCompletion(lesson, isPremium) {
  return isPremium || !isLessonPremium(lesson)
}
