import { supabase } from '../supabaseClient'
import { checkCurrentUserIsAdmin } from './curriculumAdminService'

const MAX_LESSON_FILE_BYTES = 20 * 1024 * 1024
const ALLOWED_LESSON_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx'])

async function requireCurriculumAdmin() {
  const isAdmin = await checkCurrentUserIsAdmin()
  if (!isAdmin) {
    throw new Error('Acces neautorizat.')
  }
}

/**
 * Admin Service for managing lessons, quizzes, and files.
 * 
 * Required DB Tables (SQL to run in Supabase):
 * 
 * -- Quiz Questions Table
 * CREATE TABLE IF NOT EXISTS public.quiz_questions (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
 *   question_text text NOT NULL,
 *   options jsonb NOT NULL, -- Array of strings
 *   correct_option_index integer NOT NULL,
 *   image_url text,
 *   created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 * 
 * -- Lesson Files Table
 * CREATE TABLE IF NOT EXISTS public.lesson_files (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
 *   file_name text NOT NULL,
 *   file_url text NOT NULL,
 *   file_type text,
 *   is_solved_content boolean NOT NULL DEFAULT false,
 *   created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 */

export async function getAllLessonsAdmin() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('profile', { ascending: true })
    .order('subject_part', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function addLesson(lesson) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('lessons')
    .insert([lesson])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLesson(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateLesson(lessonId, updates) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', lessonId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getQuizQuestions(lessonId) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addQuizQuestion(question) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('quiz_questions')
    .insert([question])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateQuizQuestion(id, updates) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('quiz_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteQuizQuestion(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('quiz_questions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getLessonFiles(lessonId) {
  const { data, error } = await supabase
    .from('lesson_files')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function addLessonFile(fileData) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('lesson_files')
    .insert([fileData])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLessonFile(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('lesson_files')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getProgramSolvedVariants(profile) {
  let query = supabase
    .from('program_solved_variants')
    .select('id, profile, file_name, file_url, file_type, created_at')
    .order('created_at', { ascending: false })

  if (profile) {
    query = query.eq('profile', profile)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function addProgramSolvedVariant(variant) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('program_solved_variants')
    .insert([variant])
    .select('id, profile, file_name, file_url, file_type, created_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteProgramSolvedVariant(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('program_solved_variants')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getLessonParts(lessonId) {
  const { data, error } = await supabase
    .from('lesson_parts')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data
}

export async function addLessonPart(part) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('lesson_parts')
    .insert([part])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLessonPart(id, updates) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('lesson_parts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLessonPart(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('lesson_parts')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function uploadFileToStorage(file) {
  await requireCurriculumAdmin()

  if (!file || file.size > MAX_LESSON_FILE_BYTES) {
    throw new Error('Fișierul este prea mare sau invalid.')
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase()
  if (!fileExt || !ALLOWED_LESSON_EXTENSIONS.has(fileExt)) {
    throw new Error('Tipul de fișier nu este permis.')
  }

  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `lesson-materials/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('materials')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage
    .from('materials')
    .getPublicUrl(filePath)

  return {
    url: data.publicUrl,
    path: filePath,
    name: file.name,
    type: file.type
  }
}
