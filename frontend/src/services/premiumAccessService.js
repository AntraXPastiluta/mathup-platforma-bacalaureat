import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'
import { normalizeProfilesList } from './profileService'

/** Lecțiile cu `subject_part === 3` sunt accesibile gratuit (inclusiv din toate programele), indiferent de `is_premium`. */
function isSubjectThreeLesson(lesson) {
  return Number(lesson?.subject_part) === 3
}

function isLessonInUserPrograms(lesson, activeProfiles) {
  if (!lesson?.profile) return false
  return normalizeProfilesList(activeProfiles).includes(lesson.profile)
}

/** Acces complet: toate părțile, quiz, fișiere (program înregistrat, Premium sau Subiectul III). */
function hasFullLessonAccess(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  if (isPremium) return true
  if (isSubjectThreeLesson(lesson)) return true
  return isLessonInUserPrograms(lesson, activeProfiles)
}

export function isLessonPremium(lesson) {
  return Boolean(lesson?.is_premium)
}

export function canAccessLessonForUser(lesson, isPremium, activeProfiles) {
  return hasFullLessonAccess(lesson, isPremium, activeProfiles)
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

export function canAccessLessonContent(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  if (hasFullLessonAccess(lesson, isPremium, activeProfiles)) return true
  if (isLessonPremium(lesson)) return false
  return false
}

export function canAccessLessonPart(lesson, partIndex, isPremium, activeProfiles) {
  if (!lesson) return false
  if (hasFullLessonAccess(lesson, isPremium, activeProfiles)) return true
  if (!canAccessLessonContent(lesson, isPremium, activeProfiles)) return false
  return partIndex < getPreviewPartCount(lesson)
}

export function canAccessQuiz(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  return hasFullLessonAccess(lesson, isPremium, activeProfiles)
}

export function canAccessLessonFiles(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  return hasFullLessonAccess(lesson, isPremium, activeProfiles)
}

export function canAccessSolvedVariants(isPremium) {
  return Boolean(isPremium)
}

export function canDownloadSolvedContent(isPremium) {
  return Boolean(isPremium)
}

export function canTrackLessonCompletion(lesson, isPremium, activeProfiles) {
  if (!lesson) return false
  return hasFullLessonAccess(lesson, isPremium, activeProfiles)
}

export function maskLessonForAccess(lesson, { isPremium, activeProfiles }) {
  if (!lesson) return null
  if (!canAccessLessonForUser(lesson, isPremium, activeProfiles)) return null

  const masked = { ...lesson }
  const fullAccess = hasFullLessonAccess(lesson, isPremium, activeProfiles)
  const previewCount = getPreviewPartCount(lesson)

  if (!fullAccess && Array.isArray(lesson.lesson_parts)) {
    masked.lesson_parts = lesson.lesson_parts.filter((_, index) => index < previewCount)
  }

  if (!canAccessLessonFiles(lesson, isPremium, activeProfiles)) {
    masked.lesson_files = []
  }

  if (!canAccessQuiz(lesson, isPremium, activeProfiles)) {
    masked.quiz_questions = []
  }

  return masked
}
