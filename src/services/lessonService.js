import { supabase } from '../supabaseClient'
import { DEFAULT_PROFILE } from '../features/lessons/profiles'
import { normalizeProfile, normalizeProfilesList } from './profileService'

const LESSON_COLUMNS = 'id,title,content,video_url,difficulty,order_index,profile,subject_part,is_premium,preview_part_count'

export async function getLessons(profile = DEFAULT_PROFILE) {
  const safeProfile = normalizeProfile(profile)
  const { data, error } = await supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*)`)
    .eq('profile', safeProfile)
    .order('subject_part', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Lessons for one or more BAC programs (profiles). */
export async function getLessonsForProfiles(profileKeys) {
  const keys = normalizeProfilesList(profileKeys)
  let query = supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*)`)
    .order('subject_part', { ascending: true })
    .order('order_index', { ascending: true })

  if (keys.length === 1) {
    query = query.eq('profile', keys[0])
  } else {
    query = query.in('profile', keys)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getLessonById(lessonId) {
  const { data, error } = await supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*), lesson_files(*), quiz_questions(*)`)
    .eq('id', lessonId)
    .order('order_index', { foreignTable: 'lesson_parts', ascending: true })
    .order('created_at', { foreignTable: 'quiz_questions', ascending: true })
    .single()

  if (error) throw error
  return data
}
