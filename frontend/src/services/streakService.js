/**
 * Daily streak (UTC calendar days).
 * A day counts if the user logs in OR completes a lesson that day.
 * Missing a full calendar day (no login and no lesson activity) resets streak to 0.
 */

import { supabase } from '../supabaseClient'

export function utcCalendarDateString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function calendarDaysBetween(earlierYmd, laterYmd) {
  const a = Date.parse(`${earlierYmd}T12:00:00.000Z`)
  const b = Date.parse(`${laterYmd}T12:00:00.000Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

/**
 * If the last streak day is at least 2 calendar days before today, the user missed a full day → streak 0.
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
 * Apply qualifying activity for streak (after decay is merged into metadata).
 * @param {'login' | 'lesson'} activity
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
    // Streak already counted today; skip login timestamp to avoid metadata churn on every page load.
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
    patch.streak = streak + 1
    patch.last_streak_activity_date = today
  } else if (gap >= 2) {
    patch.streak = 1
    patch.last_streak_activity_date = today
  } else if (gap <= 0) {
    patch.last_streak_activity_date = today
  }
  return patch
}

export function mergeStreakMetadataForLogin(metadata) {
  const base = { ...(metadata || {}) }
  const decay = streakDecayPatch(base)
  if (decay) Object.assign(base, decay)
  const act = streakActivityPatch(base, 'login')
  return { ...(decay || {}), ...act }
}

export function mergeStreakMetadataForLesson(metadata) {
  const base = { ...(metadata || {}) }
  const decay = streakDecayPatch(base)
  if (decay) Object.assign(base, decay)
  const act = streakActivityPatch(base, 'lesson')
  return { ...(decay || {}), ...act }
}

export function hasStreakUpdates(patch) {
  return patch && typeof patch === 'object' && Object.keys(patch).length > 0
}

async function persistStreakPatch(mergeFn) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const patch = mergeFn(user.user_metadata || {})
  if (!hasStreakUpdates(patch)) return user

  const { data, error: updateError } = await supabase.auth.updateUser({ data: patch })
  if (updateError) throw updateError
  return data?.user ?? user
}

/** Opening the app with a valid session counts as login for the streak. */
export async function persistLoginStreakFromSession() {
  return persistStreakPatch(mergeStreakMetadataForLogin)
}

/** Call after marking a lesson complete (uses current session user). */
export async function persistLessonStreakFromSession() {
  return persistStreakPatch(mergeStreakMetadataForLesson)
}
