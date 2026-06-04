import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, Milestone } from 'lucide-react'
import { SUBJECT_PARTS } from '../../lessons/profiles'
import { useRoadmapViewport } from '../hooks/useRoadmapViewport'
import {
  colorToMarkerId,
  createEdge,
  createNoteNode,
  createSubjectNode,
  getImportanceMeta,
  getNodeAnchor,
  getSubjectMeta,
  getWorldSize,
  GRID_SIZE,
  NODE_HEIGHT,
  NODE_WIDTH,
  snapToGrid,
  WORLD_MIN_HEIGHT,
  WORLD_MIN_WIDTH,
} from '../utils/canvasLayout'
import { RoadmapFloatingToolbar } from './RoadmapFloatingToolbar'
import { RoadmapLegend } from './RoadmapLegend'
import { RoadmapNodeInspector } from './RoadmapNodeInspector'
import { RoadmapViewportControls } from './RoadmapViewportControls'

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
  fillHeight = false,
  showViewportControls = true,
  persistKey = null,
  fitOnLoad = false,
}) {
  const viewportRef = useRef(null)
  const dragStateRef = useRef(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [connectFromId, setConnectFromId] = useState(null)
  const [subjectToAdd, setSubjectToAdd] = useState('')
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  const nodes = layout.nodes
  const edges = layout.edges

  const {
    scale,
    offset,
    showGrid,
    setShowGrid,
    fitToContent,
    resetView,
    zoomIn,
    zoomOut,
    screenToWorld,
    handleWheel,
    handlePointerDownPan,
    handlePointerMovePan,
    handlePointerUpPan,
    spacePressed,
  } = useRoadmapViewport({
    viewportRef,
    nodes,
    persistKey,
    fitOnLoad,
  })

  const worldSize = useMemo(
    () => getWorldSize(nodes, viewportSize.width, viewportSize.height),
    [nodes, viewportSize.height, viewportSize.width],
  )

  const edgeColors = useMemo(() => {
    const colors = new Set()
    edges.forEach((edge) => colors.add(edge.color))
    nodes.forEach((node) => colors.add(node.color))
    return [...colors]
  }, [edges, nodes])

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

  const clampWorldPosition = useCallback((x, y) => {
    const maxX = Math.max(24, worldSize.width - NODE_WIDTH - 24)
    const maxY = Math.max(24, worldSize.height - NODE_HEIGHT - 24)
    let nextX = Math.min(Math.max(24, x), maxX)
    let nextY = Math.min(Math.max(24, y), maxY)
    if (snapEnabled && !readOnly) {
      nextX = snapToGrid(nextX, GRID_SIZE)
      nextY = snapToGrid(nextY, GRID_SIZE)
    }
    return { x: nextX, y: nextY }
  }, [readOnly, snapEnabled, worldSize.height, worldSize.width])

  const handlePointerDownNode = (event, nodeId) => {
    if (readOnly) return
    if (event.button !== 0 || spacePressed) return

    const node = nodes.find((item) => item.id === nodeId)
    if (!node) return

    const worldPoint = screenToWorld(event.clientX, event.clientY)
    dragStateRef.current = {
      nodeId,
      offsetX: worldPoint.x - node.x,
      offsetY: worldPoint.y - node.y,
    }
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
    event.preventDefault()
  }

  const handlePointerMove = (event) => {
    handlePointerMovePan(event)

    const dragState = dragStateRef.current
    if (!dragState || readOnly) return

    const worldPoint = screenToWorld(event.clientX, event.clientY)
    const nextPosition = clampWorldPosition(
      worldPoint.x - dragState.offsetX,
      worldPoint.y - dragState.offsetY,
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
    handlePointerUpPan(event)
    if (!dragStateRef.current) return
    dragStateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleViewportPointerDown = (event) => {
    if (readOnly) {
      handlePointerDownPan(event)
      return
    }
    if (spacePressed || event.button === 1) {
      handlePointerDownPan(event)
      return
    }
    if (event.button === 0 && !event.target.closest('[data-roadmap-node]') && !event.target.closest('[data-roadmap-control]')) {
      if (!connectFromId) {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      }
      handlePointerDownPan(event)
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

  const handleEdgeFieldChange = (edgeId, field, value) => {
    updateLayout((current) => ({
      ...current,
      edges: current.edges.map((edge) => (
        edge.id === edgeId ? { ...edge, [field]: value } : edge
      )),
    }))
  }

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId) || null

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined

    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(el)
    setViewportSize({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined
    const onWheel = (event) => handleWheel(event)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [handleWheel])

  const containerClass = fillHeight
    ? `relative h-full min-h-0 flex-1 ${className}`
    : `relative ${className}`

  return (
    <div className={containerClass}>
      <div
        ref={viewportRef}
        className={`relative h-full w-full overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 ${fillHeight ? 'min-h-[480px]' : 'min-h-[620px] rounded-[2rem]'}`}
        style={{ cursor: spacePressed ? 'grab' : 'default' }}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: worldSize.width || WORLD_MIN_WIDTH,
            height: worldSize.height || WORLD_MIN_HEIGHT,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={showGrid ? {
              backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            } : {
              backgroundColor: 'transparent',
            }}
          />

          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            width={worldSize.width}
            height={worldSize.height}
          >
            <defs>
              {edgeColors.map((color) => (
                <marker
                  key={color}
                  id={colorToMarkerId(color)}
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
                    strokeWidth={selectedEdgeId === edge.id ? 4 : 3.5}
                    strokeLinecap="round"
                    opacity={readOnly ? 0.9 : 1}
                    markerEnd={`url(#${colorToMarkerId(edge.color)})`}
                    className={readOnly ? 'roadmap-edge-flow' : 'pointer-events-auto cursor-pointer'}
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
              <div className="dashboard-reveal max-w-md space-y-3">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                  <Milestone className="size-8" />
                </div>
                <p className="text-lg font-black text-slate-700 dark:text-slate-200">Canvas gol</p>
                <p className="text-sm text-muted-foreground">
                  {readOnly
                    ? 'Administratorul nu a publicat încă elemente pe acest roadmap.'
                    : 'Adaugă subiecte, note, culori și săgeți pentru a construi roadmap-ul.'}
                </p>
              </div>
            </div>
          ) : (
            nodes.map((node, index) => {
              const subjectMeta = node.type === 'subject' ? getSubjectMeta(node.subject_part) : null
              const importanceMeta = getImportanceMeta(node.importance_grade)
              const isSelected = selectedNodeId === node.id
              const isConnectSource = connectFromId === node.id

              return (
                <div
                  key={node.id}
                  className={`absolute ${readOnly ? 'dashboard-reveal' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_WIDTH,
                    ...(readOnly ? { animationDelay: `${Math.min(index, 12) * 40}ms` } : null),
                  }}
                >
                  <article
                    data-roadmap-node
                    className={`relative flex w-full flex-col overflow-hidden rounded-3xl border bg-white/95 p-4 pl-5 shadow-md backdrop-blur dark:bg-slate-900/95 ${readOnly ? 'transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10' : ''} ${isSelected || isConnectSource ? 'ring-2 ring-primary' : 'border-slate-200 dark:border-slate-700'}`}
                    style={{
                      minHeight: NODE_HEIGHT,
                      borderColor: isSelected ? node.color : undefined,
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleNodeClick(node.id)
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ backgroundColor: node.color }}
                    />

                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {node.type === 'subject' ? (
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest" style={{ color: node.color }}>
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: node.color }} aria-hidden />
                            Subiect {subjectMeta?.roman}
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
                            Notă
                          </p>
                        )}
                        <h3 className="mt-1 text-base font-black text-slate-800 dark:text-white">{node.label}</h3>
                      </div>
                      {!readOnly ? (
                        <button
                          type="button"
                          onPointerDown={(event) => handlePointerDownNode(event, node.id)}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-400 transition-colors hover:border-primary/30 hover:text-primary dark:border-slate-700"
                          aria-label={`Mută ${node.label}`}
                        >
                          <GripVertical className="size-4" />
                        </button>
                      ) : null}
                    </div>

                    {node.type === 'subject' ? (
                      <div
                        className="mt-auto flex items-center gap-2 pt-3"
                        role="img"
                        aria-label={`Importanță: ${importanceMeta.label}`}
                      >
                        <span className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((pip) => (
                            <span
                              key={pip}
                              className={`size-2 rounded-full ${pip <= node.importance_grade ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                              style={pip <= node.importance_grade ? { backgroundColor: node.color } : undefined}
                            />
                          ))}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          {importanceMeta.label}
                        </span>
                      </div>
                    ) : (
                      <span
                        className="mt-auto inline-flex w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white"
                        style={{ backgroundColor: node.color }}
                      >
                        Notă personalizată
                      </span>
                    )}
                  </article>
                </div>
              )
            })
          )}
        </div>

        {!readOnly ? (
          <RoadmapFloatingToolbar
            subjectToAdd={subjectToAdd}
            onSubjectChange={setSubjectToAdd}
            availableSubjects={availableSubjects}
            onAddSubject={handleAddSubject}
            onAddNote={handleAddNote}
            connectFromId={connectFromId}
            selectedNodeId={selectedNodeId}
            onToggleConnect={() => setConnectFromId((current) => (current ? null : selectedNodeId))}
            onDeleteSelection={handleDeleteSelection}
            canDelete={Boolean(selectedNodeId || selectedEdgeId)}
            snapToGrid={snapEnabled}
            onToggleSnap={() => setSnapEnabled((current) => !current)}
          />
        ) : null}

        {!readOnly ? (
          <RoadmapNodeInspector
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onNodeFieldChange={handleNodeFieldChange}
            onEdgeFieldChange={handleEdgeFieldChange}
            onClose={() => {
              setSelectedNodeId(null)
              setSelectedEdgeId(null)
            }}
          />
        ) : null}

        {readOnly && nodes.length > 0 ? (
          <RoadmapLegend nodes={nodes} />
        ) : null}

        {showViewportControls ? (
          <RoadmapViewportControls
            scale={scale}
            showGrid={showGrid}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFit={fitToContent}
            onReset={resetView}
            onToggleGrid={() => setShowGrid((current) => !current)}
          />
        ) : null}
      </div>
    </div>
  )
}
