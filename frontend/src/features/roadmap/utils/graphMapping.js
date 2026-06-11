/**
 * Conversii între rândurile din tabelele `roadmap_nodes` / `roadmap_edges` și obiectele
 * React Flow, plus constantele și fabricile grafului. Tot ce știe formatul bazei de date
 * stă aici — componentele lucrează exclusiv cu forma React Flow.
 */
import { MarkerType } from '@xyflow/react'
import { SUBJECT_PARTS } from '../../lessons/profiles'

export const IMPORTANCE_GRADES = [
  { value: 1, label: 'Scăzută' },
  { value: 2, label: 'Modestă' },
  { value: 3, label: 'Medie' },
  { value: 4, label: 'Mare' },
  { value: 5, label: 'Critică' },
]

export const NODE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#0ea5e9',
  '#a855f7',
]

export const NODE_WIDTH = 240
export const NODE_HEIGHT = 170
export const GRID_SIZE = 24

export function isValidColor(color) {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
}

export function normalizeColor(color, fallback = NODE_COLORS[0]) {
  return isValidColor(color) ? color : fallback
}

export function getSubjectMeta(subjectPart) {
  return SUBJECT_PARTS.find((subject) => subject.value === subjectPart) || SUBJECT_PARTS[0]
}

export function getImportanceMeta(grade) {
  return IMPORTANCE_GRADES.find((item) => item.value === grade) || IMPORTANCE_GRADES[2]
}

/**
 * ID-urile trebuie să fie UUID-uri valide (coloanele sunt `uuid`); fallback-ul pentru
 * contexte fără crypto.randomUUID (http, browsere vechi) construiește tot un v4 valid.
 */
export function createGraphId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

/** Rând `roadmap_nodes` → nod React Flow. */
export function toFlowNode(row) {
  return {
    id: row.id,
    type: row.node_type === 'note' ? 'note' : 'subject',
    position: { x: Number(row.position_x) || 0, y: Number(row.position_y) || 0 },
    data: {
      label: row.label || '',
      subjectPart: row.subject_part ?? null,
      importanceGrade: Number(row.importance_grade) || 3,
      color: normalizeColor(row.color),
      lessonId: row.lesson_id ?? null,
    },
  }
}

/** Vârful de săgeată este derivat din culoarea muchiei — recalculat la orice schimbare. */
export function edgeMarker(color) {
  return { type: MarkerType.ArrowClosed, color: normalizeColor(color), width: 18, height: 18 }
}

/** Rând `roadmap_edges` → muchie React Flow (tipul custom „roadmap”). */
export function toFlowEdge(row) {
  const color = normalizeColor(row.color)
  return {
    id: row.id,
    source: row.source_node_id,
    target: row.target_node_id,
    type: 'roadmap',
    markerEnd: edgeMarker(color),
    data: {
      label: row.label || '',
      color,
    },
  }
}

/** Un roadmap din DB (cu roadmap_nodes/roadmap_edges imbricate) → graf React Flow. */
export function toFlowGraph(roadmap) {
  const nodes = (roadmap?.roadmap_nodes ?? []).map(toFlowNode)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = (roadmap?.roadmap_edges ?? [])
    .filter((edge) => nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id))
    .map(toFlowEdge)
  return { nodes, edges }
}

/** Graf React Flow → payload pentru RPC-ul `save_roadmap_graph`. */
export function fromFlowGraph(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      node_type: node.type === 'note' ? 'note' : 'subject',
      subject_part: node.type === 'note' ? null : (node.data.subjectPart ?? 1),
      label: node.data.label ?? '',
      importance_grade: node.data.importanceGrade ?? 3,
      position_x: Math.round(node.position.x),
      position_y: Math.round(node.position.y),
      color: normalizeColor(node.data.color),
      lesson_id: node.data.lessonId ?? null,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source_node_id: edge.source,
      target_node_id: edge.target,
      label: edge.data?.label ?? '',
      color: normalizeColor(edge.data?.color),
    })),
  }
}

export function createEmptyFlowGraph() {
  return { nodes: [], edges: [] }
}

function staggeredPosition(existingCount) {
  return {
    x: 72 + (existingCount % 2) * 280,
    y: 72 + Math.floor(existingCount / 2) * 200,
  }
}

export function createSubjectFlowNode(subjectPart, existingNodes = []) {
  const subjectMeta = getSubjectMeta(subjectPart)
  return {
    id: createGraphId(),
    type: 'subject',
    position: staggeredPosition(existingNodes.length),
    data: {
      label: subjectMeta.label,
      subjectPart,
      importanceGrade: 3,
      color: NODE_COLORS[(subjectPart - 1) % NODE_COLORS.length],
      lessonId: null,
    },
  }
}

export function createNoteFlowNode(existingNodes = []) {
  return {
    id: createGraphId(),
    type: 'note',
    position: staggeredPosition(existingNodes.length),
    data: {
      label: 'Notă nouă',
      subjectPart: null,
      importanceGrade: 3,
      color: NODE_COLORS[(existingNodes.length + 2) % NODE_COLORS.length],
      lessonId: null,
    },
  }
}

/**
 * Clonează graful unui roadmap din DB cu ID-uri noi (pentru „Duplică”): nodurile primesc
 * UUID-uri proaspete, iar capetele muchiilor sunt remapate corespunzător.
 */
export function cloneGraphRows(roadmap) {
  const graph = toFlowGraph(roadmap)
  const idMap = new Map(graph.nodes.map((node) => [node.id, createGraphId()]))
  const nodes = graph.nodes.map((node) => ({ ...node, id: idMap.get(node.id) }))
  const edges = graph.edges.map((edge) => ({
    ...edge,
    id: createGraphId(),
    source: idMap.get(edge.source),
    target: idMap.get(edge.target),
  }))
  return fromFlowGraph(nodes, edges)
}

/**
 * Detectează dacă ținta unui eveniment de tastatură este un câmp editabil — scurtăturile
 * globale (Ctrl+Z/Y, Delete) nu trebuie să se declanșeze în timp ce utilizatorul tastează.
 */
export function isEditableEventTarget(target) {
  if (!target || typeof target.tagName !== 'string') return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.isContentEditable)
}
