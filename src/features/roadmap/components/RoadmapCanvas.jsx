import { useCallback, useMemo, useRef, useState } from 'react'
import { ArrowRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { SUBJECT_PARTS } from '../../lessons/profiles'
import {
  createEdge,
  createNoteNode,
  createSubjectNode,
  getImportanceMeta,
  getNodeAnchor,
  getSubjectMeta,
  IMPORTANCE_GRADES,
  NODE_COLORS,
  NODE_HEIGHT,
  NODE_WIDTH,
} from '../utils/canvasLayout'

function getEdgePath(fromNode, toNode) {
  const start = getNodeAnchor(fromNode, 'right')
  const end = getNodeAnchor(toNode, 'left')
  const deltaX = Math.max(48, Math.abs(end.x - start.x) / 2)

  return `M ${start.x} ${start.y} C ${start.x + deltaX} ${start.y}, ${end.x - deltaX} ${end.y}, ${end.x} ${end.y}`
}

export function RoadmapCanvas({
  layout,
  onLayoutChange,
  readOnly = false,
  className = '',
}) {
  const canvasRef = useRef(null)
  const dragStateRef = useRef(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [connectFromId, setConnectFromId] = useState(null)
  const [subjectToAdd, setSubjectToAdd] = useState('')

  const nodes = layout.nodes
  const edges = layout.edges

  const availableSubjects = useMemo(
    () => SUBJECT_PARTS.filter((subject) => !nodes.some((node) => node.type === 'subject' && node.subject_part === subject.value)),
    [nodes],
  )

  const updateLayout = useCallback((updater) => {
    if (readOnly) return
    onLayoutChange((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return {
        nodes: next.nodes ?? current.nodes,
        edges: next.edges ?? current.edges,
      }
    })
  }, [onLayoutChange, readOnly])

  const clampPosition = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return { x, y }

    const maxX = Math.max(24, canvas.clientWidth - NODE_WIDTH - 24)
    const maxY = Math.max(24, canvas.clientHeight - NODE_HEIGHT - 24)
    return {
      x: Math.min(Math.max(24, x), maxX),
      y: Math.min(Math.max(24, y), maxY),
    }
  }, [])

  const handlePointerDown = (event, nodeId) => {
    if (readOnly) return
    if (event.button !== 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const node = nodes.find((item) => item.id === nodeId)
    if (!node) return

    const canvasRect = canvas.getBoundingClientRect()
    dragStateRef.current = {
      nodeId,
      offsetX: event.clientX - canvasRect.left - node.x,
      offsetY: event.clientY - canvasRect.top - node.y,
    }
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current
    if (!dragState || readOnly) return

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const nextPosition = clampPosition(
      event.clientX - canvasRect.left - dragState.offsetX,
      event.clientY - canvasRect.top - dragState.offsetY,
    )

    updateLayout((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        node.id === dragState.nodeId
          ? { ...node, x: nextPosition.x, y: nextPosition.y }
          : node
      )),
    }))
  }

  const handlePointerUp = (event) => {
    if (!dragStateRef.current) return
    dragStateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleNodeClick = (nodeId) => {
    if (readOnly) return

    if (connectFromId) {
      if (connectFromId !== nodeId) {
        updateLayout((current) => {
          const fromNode = current.nodes.find((node) => node.id === connectFromId)
          const alreadyLinked = current.edges.some((edge) => (
            (edge.from === connectFromId && edge.to === nodeId)
            || (edge.from === nodeId && edge.to === connectFromId)
          ))
          if (!fromNode || alreadyLinked) {
            return current
          }

          return {
            ...current,
            edges: [...current.edges, createEdge(connectFromId, nodeId, fromNode.color)],
          }
        })
      }
      setConnectFromId(null)
      return
    }

    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
  }

  const handleAddSubject = () => {
    const subjectPart = Number(subjectToAdd)
    if (!subjectPart) return
    updateLayout((current) => ({
      ...current,
      nodes: [...current.nodes, createSubjectNode(subjectPart, current.nodes.length, current.nodes)],
    }))
    setSubjectToAdd('')
  }

  const handleAddNote = () => {
    updateLayout((current) => ({
      ...current,
      nodes: [...current.nodes, createNoteNode(current.nodes)],
    }))
  }

  const handleDeleteSelection = () => {
    if (selectedEdgeId) {
      updateLayout((current) => ({
        ...current,
        edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
      }))
      setSelectedEdgeId(null)
      return
    }

    if (!selectedNodeId) return
    updateLayout((current) => ({
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter((edge) => edge.from !== selectedNodeId && edge.to !== selectedNodeId),
    }))
    setSelectedNodeId(null)
  }

  const handleNodeFieldChange = (nodeId, field, value) => {
    updateLayout((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        node.id === nodeId ? { ...node, [field]: value } : node
      )),
    }))
  }

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null

  return (
    <div className={`space-y-4 ${className}`}>
      {!readOnly ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={subjectToAdd}
              onChange={(event) => setSubjectToAdd(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/5 sm:max-w-xs"
            >
              <option value="">Alege un subiect</option>
              {availableSubjects.map((subject) => (
                <option key={subject.value} value={subject.value}>{subject.label}</option>
              ))}
            </select>
            <Button type="button" onClick={handleAddSubject} disabled={!subjectToAdd} className="rounded-2xl">
              <Plus className="size-4" />
              Adaugă subiect
            </Button>
            <Button type="button" variant="outline" onClick={handleAddNote} className="rounded-2xl">
              <Plus className="size-4" />
              Adaugă notă
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={connectFromId ? 'default' : 'outline'}
              onClick={() => setConnectFromId((current) => (current ? null : selectedNodeId))}
              disabled={!selectedNodeId}
              className="rounded-2xl"
            >
              <ArrowRight className="size-4" />
              {connectFromId ? 'Alege destinația' : 'Adaugă săgeată'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteSelection}
              disabled={!selectedNodeId && !selectedEdgeId}
              className="rounded-2xl border-destructive/20 text-destructive"
            >
              <Trash2 className="size-4" />
              Șterge selecția
            </Button>
          </div>
        </div>
      ) : null}

      {!readOnly && selectedNode ? (
        <div className="grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/50 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Etichetă</label>
            <input
              type="text"
              value={selectedNode.label}
              onChange={(event) => handleNodeFieldChange(selectedNode.id, 'label', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold dark:border-white/10 dark:bg-white/5"
            />
          </div>
          {selectedNode.type === 'subject' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grad de importanță</label>
              <select
                value={selectedNode.importance_grade}
                onChange={(event) => handleNodeFieldChange(selectedNode.id, 'importance_grade', Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-white/10 dark:bg-white/5"
              >
                {IMPORTANCE_GRADES.map((grade) => (
                  <option key={grade.value} value={grade.value}>{grade.value} · {grade.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Culoare card</label>
            <div className="flex flex-wrap gap-2">
              {NODE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleNodeFieldChange(selectedNode.id, 'color', color)}
                  className={`size-9 rounded-full border-2 ${selectedNode.color === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Culoare ${color}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={canvasRef}
        className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle,_rgba(148,163,184,0.35)_1px,_transparent_1px)] [background-size:24px_24px] dark:border-slate-800 dark:bg-slate-950/80"
        onPointerMove={handlePointerMove}
        onClick={() => {
          if (!readOnly && !connectFromId) {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
          }
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            {NODE_COLORS.map((color) => (
              <marker
                key={color}
                id={`roadmap-arrow-${color.replace('#', '')}`}
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="5"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
              </marker>
            ))}
          </defs>
          {edges.map((edge) => {
            const fromNode = nodes.find((node) => node.id === edge.from)
            const toNode = nodes.find((node) => node.id === edge.to)
            if (!fromNode || !toNode) return null

            return (
              <g key={edge.id}>
                <path
                  d={getEdgePath(fromNode, toNode)}
                  fill="none"
                  stroke={edge.color}
                  strokeWidth={selectedEdgeId === edge.id ? 4 : 3}
                  markerEnd={`url(#roadmap-arrow-${edge.color.replace('#', '')})`}
                  className={readOnly ? '' : 'pointer-events-auto cursor-pointer'}
                  onClick={(event) => {
                    if (readOnly) return
                    event.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                  }}
                />
                {edge.label ? (
                  <text
                    x={(getNodeAnchor(fromNode, 'right').x + getNodeAnchor(toNode, 'left').x) / 2}
                    y={(getNodeAnchor(fromNode, 'right').y + getNodeAnchor(toNode, 'left').y) / 2 - 8}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px] font-bold"
                  >
                    {edge.label}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>

        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-lg font-black text-slate-700 dark:text-slate-200">Canvas gol</p>
              <p className="text-sm text-muted-foreground">
                {readOnly
                  ? 'Administratorul nu a publicat încă elemente pe acest roadmap.'
                  : 'Adaugă subiecte, note, culori și săgeți pentru a construi roadmap-ul.'}
              </p>
            </div>
          </div>
        ) : (
          nodes.map((node) => {
            const subjectMeta = node.type === 'subject' ? getSubjectMeta(node.subject_part) : null
            const importanceMeta = getImportanceMeta(node.importance_grade)
            const isSelected = selectedNodeId === node.id
            const isConnectSource = connectFromId === node.id

            return (
              <article
                key={node.id}
                className={`absolute rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur dark:bg-slate-900/95 ${isSelected || isConnectSource ? 'ring-2 ring-primary' : 'border-slate-200 dark:border-slate-700'}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  minHeight: NODE_HEIGHT,
                  borderColor: isSelected ? node.color : undefined,
                }}
                onClick={(event) => {
                  event.stopPropagation()
                  handleNodeClick(node.id)
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    {node.type === 'subject' ? (
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: node.color }}>
                        Subiect {subjectMeta?.roman}
                      </p>
                    ) : (
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notă</p>
                    )}
                    <h3 className="text-base font-black text-slate-800 dark:text-white">{node.label}</h3>
                  </div>
                  {!readOnly ? (
                    <button
                      type="button"
                      onPointerDown={(event) => handlePointerDown(event, node.id)}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      className="rounded-xl border border-slate-200 p-2 text-slate-400 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700"
                      aria-label={`Mută ${node.label}`}
                    >
                      <GripVertical className="size-4" />
                    </button>
                  ) : null}
                </div>

                {node.type === 'subject' ? (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                    style={{ backgroundColor: node.color }}
                  >
                    {importanceMeta.label}
                  </span>
                ) : (
                  <span
                    className="inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                    style={{ backgroundColor: node.color }}
                  >
                    Notă personalizată
                  </span>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
