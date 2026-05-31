/**
 * Răspunsuri la quiz: verificarea corectitudinii și citirea încercărilor.
 * Scrierile rulează exclusiv prin RPC `submit_quiz_answer` (server-side).
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

function countDistinctQuestions(rows) {
  return new Set((rows ?? []).map((row) => row.question_id)).size
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
