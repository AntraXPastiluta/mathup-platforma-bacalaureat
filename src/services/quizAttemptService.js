import { supabase } from '../supabaseClient'

export async function recordQuizMistake({ lessonId, questionId }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user?.id) return

  const { error } = await supabase
    .from('user_quiz_attempts')
    .insert([{
      user_id: user.id,
      lesson_id: lessonId,
      question_id: questionId,
      is_correct: false,
    }])

  if (error) throw error
}

export async function getQuizMistakeCount(userId) {
  const { count, error } = await supabase
    .from('user_quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_correct', false)

  if (error) throw error
  return count ?? 0
}
