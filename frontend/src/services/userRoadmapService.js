import { supabase } from '../supabaseClient'
import { requireAuthenticatedUser, requireSelfUserId } from './sessionGuard'

async function requireOwnedRoadmap(roadmapId) {
  const user = await requireAuthenticatedUser()
  const { data, error } = await supabase
    .from('user_study_roadmaps')
    .select('id, user_id')
    .eq('id', roadmapId)
    .maybeSingle()

  if (error) throw error
  if (!data || data.user_id !== user.id) {
    throw new Error('Acces neautorizat.')
  }
  return user
}

export async function getUserRoadmaps(userId) {
  await requireSelfUserId(userId)
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

export async function createUserRoadmap({ title }) {
  const user = await requireAuthenticatedUser()
  const { data, error } = await supabase
    .from('user_study_roadmaps')
    .insert([{ user_id: user.id, title }])
    .select('*, user_study_roadmap_subjects(*)')
    .single()

  if (error) throw error
  return data
}

export async function updateUserRoadmap(id, updates) {
  await requireOwnedRoadmap(id)
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
  await requireOwnedRoadmap(id)
  const { error } = await supabase
    .from('user_study_roadmaps')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function replaceUserRoadmapSubjects(roadmapId, subjects) {
  await requireOwnedRoadmap(roadmapId)
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
