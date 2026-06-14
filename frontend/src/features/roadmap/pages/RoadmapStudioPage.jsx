import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import { PanelLeft, Redo2, Save, Undo2 } from 'lucide-react'
import { deleteRoadmap, getAllRoadmapsAdmin, saveRoadmapGraph } from '../../../services/roadmapService'
import { getAllLessonsAdmin } from '../../../services/adminService'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { DEFAULT_PROFILE, getProfileMeta } from '../../lessons/profiles'
import { RoadmapShell } from '../components/RoadmapShell'
import { RoadmapFlowCanvas } from '../components/RoadmapFlowCanvas'
import { StudioSidebar } from '../components/studio/StudioSidebar'
import { StudioToolbar } from '../components/studio/StudioToolbar'
import { StudioInspector } from '../components/studio/StudioInspector'
import { canonicalGraph, useRoadmapGraphHistory } from '../hooks/useRoadmapGraphHistory'
import { useStudioShortcuts } from '../hooks/useStudioShortcuts'
import {
  cloneGraphRows,
  createEmptyFlowGraph,
  createGraphId,
  createNoteFlowNode,
  createSubjectFlowNode,
  edgeMarker,
  fromFlowGraph,
  NODE_COLORS,
  NODE_HEIGHT,
  NODE_WIDTH,
  toFlowGraph,
} from '../utils/graphMapping'
import { arrangeFlowGraph } from '../utils/graphArrange'

const EMPTY_FORM = { title: '', description: '', profile: DEFAULT_PROFILE, order_index: 0 }

// Instantaneul „salvat” cuprinde metadatele și forma canonică a grafului (fără selecție și
// celelalte câmpuri volatile): orice diferență față de el înseamnă modificări nesalvate.
function makeSnapshot(form, graph) {
  return JSON.stringify({ form, graph: canonicalGraph(graph) })
}

/**
 * Roadmap Studio — editorul pe tot ecranul de la /admin/roadmaps, pentru profesori și
 * administratori. Canvasul e React Flow (drag, conectare prin mânere, selecție multiplă cu
 * Shift, minimap); o singură salvare persistă atomic metadatele + graful prin RPC; istoricul
 * undo/redo (Ctrl+Z/Y) acoperă graful, iar gărzile de modificări nesalvate acoperă tot.
 */
export function RoadmapStudioPage() {
  const navigate = useNavigate()
  const [roadmaps, setRoadmaps] = useState([])
  const [lessons, setLessons] = useState([])
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedSnapshot, setSavedSnapshot] = useState(() => makeSnapshot(EMPTY_FORM, createEmptyFlowGraph()))
  const { graph, setGraph, commit, commitSoon, undo, redo, reset, canUndo, canRedo } =
    useRoadmapGraphHistory(createEmptyFlowGraph())

  const dirty = useMemo(
    () => makeSnapshot(form, graph) !== savedSnapshot,
    [form, graph, savedSnapshot],
  )
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const lessonsForProfile = useMemo(
    () => lessons.filter((lesson) => lesson.profiles?.includes(form.profile)),
    [lessons, form.profile],
  )

  // Nodurile rezolvă titlurile lecțiilor din context, nu din data (data rămâne minimă).
  const canvasMeta = useMemo(
    () => ({
      lessonsById: new Map(lessons.map((lesson) => [lesson.id, lesson])),
      completedLessonIds: new Set(),
      readOnly: false,
    }),
    [lessons],
  )

  const selectedNodes = useMemo(() => graph.nodes.filter((node) => node.selected), [graph.nodes])
  const selectedEdges = useMemo(() => graph.edges.filter((edge) => edge.selected), [graph.edges])

  function applyRoadmap(roadmap) {
    const nextForm = {
      title: roadmap.title,
      description: roadmap.description || '',
      profile: roadmap.profile,
      order_index: roadmap.order_index ?? 0,
    }
    const nextGraph = toFlowGraph(roadmap)
    setSelectedRoadmapId(roadmap.id)
    setForm(nextForm)
    reset(nextGraph)
    setSavedSnapshot(makeSnapshot(nextForm, nextGraph))
  }

  function applyNew(roadmapCount) {
    const nextForm = { ...EMPTY_FORM, order_index: roadmapCount }
    const nextGraph = createEmptyFlowGraph()
    setSelectedRoadmapId(null)
    setForm(nextForm)
    reset(nextGraph)
    setSavedSnapshot(makeSnapshot(nextForm, nextGraph))
  }

  const initialAppliedRef = useRef(false)
  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const [roadmapData, lessonData] = await Promise.all([
          getAllRoadmapsAdmin(),
          // Lecțiile servesc doar selectorul „Lecție legată”; lipsa lor nu blochează editorul.
          getAllLessonsAdmin().catch(() => []),
        ])
        if (cancelled) return
        setRoadmaps(roadmapData)
        setLessons(lessonData)
        if (roadmapData.length > 0 && !initialAppliedRef.current) {
          initialAppliedRef.current = true
          applyRoadmap(roadmapData[0])
        }
      } catch (err) {
        if (!cancelled) setError(toUserFacingError(err, USER_MESSAGES.load))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- doar la montare; applyRoadmap e stabil funcțional
  }, [])

  // Avertizează la închiderea/reîncărcarea tab-ului cu modificări nesalvate. Navigarea
  // internă e acoperită de confirmDiscard(); butonul Back al browserului rămâne o limită
  // cunoscută (BrowserRouter, fără useBlocker).
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    if (!success) return undefined
    const timer = window.setTimeout(() => setSuccess(''), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const confirmDiscard = () =>
    !dirty || window.confirm('Ai modificări nesalvate. Continui fără să le salvezi?')

  async function refreshRoadmaps() {
    const data = await getAllRoadmapsAdmin()
    setRoadmaps(data)
    return data
  }

  // —— Handleri React Flow (stare controlată; tranzient = SET, confirmat = COMMIT) ——

  function handleNodesChange(changes) {
    setGraph((current) => ({ ...current, nodes: applyNodeChanges(changes, current.nodes) }))
  }

  function handleEdgesChange(changes) {
    setGraph((current) => ({ ...current, edges: applyEdgeChanges(changes, current.edges) }))
  }

  function handleConnect(connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    setGraph((current) => {
      const exists = current.edges.some(
        (edge) => edge.source === connection.source && edge.target === connection.target,
      )
      if (exists) return current
      const sourceNode = current.nodes.find((node) => node.id === connection.source)
      const color = sourceNode?.data.color ?? NODE_COLORS[0]
      return {
        ...current,
        edges: [
          ...current.edges,
          {
            id: createGraphId(),
            source: connection.source,
            target: connection.target,
            type: 'roadmap',
            markerEnd: edgeMarker(color),
            data: { label: '', color },
          },
        ],
      }
    })
    commit()
  }

  function updateNodeData(nodeId, patch, { debounce = false } = {}) {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    }))
    if (debounce) commitSoon()
    else commit()
  }

  function updateEdgeData(edgeId, patch, { debounce = false } = {}) {
    setGraph((current) => ({
      ...current,
      edges: current.edges.map((edge) =>
        edge.id === edgeId
          ? {
            ...edge,
            ...(patch.color ? { markerEnd: edgeMarker(patch.color) } : {}),
            data: { ...edge.data, ...patch },
          }
          : edge,
      ),
    }))
    if (debounce) commitSoon()
    else commit()
  }

  function addNodeToGraph(buildNode, position) {
    setGraph((current) => {
      const node = buildNode(current.nodes)
      if (position) {
        // Centrat în viewport, cu un mic decalaj progresiv ca adăugările repetate să nu se suprapună.
        const offset = (current.nodes.length % 5) * 16
        node.position = {
          x: position.x - NODE_WIDTH / 2 + offset,
          y: position.y - NODE_HEIGHT / 2 + offset,
        }
      }
      return {
        ...current,
        nodes: [
          ...current.nodes.map((existing) =>
            existing.selected ? { ...existing, selected: false } : existing,
          ),
          { ...node, selected: true },
        ],
        edges: current.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
      }
    })
    commit()
  }

  function deleteSelection() {
    setGraph((current) => {
      const removedNodeIds = new Set(current.nodes.filter((node) => node.selected).map((node) => node.id))
      return {
        nodes: current.nodes.filter((node) => !node.selected),
        edges: current.edges.filter(
          (edge) => !edge.selected && !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target),
        ),
      }
    })
    commit()
  }

  function clearSelection() {
    setGraph((current) => ({
      nodes: current.nodes.map((node) => (node.selected ? { ...node, selected: false } : node)),
      edges: current.edges.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
    }))
  }

  function autoArrange() {
    setGraph((current) => ({ ...current, nodes: arrangeFlowGraph(current.nodes, current.edges) }))
    commit()
  }

  // —— Acțiuni asupra roadmap-urilor ——

  const handleSelectRoadmap = (roadmap) => {
    if (roadmap.id === selectedRoadmapId) return
    if (!confirmDiscard()) return
    applyRoadmap(roadmap)
  }

  const handleStartNew = () => {
    if (!confirmDiscard()) return
    applyNew(roadmaps.length)
  }

  async function handleSave() {
    if (saving || !dirtyRef.current) return
    if (!form.title.trim()) {
      setError('Titlul roadmap-ului este obligatoriu.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = fromFlowGraph(graph.nodes, graph.edges)
      const savedId = await saveRoadmapGraph({
        id: selectedRoadmapId,
        title: form.title.trim(),
        description: form.description.trim(),
        profile: form.profile,
        orderIndex: Number(form.order_index) || 0,
        nodes: payload.nodes,
        edges: payload.edges,
      })
      const nextForm = {
        title: form.title.trim(),
        description: form.description.trim(),
        profile: form.profile,
        order_index: Number(form.order_index) || 0,
      }
      setForm(nextForm)
      setSelectedRoadmapId(savedId)
      setSavedSnapshot(makeSnapshot(nextForm, graph))
      setSuccess(selectedRoadmapId ? 'Roadmap salvat.' : 'Roadmap creat.')
      await refreshRoadmaps()
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedRoadmapId) return
    if (!window.confirm('Ștergi definitiv acest roadmap?')) return
    setSaving(true)
    setError('')
    try {
      await deleteRoadmap(selectedRoadmapId)
      const data = await refreshRoadmaps()
      setSuccess('Roadmap șters.')
      if (data.length > 0) {
        applyRoadmap(data[0])
      } else {
        applyNew(0)
      }
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    const source = roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId)
    if (!source) return
    if (dirty && !window.confirm('Copia va folosi ultima versiune salvată. Continui?')) return
    setSaving(true)
    setError('')
    try {
      const clonedGraph = cloneGraphRows(source)
      const createdId = await saveRoadmapGraph({
        id: null,
        title: `${source.title} (copie)`,
        description: source.description || '',
        profile: source.profile,
        orderIndex: roadmaps.length,
        nodes: clonedGraph.nodes,
        edges: clonedGraph.edges,
      })
      const data = await refreshRoadmaps()
      const created = data.find((roadmap) => roadmap.id === createdId)
      if (created) applyRoadmap(created)
      setSuccess('Roadmap duplicat.')
    } catch (err) {
      setError(toUserFacingError(err, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  useStudioShortcuts({ onSave: handleSave, onUndo: undo, onRedo: redo })

  const handleBack = () => {
    if (!confirmDiscard()) return
    navigate('/admin')
  }

  const profileMeta = getProfileMeta(form.profile)

  return (
    <RoadmapShell
      variant="admin"
      title={form.title.trim() || 'Roadmap nou'}
      subtitle={`${profileMeta.shortLabel} · ${profileMeta.label}`}
      onBack={handleBack}
      loading={loading}
      actions={(
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={undo}
            disabled={!canUndo}
            title="Anulează (Ctrl+Z)"
            aria-label="Anulează"
            className="size-8 rounded-xl p-0"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={redo}
            disabled={!canRedo}
            title="Refă (Ctrl+Y)"
            aria-label="Refă"
            className="size-8 rounded-xl p-0"
          >
            <Redo2 className="size-4" />
          </Button>
          {dirty ? (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 sm:inline-flex dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              Nesalvat
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            title="Salvează (Ctrl+S)"
            className="h-8 rounded-xl px-3"
          >
            <Save className="size-4" />
            <span className="hidden sm:inline">Salvează</span>
          </Button>
        </>
      )}
    >
      <div className="flex h-full">
        {sidebarOpen ? (
          <StudioSidebar
            roadmaps={roadmaps}
            selectedRoadmapId={selectedRoadmapId}
            onSelectRoadmap={handleSelectRoadmap}
            onStartNew={handleStartNew}
            form={form}
            onFormChange={setForm}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            busy={saving}
            onCollapse={() => setSidebarOpen(false)}
          />
        ) : null}

        <div className="relative min-w-0 flex-1">
          {(error || success) ? (
            <div className="absolute left-1/2 top-4 z-40 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 space-y-2">
              {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
              {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}
            </div>
          ) : null}

          {!sidebarOpen ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute bottom-4 left-4 z-20 rounded-xl border border-slate-200/80 bg-white/95 p-2.5 text-slate-500 shadow-lg backdrop-blur transition-colors hover:text-primary dark:border-slate-700 dark:bg-slate-900/95"
              aria-label="Arată lista de roadmaps"
              title="Arată lista de roadmaps"
            >
              <PanelLeft className="size-4" />
            </button>
          ) : null}

          <RoadmapFlowCanvas
            flowKey={selectedRoadmapId || 'new'}
            nodes={graph.nodes}
            edges={graph.edges}
            meta={canvasMeta}
            snapToGrid={snapToGrid}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeDragStop={commit}
            onNodesDelete={commit}
            onEdgesDelete={commit}
          >
            <StudioToolbar
              onAddSubject={(subjectPart, position) =>
                addNodeToGraph((nodes) => createSubjectFlowNode(subjectPart, nodes), position)}
              onAddNote={(position) => addNodeToGraph((nodes) => createNoteFlowNode(nodes), position)}
              onAutoArrange={autoArrange}
              canArrange={graph.nodes.length > 1}
              snapToGrid={snapToGrid}
              onToggleSnap={() => setSnapToGrid((current) => !current)}
            />
            <StudioInspector
              selectedNodes={selectedNodes}
              selectedEdges={selectedEdges}
              lessons={lessonsForProfile}
              onNodeDataChange={updateNodeData}
              onEdgeDataChange={updateEdgeData}
              onDeleteSelection={deleteSelection}
              onClearSelection={clearSelection}
            />
          </RoadmapFlowCanvas>
        </div>
      </div>
    </RoadmapShell>
  )
}
