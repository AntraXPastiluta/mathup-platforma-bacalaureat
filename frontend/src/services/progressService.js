import { supabase } from '../supabaseClient'
import { persistLessonStreakFromSession } from './streakService'
import { requireAuthenticatedUser, requireSelfUserId } from './sessionGuard'

export async function getUserProgress(userId) {
  await requireSelfUserId(userId)
  const { data, error } = await supabase
    .from('user_progress')
    .select('lesson_id,completed,score,last_accessed')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function markLessonCompleted({ lessonId, score = null }) {
  const user = await requireAuthenticatedUser()
  const payload = {
    user_id: user.id,
    lesson_id: lessonId,
    completed: true,
    last_accessed: new Date().toISOString(),
  }
  if (typeof score === 'number' && Number.isFinite(score)) {
    payload.score = Math.min(100, Math.max(0, score))
  }

  const { error } = await supabase
    .from('user_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })

  if (error) throw error

  const updatedUser = await persistLessonStreakFromSession()
  return updatedUser
}
