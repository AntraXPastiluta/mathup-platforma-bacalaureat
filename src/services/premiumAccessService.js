import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'
import { normalizeProfilesList } from './profileService'

export function isLessonPremium(lesson) {
  return Boolean(lesson?.is_premium)
}

export function canAccessLessonForUser(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  if (isPremium) return true
  if (isLessonPremium(lesson)) return false
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
  if (!lesson) return false
  return isPremium || !isLessonPremium(lesson)
}

export function canAccessLessonPart(lesson, partIndex, isPremium) {
  if (!lesson) return false
  if (isPremium) return true
  if (!canAccessLessonContent(lesson, isPremium)) return false
  return partIndex < getPreviewPartCount(lesson)
}

export function canAccessQuiz(lesson, isPremium) {
  if (!lesson) return false
  return isPremium
}

export function canAccessLessonFiles(lesson, isPremium) {
  if (!lesson) return false
  return isPremium
}

export function canAccessSolvedVariants(isPremium) {
  return Boolean(isPremium)
}

export function canDownloadSolvedContent(isPremium) {
  return Boolean(isPremium)
}

export function canTrackLessonCompletion(lesson, isPremium) {
  if (!lesson) return false
  if (isPremium) return true
  return !isLessonPremium(lesson)
}

export function maskLessonForAccess(lesson, { isPremium, activeProfiles }) {
  if (!lesson) return null
  if (!canAccessLessonForUser(lesson, isPremium, activeProfiles)) return null

  const masked = { ...lesson }
  const previewCount = getPreviewPartCount(lesson)

  if (!isPremium && Array.isArray(lesson.lesson_parts)) {
    masked.lesson_parts = lesson.lesson_parts.filter((_, index) => index < previewCount)
  }

  if (!canAccessLessonFiles(lesson, isPremium)) {
    masked.lesson_files = []
  }

  if (!canAccessQuiz(lesson, isPremium)) {
    masked.quiz_questions = []
  }

  return masked
}
