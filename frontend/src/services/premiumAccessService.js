/**
 * Reguli de acces la conținut (funcții pure, fără rețea). Decide ce poate vedea
 * sau descărca un utilizator în funcție de: statutul Premium, programele la care
 * e înscris și regula specială pentru Subiectul III (gratuit pentru toți).
 * `maskLessonForAccess` aplică aceste reguli ascunzând conținutul neautorizat.
 */
import { DEFAULT_PROFILE, PROFILES } from '../features/lessons/profiles'
import { normalizeProfilesList } from './profileService'

/** Lecțiile cu `subject_part === 3` sunt accesibile gratuit (inclusiv din toate programele), indiferent de `is_premium`. */
function isSubjectThreeLesson(lesson) {
  return Number(lesson?.subject_part) === 3
}

function isLessonInUserPrograms(lesson, activeProfiles) {
  // O lecție poate aparține mai multor programe; e accesibilă dacă utilizatorul e
  // înscris la cel puțin unul dintre ele (intersecția listelor de profiluri).
  if (!Array.isArray(lesson?.profiles) || lesson.profiles.length === 0) return false
  const registered = new Set(normalizeProfilesList(activeProfiles))
  return normalizeProfilesList(lesson.profiles).some((key) => registered.has(key))
}

/**
 * Programul prin care elevul vede o lecție. Părțile și quiz-ul sunt separate per
 * program, așa că trebuie ales unul singur: programul la care elevul e înscris (primul
 * potrivit), iar dacă niciunul nu se potrivește (ex. premium neînscris), primul program
 * al lecției.
 */
export function getViewProfile(lesson, activeProfiles) {
  const lessonProfiles = normalizeProfilesList(lesson?.profiles)
  const registered = normalizeProfilesList(activeProfiles)
  return lessonProfiles.find((key) => registered.includes(key)) ?? lessonProfiles[0]
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

/** Acces la o anumită parte a lecției: fie acces complet, fie doar părțile de previzualizare. */
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

// Returnează o copie a lecției din care s-au eliminat părțile/fișierele/quiz-ul la care
// utilizatorul nu are drept, ca să nu trimitem niciodată conținut blocat către client.
// Pentru previzualizare păstrăm doar primele `previewCount` părți.
export function maskLessonForAccess(lesson, { isPremium, activeProfiles }) {
  if (!lesson) return null
  if (!canAccessLessonForUser(lesson, isPremium, activeProfiles)) return null

  const masked = { ...lesson }
  const fullAccess = hasFullLessonAccess(lesson, isPremium, activeProfiles)
  const previewCount = getPreviewPartCount(lesson)

  // Părțile și quiz-ul sunt separate per program: păstrăm doar versiunea programului
  // de vizualizare al elevului, NU și ale celorlalte programe ale lecției.
  const viewProfile = getViewProfile(lesson, activeProfiles)

  if (Array.isArray(lesson.lesson_parts)) {
    let visibleParts = lesson.lesson_parts.filter((part) => part.profile === viewProfile)
    if (!fullAccess) {
      visibleParts = visibleParts.filter((_, index) => index < previewCount)
    }
    masked.lesson_parts = visibleParts
  }

  if (Array.isArray(lesson.quiz_questions)) {
    masked.quiz_questions = canAccessQuiz(lesson, isPremium, activeProfiles)
      ? lesson.quiz_questions.filter((question) => question.profile === viewProfile)
      : []
  }

  // Fișierele sunt comune tuturor programelor; se ascund doar dacă nu există acces.
  if (!canAccessLessonFiles(lesson, isPremium, activeProfiles)) {
    masked.lesson_files = []
  }

  return masked
}
