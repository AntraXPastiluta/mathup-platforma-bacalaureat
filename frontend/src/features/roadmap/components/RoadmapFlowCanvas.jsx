import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAuth } from '../../../app/providers/AuthProvider'
import { SubjectNode } from './nodes/SubjectNode'
import { NoteNode } from './nodes/NoteNode'
import { RoadmapEdge } from './edges/RoadmapEdge'
import { RoadmapMetaContext } from './RoadmapMetaContext'

// Tipurile de noduri/muchii trebuie definite la nivel de modul — un obiect nou la fiecare
// render ar remonta toate nodurile (React Flow avertizează explicit).
const nodeTypes = { subject: SubjectNode, note: NoteNode }
const edgeTypes = { roadmap: RoadmapEdge }

const EMPTY_META = { lessonsById: new Map(), completedLessonIds: new Set(), readOnly: false }

function minimapNodeColor(node) {
  return node.data?.color || '#6366f1'
}

/**
 * Canvasul comun (React Flow) pentru editorul de admin și vizualizarea elevului.
 * `meta` ajunge la noduri prin RoadmapMetaContext; `flowKey` remontează fluxul (și
 * re-încadrează viewport-ul) la schimbarea roadmap-ului. Copiii sunt panouri React Flow
 * (toolbar, inspector) — au acces la instanța fluxului prin hook-urile bibliotecii.
 */
export function RoadmapFlowCanvas({
  flowKey,
  nodes,
  edges,
  meta = EMPTY_META,
  readOnly = false,
  snapToGrid = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onNodesDelete,
  onEdgesDelete,
  onNodeClick,
  children,
}) {
  const { theme } = useAuth()

  return (
    <RoadmapMetaContext.Provider value={meta}>
      <ReactFlowProvider>
        <ReactFlow
          key={flowKey}
          className="roadmap-flow"
          colorMode={theme === 'dark' ? 'dark' : 'light'}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          edgesFocusable={!readOnly}
          deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
          snapToGrid={snapToGrid}
          snapGrid={[24, 24]}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          minZoom={0.15}
          maxZoom={2}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.6}
            color="color-mix(in srgb, var(--primary) 22%, transparent)"
          />
          {/* Ridicate deasupra bulei de chat Suport (fixed bottom-right, ~5rem înălțime). */}
          <Controls showInteractive={false} position="bottom-right" className="!mb-[5.5rem]" />
          {readOnly ? null : (
            <MiniMap pannable zoomable position="bottom-left" nodeColor={minimapNodeColor} />
          )}
          {children}
        </ReactFlow>
      </ReactFlowProvider>
    </RoadmapMetaContext.Provider>
  )
}
