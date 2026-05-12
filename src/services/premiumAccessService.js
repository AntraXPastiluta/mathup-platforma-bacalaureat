import { DEFAULT_PROFILE } from '../features/lessons/profiles'

export function isLessonPremium(lesson) {
  if (!lesson) return false
  if (lesson.is_premium) return true
  if ((lesson.subject_part ?? 1) === 3) return true
  return lesson.profile !== DEFAULT_PROFILE
}

export function canAccessProgram(profileKey, isPremium) {
  if (isPremium) return true
  return profileKey === DEFAULT_PROFILE
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
