/**
 * Progresul elevului pe lecții: citirea progresului și marcarea unei lecții ca
 * finalizată. Finalizarea actualizează și seria zilnică („streak”).
 */
import { supabase } from '../supabaseClient'
import { persistLessonStreakFromSession } from './streakService'
import { requireAuthenticatedUser, requireSelfUserId } from './sessionGuard'

/** Returnează progresul propriu al utilizatorului (gardă: doar pentru propriul cont). */
export async function getUserProgress(userId) {
  await requireSelfUserId(userId)
  const { data, error } = await supabase
    .from('user_progress')
    .select('lesson_id,completed,score,last_accessed')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

/**
 * Marchează o lecție drept finalizată (upsert, idempotent) și actualizează seria.
 *
 * @param {{ lessonId: string, score?: number|null }} params - Scorul, dacă e dat, e plafonat la 0–100.
 * @returns Utilizatorul actualizat după recalcularea seriei.
 */
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

  // Upsert pe (user_id, lesson_id): re-finalizarea aceleiași lecții doar actualizează rândul.
  const { error } = await supabase
    .from('user_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })

  if (error) throw error

  const updatedUser = await persistLessonStreakFromSession()
  return updatedUser
}
