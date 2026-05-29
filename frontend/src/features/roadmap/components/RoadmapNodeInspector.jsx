import { Select } from '../../../shared/ui/Select'
import { IMPORTANCE_GRADES, isValidColor, NODE_COLORS } from '../utils/canvasLayout'

export function RoadmapNodeInspector({
  selectedNode,
  selectedEdge,
  onNodeFieldChange,
  onEdgeFieldChange,
  onClose,
}) {
  if (!selectedNode && !selectedEdge) return null

  return (
    <div
      data-roadmap-control
      className="absolute right-4 top-4 z-20 w-72 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {selectedEdge ? 'Muchie' : 'Nod'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary"
        >
          Închide
        </button>
      </div>

      {selectedEdge ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Etichetă muchie</label>
            <input
              type="text"
              value={selectedEdge.label}
              onChange={(event) => onEdgeFieldChange(selectedEdge.id, 'label', event.target.value)}
              placeholder="ex. După lecția 3"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Culoare</label>
            <ColorPicker
              value={selectedEdge.color}
              onChange={(color) => onEdgeFieldChange(selectedEdge.id, 'color', color)}
            />
          </div>
        </div>
      ) : null}

      {selectedNode ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Etichetă</label>
            <input
              type="text"
              value={selectedNode.label}
              onChange={(event) => onNodeFieldChange(selectedNode.id, 'label', event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5"
            />
          </div>
          {selectedNode.type === 'subject' ? (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Importanță</label>
              <Select
                value={selectedNode.importance_grade}
                onChange={(grade) => onNodeFieldChange(selectedNode.id, 'importance_grade', Number(grade))}
                options={IMPORTANCE_GRADES.map((grade) => ({
                  value: grade.value,
                  label: `${grade.value} · ${grade.label}`,
                }))}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Culoare</label>
            <ColorPicker
              value={selectedNode.color}
              onChange={(color) => onNodeFieldChange(selectedNode.id, 'color', color)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {NODE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`size-8 rounded-full border-2 ${value === color ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
            style={{ backgroundColor: color }}
            aria-label={`Culoare ${color}`}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (isValidColor(next) || /^#[0-9a-fA-F]{0,6}$/.test(next)) {
            onChange(next)
          }
        }}
        onBlur={(event) => {
          if (!isValidColor(event.target.value)) {
            onChange(NODE_COLORS[0])
          }
        }}
        placeholder="#6366f1"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-white/5"
      />
    </div>
  )
}
