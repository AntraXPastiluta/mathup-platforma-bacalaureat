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
export const WORLD_MIN_WIDTH = 2400
export const WORLD_MIN_HEIGHT = 1800
export const EMPTY_VIEW_WIDTH = 960
export const EMPTY_VIEW_HEIGHT = 720
export const GRID_SIZE = 24
export const WORLD_PADDING = 240

export function getEmptyContentBounds() {
  const minX = (WORLD_MIN_WIDTH - EMPTY_VIEW_WIDTH) / 2
  const minY = (WORLD_MIN_HEIGHT - EMPTY_VIEW_HEIGHT) / 2
  return {
    minX,
    minY,
    maxX: minX + EMPTY_VIEW_WIDTH,
    maxY: minY + EMPTY_VIEW_HEIGHT,
    width: EMPTY_VIEW_WIDTH,
    height: EMPTY_VIEW_HEIGHT,
  }
}

export function getViewCenter(nodes) {
  const bounds = getContentBounds(nodes)
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }
}

export function clampViewportOffset(
  offset,
  scale,
  viewportWidth,
  viewportHeight,
  bounds,
  margin = 64,
) {
  if (!viewportWidth || !viewportHeight) return offset

  let minX = viewportWidth - margin - bounds.maxX * scale
  let maxX = margin - bounds.minX * scale
  let minY = viewportHeight - margin - bounds.maxY * scale
  let maxY = margin - bounds.minY * scale

  // Când conținutul, scalat, este mai mic decât viewport-ul, limitele se inversează
  // (minX > maxX). În acest caz nu mai are sens „prinderea” la margini, ci centrăm
  // conținutul fixând offset-ul pe ambele capete la aceeași valoare.
  if (minX > maxX) {
    const centeredX = (viewportWidth - bounds.width * scale) / 2 - bounds.minX * scale
    minX = centeredX
    maxX = centeredX
  }

  if (minY > maxY) {
    const centeredY = (viewportHeight - bounds.height * scale) / 2 - bounds.minY * scale
    minY = centeredY
    maxY = centeredY
  }

  return {
    x: Math.min(Math.max(offset.x, minX), maxX),
    y: Math.min(Math.max(offset.y, minY), maxY),
  }
}

export function isValidColor(color) {
  return typeof color === 'string' && (/^#[0-9a-fA-F]{6}$/.test(color) || NODE_COLORS.includes(color))
}

export function normalizeColor(color, fallback = NODE_COLORS[0]) {
  return isValidColor(color) ? color : fallback
}

export function snapToGrid(value, gridSize = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize
}

export function getContentBounds(nodes, padding = WORLD_PADDING) {
  if (!nodes.length) {
    return getEmptyContentBounds()
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + NODE_WIDTH)
    maxY = Math.max(maxY, node.y + NODE_HEIGHT)
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }
}

export function getWorldSize(nodes, viewportWidth = 0, viewportHeight = 0) {
  const bounds = getContentBounds(nodes)
  return {
    width: Math.max(bounds.width, viewportWidth, WORLD_MIN_WIDTH),
    height: Math.max(bounds.height, viewportHeight, WORLD_MIN_HEIGHT),
  }
}

export function colorToMarkerId(color) {
  return `roadmap-arrow-${String(color).replace('#', '').toLowerCase()}`
}

export function createEmptyLayout() {
  return { nodes: [], edges: [] }
}

export function createNodeId() {
  // Folosim crypto.randomUUID când e disponibil; fallback pe timestamp + random pentru
  // browsere vechi sau contexte non-secure (http) unde crypto.randomUUID lipsește.
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
      color: normalizeColor(node.color),
    }))
    : []

  // Eliminăm muchiile „orfane” care trimit către noduri inexistente, ca să nu desenăm
  // săgeți care pornesc/ajung în gol (date corupte sau noduri șterse anterior).
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = Array.isArray(rawLayout.edges)
    ? rawLayout.edges
      .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
      .map((edge) => ({
        id: edge.id || createEdgeId(),
        from: edge.from,
        to: edge.to,
        color: normalizeColor(edge.color),
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
