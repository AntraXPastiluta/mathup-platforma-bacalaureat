import { supabase } from '../supabaseClient'

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

export async function recordQuizMistake({ lessonId, questionId }) {
  return recordQuizAttempt({ lessonId, questionId, isCorrect: false })
}

export async function getQuizMistakeCount(userId) {
  const { data, error } = await supabase
    .from('user_quiz_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('is_correct', false)

  if (error) throw error
  return countDistinctQuestions(data)
}

export async function getQuizCorrectCount(userId) {
  const { data, error } = await supabase
    .from('user_quiz_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('is_correct', true)

  if (error) throw error
  return countDistinctQuestions(data)
}
