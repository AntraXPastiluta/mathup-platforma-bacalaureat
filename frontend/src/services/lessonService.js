/**
 * Citirea lecțiilor pentru elevi. Spre deosebire de adminService, aici se aplică
 * reguli de acces: elevii primesc un set restrâns de coloane la quiz, iar
 * conținutul premium e mascat în funcție de drepturile utilizatorului.
 */
import { supabase } from '../supabaseClient'
import { DEFAULT_PROFILE } from '../features/lessons/profiles'
import { normalizeProfile, normalizeProfilesList } from './profileService'
import { checkCurrentUserIsAdmin } from './curriculumAdminService'
import { maskLessonForAccess } from './premiumAccessService'

// Elevii citesc quiz-ul prin view-ul `quiz_questions_student` (fără correct_option_index).
const LESSON_COLUMNS = 'id,title,content,video_url,difficulty,order_index,profile,subject_part,is_premium,preview_part_count'

/** Returnează lecțiile unui singur program (profil), ordonate pe subiect și index. */
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

/** Lecțiile pentru unul sau mai multe programe BAC (profiluri). Opțional adaugă și
 *  lecțiile de Subiectul III din toate programele (acces gratuit global). */
export async function getLessonsForProfiles(profileKeys, options = {}) {
  const { includeSubjectThreeForAllProfiles = false } = options
  const keys = normalizeProfilesList(profileKeys)
  let query = supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*)`)
    .order('subject_part', { ascending: true })
    .order('order_index', { ascending: true })

  if (keys.length === 1) {
    query = query.eq('profile', keys[0])
  } else if (keys.length > 1) {
    query = query.in('profile', keys)
  } else {
    query = query.eq('profile', DEFAULT_PROFILE)
  }

  const { data, error } = await query
  if (error) throw error
  const mainList = data ?? []

  if (!includeSubjectThreeForAllProfiles) {
    return mainList
  }

  const { data: subjectThreeLessons, error: s3Error } = await supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*)`)
    .eq('subject_part', 3)
    .order('profile', { ascending: true })
    .order('order_index', { ascending: true })

  if (s3Error) throw s3Error
  // Deduplicare: lecțiile de Subiectul III pot apărea deja în lista principală
  // dacă fac parte din programele utilizatorului; le adăugăm doar pe cele noi.
  const seen = new Set(mainList.map((l) => l.id))
  const merged = [...mainList]
  for (const lesson of subjectThreeLessons ?? []) {
    if (!seen.has(lesson.id)) {
      seen.add(lesson.id)
      merged.push(lesson)
    }
  }
  return merged
}

/**
 * Încarcă o lecție completă (părți, fișiere, quiz). Dacă `accessContext` e dat,
 * rezultatul e mascat conform drepturilor utilizatorului (Premium/program).
 *
 * @param {string} lessonId
 * @param {{ isPremium: boolean, activeProfiles: string[] } | null} accessContext
 */
export async function getLessonById(lessonId, accessContext = null) {
  // Doar adminii primesc toate coloanele quiz-ului (inclusiv răspunsul corect). Elevii
  // primesc un set restrâns de coloane, ca să nu poată extrage răspunsurile din rețea.
  const isAdmin = await checkCurrentUserIsAdmin().catch(() => false)
  const quizSelect = isAdmin
    ? 'quiz_questions(*)'
    : 'quiz_questions:quiz_questions_student(*)'

  const { data, error } = await supabase
    .from('lessons')
    .select(`${LESSON_COLUMNS}, lesson_parts(*), lesson_files(*), ${quizSelect}`)
    .eq('id', lessonId)
    .order('order_index', { foreignTable: 'lesson_parts', ascending: true })
    .order('created_at', { foreignTable: 'quiz_questions', ascending: true })
    .single()

  if (error) throw error
  if (!accessContext) return data
  return maskLessonForAccess(data, accessContext)
}
