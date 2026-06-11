import { useCallback, useEffect, useReducer, useRef } from 'react'

const HISTORY_LIMIT = 50
const COMMIT_DEBOUNCE_MS = 400

/**
 * Forma „canonică” a grafului: exact câmpurile care se persistă. Selecția, drag-ul în curs,
 * măsurătorile și celelalte câmpuri volatile React Flow nu reprezintă conținut — două
 * grafuri care diferă doar prin ele sunt identice (nu murdăresc istoricul sau salvarea).
 */
export function canonicalGraph(graph) {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      data: node.data,
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: edge.data,
    })),
  }
}

function graphsEqual(a, b) {
  return a === b || JSON.stringify(canonicalGraph(a)) === JSON.stringify(canonicalGraph(b))
}

/**
 * Modelul istoricului: `past` + `committed` + `future` formează cronologia stărilor
 * confirmate; `present` poate conține în plus o modificare tranzientă (ex. un drag în
 * desfășurare sau o rafală de tastare neconfirmată încă de COMMIT). Astfel un drag întreg
 * sau o rafală de editări produce o singură intrare de istoric, nu una per mousemove.
 */
function historyReducer(state, action) {
  switch (action.type) {
    case 'SET': {
      const next = typeof action.value === 'function' ? action.value(state.present) : action.value
      if (next === state.present) return state
      return { ...state, present: next }
    }
    case 'COMMIT': {
      if (graphsEqual(state.present, state.committed)) return state
      return {
        past: [...state.past, state.committed].slice(-HISTORY_LIMIT),
        present: state.present,
        committed: state.present,
        future: [],
      }
    }
    case 'UNDO': {
      // O modificare tranzientă în curs e mai întâi „confirmată” (golind redo-ul, ca orice
      // editare nouă), apoi anulată — deci Ctrl+Z imediat după un drag se comportă natural.
      const isDirty = !graphsEqual(state.present, state.committed)
      const past = isDirty ? [...state.past, state.committed] : state.past
      const future = isDirty ? [] : state.future
      if (past.length === 0) return state
      const previous = past[past.length - 1]
      return {
        past: past.slice(0, -1),
        present: previous,
        committed: previous,
        future: [state.present, ...future],
      }
    }
    case 'REDO': {
      const isDirty = !graphsEqual(state.present, state.committed)
      if (isDirty) {
        // Editarea în curs invalidează redo-ul (comportament standard de editor).
        return {
          past: [...state.past, state.committed].slice(-HISTORY_LIMIT),
          present: state.present,
          committed: state.present,
          future: [],
        }
      }
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return {
        past: [...state.past, state.committed].slice(-HISTORY_LIMIT),
        present: next,
        committed: next,
        future: rest,
      }
    }
    case 'RESET':
      return { past: [], present: action.value, committed: action.value, future: [] }
    default:
      return state
  }
}

/**
 * Istoric undo/redo pentru graful React Flow ({ nodes, edges }).
 *
 * - `setGraph(valueOrUpdater)` — modificare tranzientă, fără intrare de istoric.
 * - `commit()` — confirmă starea curentă ca pas de istoric (no-op dacă nimic nu s-a schimbat).
 * - `commitSoon()` — commit cu debounce de 400ms, pentru rafale de tastare în inspector.
 * - `reset(graph)` — golește istoricul (la schimbarea roadmap-ului selectat).
 */
export function useRoadmapGraphHistory(initialGraph) {
  const [state, dispatch] = useReducer(historyReducer, initialGraph, (value) => ({
    past: [],
    present: value,
    committed: value,
    future: [],
  }))

  const debounceRef = useRef(null)
  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  const setGraph = useCallback((value) => dispatch({ type: 'SET', value }), [])
  const commit = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    dispatch({ type: 'COMMIT' })
  }, [])
  const commitSoon = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => dispatch({ type: 'COMMIT' }), COMMIT_DEBOUNCE_MS)
  }, [])
  const undo = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    dispatch({ type: 'UNDO' })
  }, [])
  const redo = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    dispatch({ type: 'REDO' })
  }, [])
  const reset = useCallback((value) => {
    window.clearTimeout(debounceRef.current)
    dispatch({ type: 'RESET', value })
  }, [])

  const canUndo = state.past.length > 0 || !graphsEqual(state.present, state.committed)
  const canRedo = state.future.length > 0

  return { graph: state.present, setGraph, commit, commitSoon, undo, redo, reset, canUndo, canRedo }
}
