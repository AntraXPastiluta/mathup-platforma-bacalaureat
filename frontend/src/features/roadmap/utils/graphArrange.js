import { NODE_WIDTH, NODE_HEIGHT } from './graphMapping'

// Pașii de aranjare sunt multipli de GRID_SIZE (24), ca nodurile să cadă pe grilă:
// 240+120=360 (15 celule) pe orizontală, 170+70=240 (10 celule) pe verticală.
const ARRANGE_GAP_X = 120
const ARRANGE_GAP_Y = 240 - NODE_HEIGHT
const ARRANGE_ORIGIN = 72

/**
 * Rearanjează nodurile pe coloane, de la stânga la dreapta, după ordinea dată de săgeți
 * (sortare topologică Kahn pe straturi). Ciclurile nu blochează algoritmul: când nu mai
 * există noduri cu grad de intrare 0, e forțat nodul cu gradul minim (echivalent cu a
 * ignora muchiile „înapoi”). Nodurile fără nicio legătură sunt așezate într-o grilă sub
 * blocul aranjat. Doar `position` se schimbă; restul câmpurilor rămân neatinse.
 */
export function arrangeFlowGraph(nodes, edges) {
  if (!nodes.length) return nodes

  const nodeIds = new Set(nodes.map((node) => node.id))
  const connectedIds = new Set()
  for (const edge of edges) {
    if (edge.source === edge.target || !nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    connectedIds.add(edge.source)
    connectedIds.add(edge.target)
  }

  const adjacency = new Map()
  const inDegree = new Map()
  for (const node of nodes) {
    if (!connectedIds.has(node.id)) continue
    adjacency.set(node.id, [])
    inDegree.set(node.id, 0)
  }
  for (const edge of edges) {
    if (edge.source === edge.target || !connectedIds.has(edge.source) || !connectedIds.has(edge.target)) continue
    adjacency.get(edge.source).push(edge.target)
    inDegree.set(edge.target, inDegree.get(edge.target) + 1)
  }

  // Păstrăm ordinea originală a nodurilor pentru rânduri stabile (același input → același output).
  const orderedConnected = nodes.filter((node) => connectedIds.has(node.id)).map((node) => node.id)
  const remaining = new Set(orderedConnected)
  const layers = []
  while (remaining.size > 0) {
    let layer = orderedConnected.filter((id) => remaining.has(id) && inDegree.get(id) === 0)
    if (layer.length === 0) {
      let fallback = null
      for (const id of orderedConnected) {
        if (!remaining.has(id)) continue
        if (fallback === null || inDegree.get(id) < inDegree.get(fallback)) fallback = id
      }
      layer = [fallback]
    }
    layers.push(layer)
    for (const id of layer) {
      remaining.delete(id)
      for (const target of adjacency.get(id)) {
        if (remaining.has(target)) inDegree.set(target, inDegree.get(target) - 1)
      }
    }
  }

  const positions = new Map()
  layers.forEach((layer, column) => {
    layer.forEach((id, row) => {
      positions.set(id, {
        x: ARRANGE_ORIGIN + column * (NODE_WIDTH + ARRANGE_GAP_X),
        y: ARRANGE_ORIGIN + row * (NODE_HEIGHT + ARRANGE_GAP_Y),
      })
    })
  })

  const isolated = nodes.filter((node) => !connectedIds.has(node.id))
  const maxRows = layers.reduce((max, layer) => Math.max(max, layer.length), 0)
  const isolatedStartY = ARRANGE_ORIGIN + maxRows * (NODE_HEIGHT + ARRANGE_GAP_Y)
  isolated.forEach((node, index) => {
    positions.set(node.id, {
      x: ARRANGE_ORIGIN + (index % 3) * (NODE_WIDTH + ARRANGE_GAP_X),
      y: isolatedStartY + Math.floor(index / 3) * (NODE_HEIGHT + ARRANGE_GAP_Y),
    })
  })

  return nodes.map((node) => {
    const position = positions.get(node.id)
    return position ? { ...node, position } : node
  })
}
