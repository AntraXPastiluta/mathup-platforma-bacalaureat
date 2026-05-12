import { supabase } from '../supabaseClient'

export async function getUserRoadmaps(userId) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('user_study_roadmaps')
    .select('*, user_study_roadmap_subjects(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('subject_part', { foreignTable: 'user_study_roadmap_subjects', ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createUserRoadmap({ userId, title }) {
  const { data, error } = await supabase
    .from('user_study_roadmaps')
    .insert([{ user_id: userId, title }])
    .select('*, user_study_roadmap_subjects(*)')
    .single()

  if (error) throw error
  return data
}

export async function updateUserRoadmap(id, updates) {
  const { data, error } = await supabase
    .from('user_study_roadmaps')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, user_study_roadmap_subjects(*)')
    .single()

  if (error) throw error
  return data
}

export async function deleteUserRoadmap(id) {
  const { error } = await supabase
    .from('user_study_roadmaps')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function replaceUserRoadmapSubjects(roadmapId, subjects) {
  const { error: deleteError } = await supabase
    .from('user_study_roadmap_subjects')
    .delete()
    .eq('roadmap_id', roadmapId)

  if (deleteError) throw deleteError
  if (subjects.length === 0) return []

  const payload = subjects.map((subject) => ({
    roadmap_id: roadmapId,
    subject_part: subject.subject_part,
    importance_grade: subject.importance_grade,
    position_x: subject.position_x,
    position_y: subject.position_y,
  }))

  const { data, error } = await supabase
    .from('user_study_roadmap_subjects')
    .insert(payload)
    .select('*')
    .order('subject_part', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function saveUserRoadmapWorkspace({ roadmapId, title, subjects }) {
  const roadmap = await updateUserRoadmap(roadmapId, { title })
  const savedSubjects = await replaceUserRoadmapSubjects(roadmapId, subjects)
  return { ...roadmap, user_study_roadmap_subjects: savedSubjects }
}
