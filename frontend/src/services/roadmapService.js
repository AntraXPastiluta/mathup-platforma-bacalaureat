import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin } from './curriculumAdminService'

export async function getRoadmapsForProfile(profile) {
  const { data, error } = await supabase
    .from('study_roadmaps')
    .select('*, study_roadmap_steps(*)')
    .eq('profile', profile)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'study_roadmap_steps', ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getAllRoadmapsAdmin() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmaps')
    .select('*, study_roadmap_steps(*)')
    .order('profile', { ascending: true })
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'study_roadmap_steps', ascending: true })

  if (error) throw error
  return data ?? []
}

export async function addRoadmap(roadmap) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmaps')
    .insert([roadmap])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRoadmap(id, updates) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmaps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRoadmap(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('study_roadmaps')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function addRoadmapStep(step) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmap_steps')
    .insert([step])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRoadmapStep(id, updates) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmap_steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRoadmapStep(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('study_roadmap_steps')
    .delete()
    .eq('id', id)

  if (error) throw error
}
