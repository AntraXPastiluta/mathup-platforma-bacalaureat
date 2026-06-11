/**
 * CRUD pentru parcursurile de învățare („roadmaps”) administrate de echipă.
 * Graful fiecărui roadmap stă în tabelele normalizate `roadmap_nodes` / `roadmap_edges`
 * (FK reale către lecții și roadmap), iar salvarea metadatelor + grafului este atomică,
 * prin RPC-ul `save_roadmap_graph`. Citirea per profil e permisă oricărui utilizator
 * autentificat; scrierea și listarea completă necesită rol de admin de curriculum.
 */
import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin } from './curriculumAdminService'

const GRAPH_SELECT = '*, roadmap_nodes(*), roadmap_edges(*)'

/** Doar metadatele roadmap-urilor unui program — suficient pentru linkul din dashboard. */
export async function getRoadmapsForProfile(profile) {
  const { data, error } = await supabase
    .from('study_roadmaps')
    .select('id, profile, title, description, order_index')
    .eq('profile', profile)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Roadmap-urile unui program, cu graful complet — pentru pagina elevului. */
export async function getRoadmapsWithGraphForProfile(profile) {
  const { data, error } = await supabase
    .from('study_roadmaps')
    .select(GRAPH_SELECT)
    .eq('profile', profile)
    .order('order_index', { ascending: true })

  if (error) throw error
  return data ?? []
}

/** Toate roadmap-urile, cu graf, indiferent de program — pentru Roadmap Studio. */
export async function getAllRoadmapsAdmin() {
  await requireCurriculumAdmin()
  const { data, error } = await supabase
    .from('study_roadmaps')
    .select(GRAPH_SELECT)
    .order('profile', { ascending: true })
    .order('order_index', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Salvează atomic un roadmap (metadate + înlocuirea completă a grafului).
 * `id` null creează un roadmap nou. Nodurile/muchiile sunt în formatul tabelelor
 * (vezi graphMapping.fromFlow). Întoarce id-ul roadmap-ului salvat.
 */
export async function saveRoadmapGraph({ id = null, title, description, profile, orderIndex, nodes, edges }) {
  await requireCurriculumAdmin()
  const { data, error } = await supabase.rpc('save_roadmap_graph', {
    p_roadmap_id: id,
    p_title: title,
    p_description: description,
    p_profile: profile,
    p_order_index: orderIndex,
    p_nodes: nodes,
    p_edges: edges,
  })

  if (error) throw error
  return data?.id ?? null
}

/** Șterge un roadmap; graful (noduri + muchii) dispare prin FK on delete cascade. */
export async function deleteRoadmap(id) {
  await requireCurriculumAdmin()
  const { error } = await supabase
    .from('study_roadmaps')
    .delete()
    .eq('id', id)

  if (error) throw error
}
