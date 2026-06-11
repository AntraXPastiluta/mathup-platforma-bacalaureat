import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { StickyNote } from 'lucide-react'
import { useRoadmapMeta } from '../RoadmapMetaContext'

/** Notă liberă pe canvas — un „sticky note” ușor rotit, cu fundal în culoarea nodului. */
function NoteNodeBase({ data, selected, isConnectable }) {
  const { readOnly } = useRoadmapMeta()
  const color = data.color

  return (
    <div
      className={`w-60 rounded-2xl border-2 border-dashed bg-white transition-transform dark:bg-slate-900 ${selected ? 'rotate-0 -translate-y-0.5' : '-rotate-1'}`}
      style={{
        borderColor: color,
        boxShadow: selected
          ? `0 8px 0 0 ${color}40, 0 18px 36px -16px ${color}77`
          : `0 5px 0 0 ${color}26, 0 12px 24px -16px ${color}55`,
      }}
    >
      <div className="space-y-2 rounded-[14px] p-4" style={{ backgroundColor: `${color}14` }}>
        <span
          className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
          style={{ color }}
        >
          <StickyNote className="size-3.5 shrink-0" />
          Notă
        </span>
        <p className="whitespace-pre-wrap text-sm font-bold italic leading-snug text-slate-700 dark:text-slate-200">
          {data.label || (readOnly ? '' : 'Notă nouă')}
        </p>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        style={{ backgroundColor: color, opacity: isConnectable ? 1 : 0 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        style={{ backgroundColor: color, opacity: isConnectable ? 1 : 0 }}
      />
    </div>
  )
}

export const NoteNode = memo(NoteNodeBase)
