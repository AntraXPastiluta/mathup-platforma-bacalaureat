import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import { useRoadmapMeta } from '../RoadmapMetaContext'

/**
 * Săgeată între noduri: bezier colorat, cu eticheta (opțională) ca pastilă pe mijloc.
 * În vizualizarea elevului, fluxul animat (.roadmap-edge-flow, definit în index.css,
 * cu gardă prefers-reduced-motion) sugerează direcția parcursului.
 */
function RoadmapEdgeBase({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) {
  const { readOnly } = useRoadmapMeta()
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })
  const color = data?.color || '#6366f1'

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={readOnly ? 'roadmap-edge-flow' : undefined}
        style={{ stroke: color, strokeWidth: selected ? 3.5 : 2.5 }}
      />
      {data?.label ? (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute z-10 max-w-44 truncate rounded-lg border bg-white/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest backdrop-blur dark:bg-slate-900/95"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: `${color}66`,
              color,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const RoadmapEdge = memo(RoadmapEdgeBase)
