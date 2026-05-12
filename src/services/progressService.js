import { supabase } from '../supabaseClient'
import { persistLessonStreakFromSession } from './streakService'

export async function getUserProgress(userId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('lesson_id,completed,score,last_accessed')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function markLessonCompleted({ userId, lessonId, score = null }) {
  const payload = {
    user_id: userId,
    lesson_id: lessonId,
    completed: true,
    last_accessed: new Date().toISOString(),
  }
  if (typeof score === 'number' && Number.isFinite(score)) {
    payload.score = score
  }

  const { error } = await supabase
    .from('user_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })

  if (error) throw error

  await persistLessonStreakFromSession()
}
