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
export const NODE_HEIGHT = 168

export function createEmptyLayout() {
  return { nodes: [], edges: [] }
}

export function createNodeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `node-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createEdgeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getSubjectMeta(subjectPart) {
  return SUBJECT_PARTS.find((subject) => subject.value === subjectPart) || SUBJECT_PARTS[0]
}

export function getImportanceMeta(grade) {
  return IMPORTANCE_GRADES.find((item) => item.value === grade) || IMPORTANCE_GRADES[2]
}

export function normalizeLayout(rawLayout) {
  if (!rawLayout || typeof rawLayout !== 'object') {
    return createEmptyLayout()
  }

  const nodes = Array.isArray(rawLayout.nodes)
    ? rawLayout.nodes.map((node, index) => ({
      id: node.id || createNodeId(),
      type: node.type === 'note' ? 'note' : 'subject',
      subject_part: node.subject_part ?? null,
      label: node.label || '',
      importance_grade: Number(node.importance_grade) || 3,
      x: Number(node.x) || 72 + (index % 2) * 280,
      y: Number(node.y) || 72 + Math.floor(index / 2) * 200,
      color: NODE_COLORS.includes(node.color) ? node.color : NODE_COLORS[0],
    }))
    : []

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = Array.isArray(rawLayout.edges)
    ? rawLayout.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .map((edge) => ({
        id: edge.id || createEdgeId(),
        from: edge.from,
        to: edge.to,
        color: NODE_COLORS.includes(edge.color) ? edge.color : NODE_COLORS[0],
        label: edge.label || '',
      }))
    : []

  return { nodes, edges }
}

export function createSubjectNode(subjectPart, index, existingNodes = []) {
  const subjectMeta = getSubjectMeta(subjectPart)
  return {
    id: createNodeId(),
    type: 'subject',
    subject_part: subjectPart,
    label: subjectMeta.label,
    importance_grade: 3,
    x: 72 + (existingNodes.length % 2) * 280,
    y: 72 + Math.floor(existingNodes.length / 2) * 200,
    color: NODE_COLORS[index % NODE_COLORS.length],
  }
}

export function createNoteNode(existingNodes = []) {
  return {
    id: createNodeId(),
    type: 'note',
    subject_part: null,
    label: 'Notă nouă',
    importance_grade: 3,
    x: 72 + (existingNodes.length % 2) * 280,
    y: 72 + Math.floor(existingNodes.length / 2) * 200,
    color: NODE_COLORS[(existingNodes.length + 2) % NODE_COLORS.length],
  }
}

export function createEdge(from, to, color = NODE_COLORS[0]) {
  return {
    id: createEdgeId(),
    from,
    to,
    color,
    label: '',
  }
}

export function getNodeAnchor(node, side = 'center') {
  const centerX = node.x + NODE_WIDTH / 2
  const centerY = node.y + NODE_HEIGHT / 2

  if (side === 'right') {
    return { x: node.x + NODE_WIDTH, y: centerY }
  }
  if (side === 'left') {
    return { x: node.x, y: centerY }
  }

  return { x: centerX, y: centerY }
}
