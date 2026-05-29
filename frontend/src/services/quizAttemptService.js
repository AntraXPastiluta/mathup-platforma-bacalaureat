/**
 * Răspunsuri la quiz: verificarea corectitudinii și înregistrarea încercărilor.
 * Verificarea răspunsului se face server-side (RPC), pentru a nu expune răspunsul
 * corect în client; tabela locală reține doar dacă utilizatorul a nimerit sau nu.
 */
import { supabase } from '../supabaseClient'
import { requireSelfUserId } from './sessionGuard'

/**
 * Trimite răspunsul ales la o întrebare și returnează dacă a fost corect.
 * Logica de verificare rulează în baza de date (RPC `submit_quiz_answer`).
 */
export async function submitQuizAnswer({ questionId, selectedIndex }) {
  const { data, error } = await supabase.rpc('submit_quiz_answer', {
    p_question_id: questionId,
    p_selected_index: selectedIndex,
  })

  if (error) throw error
  return Boolean(data?.correct)
}

// Numără întrebările unice (un utilizator poate avea o singură încercare per întrebare).
function countDistinctQuestions(rows) {
  return new Set((rows ?? []).map((row) => row.question_id)).size
}

/**
 * Înregistrează (sau actualizează) încercarea utilizatorului la o întrebare.
 * Păstrăm o singură încercare per întrebare, deci facem update dacă există deja.
 */
export async function recordQuizAttempt({ lessonId, questionId, isCorrect }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user?.id) return

  const { data: existing, error: lookupError } = await supabase
    .from('user_quiz_attempts')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .limit(1)
    .maybeSingle()

  if (lookupError) throw lookupError

  const payload = {
    lesson_id: lessonId,
    is_correct: Boolean(isCorrect),
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('user_quiz_attempts')
      .update(payload)
      .eq('id', existing.id)

    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('user_quiz_attempts')
    .insert([{
      user_id: user.id,
      question_id: questionId,
      ...payload,
    }])

  if (error) throw error
}

/** Scurtătură pentru înregistrarea unei greșeli (răspuns incorect). */
export async function recordQuizMistake({ lessonId, questionId }) {
  return recordQuizAttempt({ lessonId, questionId, isCorrect: false })
}

/** Numărul de întrebări la care utilizatorul a greșit (distincte). */
export async function getQuizMistakeCount(userId) {
  await requireSelfUserId(userId)
  const { data, error } = await supabase
    .from('user_quiz_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('is_correct', false)

  if (error) throw error
  return countDistinctQuestions(data)
}

/** Numărul de întrebări la care utilizatorul a răspuns corect (distincte). */
export async function getQuizCorrectCount(userId) {
  await requireSelfUserId(userId)
  const { data, error } = await supabase
    .from('user_quiz_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('is_correct', true)

  if (error) throw error
  return countDistinctQuestions(data)
}
