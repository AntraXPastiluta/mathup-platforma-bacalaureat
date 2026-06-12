/**
 * Seria zilnică („streak”), calculată în zile calendaristice UTC.
 * O zi contează dacă utilizatorul se autentifică SAU finalizează o lecție în ziua
 * respectivă. Ratarea unei zile calendaristice întregi (fără login și fără
 * activitate de lecție) resetează seria la 0.
 *
 * Folosim UTC pentru a avea un calcul consistent al zilelor indiferent de fusul orar.
 */

import { supabase } from '../supabaseClient'

/** Data calendaristică UTC sub formă „YYYY-MM-DD”. */
export function utcCalendarDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/** Numărul de zile calendaristice între două date „YYYY-MM-DD”. */
export function calendarDaysBetween(earlierYmd, laterYmd) {
  // Ancorăm la ora 12:00 UTC ca să evităm erorile de o zi cauzate de DST/rotunjiri.
  const a = Date.parse(`${earlierYmd}T12:00:00.000Z`)
  const b = Date.parse(`${laterYmd}T12:00:00.000Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

/**
 * Dacă ultima zi de activitate e cu cel puțin 2 zile calendaristice în urmă,
 * utilizatorul a ratat o zi întreagă → seria se resetează la 0.
 */
export function streakDecayPatch(metadata) {
  const last = metadata?.last_streak_activity_date
  if (!last || typeof last !== 'string') return null
  const today = utcCalendarDateString()
  const gap = calendarDaysBetween(last, today)
  if (gap < 2) return null
  const streak = Number(metadata?.streak)
  if (!Number.isFinite(streak) || streak <= 0) return null
  return { streak: 0 }
}

/**
 * Aplică o activitate care contează pentru serie (după ce decay-ul a fost deja
 * integrat în metadate).
 *
 * @param {object} metadata - Metadatele curente ale utilizatorului.
 * @param {'login' | 'lesson'} activity - Tipul activității care declanșează actualizarea.
 */
export function streakActivityPatch(metadata, activity) {
  const today = utcCalendarDateString()
  const m = metadata || {}
  let streak = Number(m.streak)
  if (!Number.isFinite(streak)) streak = 0
  const last = m.last_streak_activity_date

  const patch = {}
  if (activity === 'lesson') {
    patch.last_lesson_activity_date = today
  }

  if (last === today) {
    // Seria a fost deja contorizată azi; nu rescriem timestamp-ul de login ca să evităm
    // actualizări inutile ale metadatelor la fiecare încărcare de pagină.
    return activity === 'lesson' ? patch : {}
  }

  if (activity === 'login') {
    patch.last_login_at = new Date().toISOString()
  }

  if (!last) {
    patch.streak = 1
    patch.last_streak_activity_date = today
    return patch
  }

  const gap = calendarDaysBetween(last, today)
  if (gap === 1) {
    // Zi consecutivă → seria crește.
    patch.streak = streak + 1
    patch.last_streak_activity_date = today
  } else if (gap >= 2) {
    // S-a sărit cel puțin o zi întreagă → seria repornește de la 1.
    patch.streak = 1
    patch.last_streak_activity_date = today
  } else if (gap <= 0) {
    // Ceas/dată derulate înapoi (gap negativ): doar reancorăm ziua, fără a modifica seria.
    patch.last_streak_activity_date = today
  }
  return patch
}

/** Combină decay + activitate de login într-un singur patch de metadate. */
export function mergeStreakMetadataForLogin(metadata) {
  const base = { ...(metadata || {}) }
  // Aplicăm întâi eventualul decay, apoi activitatea, ca seria să fie corectă
  // chiar dacă utilizatorul a lipsit între timp.
  const decay = streakDecayPatch(base)
  if (decay) Object.assign(base, decay)
  const act = streakActivityPatch(base, 'login')
  return { ...(decay || {}), ...act }
}

/** Combină decay + activitate de lecție într-un singur patch de metadate. */
export function mergeStreakMetadataForLesson(metadata) {
  const base = { ...(metadata || {}) }
  const decay = streakDecayPatch(base)
  if (decay) Object.assign(base, decay)
  const act = streakActivityPatch(base, 'lesson')
  return { ...(decay || {}), ...act }
}

/** True dacă patch-ul conține efectiv modificări de salvat. */
export function hasStreakUpdates(patch) {
  return patch && typeof patch === 'object' && Object.keys(patch).length > 0
}

// Calculează patch-ul pentru utilizatorul curent și îl salvează în metadate doar
// dacă există schimbări, evitând astfel scrieri inutile.
async function persistStreakPatch(mergeFn) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const patch = mergeFn(user.user_metadata || {})
  if (!hasStreakUpdates(patch)) return user

  const { data, error: updateError } = await supabase.auth.updateUser({ data: patch })
  if (updateError) throw updateError
  return data?.user ?? user
}

/** Deschiderea aplicației cu o sesiune validă contează drept login pentru serie. */
export async function persistLoginStreakFromSession() {
  return persistStreakPatch(mergeStreakMetadataForLogin)
}

/** De apelat după finalizarea unei lecții (folosește utilizatorul din sesiunea curentă). */
export async function persistLessonStreakFromSession() {
  return persistStreakPatch(mergeStreakMetadataForLesson)
}
