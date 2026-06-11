import { Panel } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { Select } from '../../../../shared/ui/Select'
import { IMPORTANCE_GRADES } from '../../utils/graphMapping'
import { ColorSwatchPicker } from './ColorSwatchPicker'

const FIELD_LABEL = 'text-[10px] font-black uppercase tracking-widest text-slate-400'
const FIELD_INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-white/10 dark:bg-white/5'

/**
 * Panoul de proprietăți al selecției (dreapta-sus): etichetă, importanță, lecție legată și
 * culoare pentru un nod; etichetă și culoare pentru o muchie; doar ștergere pentru selecții
 * multiple. Tastarea folosește commit cu debounce (o rafală = un pas de undo); restul
 * câmpurilor confirmă imediat.
 */
export function StudioInspector({
  selectedNodes,
  selectedEdges,
  lessons,
  onNodeDataChange,
  onEdgeDataChange,
  onDeleteSelection,
  onClearSelection,
}) {
  const totalSelected = selectedNodes.length + selectedEdges.length
  if (totalSelected === 0) return null

  const node = selectedNodes.length === 1 && selectedEdges.length === 0 ? selectedNodes[0] : null
  const edge = selectedEdges.length === 1 && selectedNodes.length === 0 ? selectedEdges[0] : null

  const lessonOptions = node
    ? [
      { value: '', label: '— Fără lecție —' },
      ...lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })),
      ...(node.data.lessonId && !lessons.some((lesson) => lesson.id === node.data.lessonId)
        ? [{ value: node.data.lessonId, label: 'Lecție indisponibilă (alt program sau ștearsă)' }]
        : []),
    ]
    : []

  return (
    <Panel position="top-right" className="!m-4">
      <div className="w-72 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-4 flex items-center justify-between">
          <p className={FIELD_LABEL}>
            {node ? (node.type === 'note' ? 'Notă' : 'Subiect') : edge ? 'Săgeată' : `${totalSelected} elemente`}
          </p>
          <button
            type="button"
            onClick={onClearSelection}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary"
          >
            Închide
          </button>
        </div>

        {node ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Etichetă</label>
              {node.type === 'note' ? (
                <textarea
                  rows={3}
                  value={node.data.label}
                  onChange={(event) => onNodeDataChange(node.id, { label: event.target.value }, { debounce: true })}
                  className={FIELD_INPUT}
                />
              ) : (
                <input
                  type="text"
                  value={node.data.label}
                  onChange={(event) => onNodeDataChange(node.id, { label: event.target.value }, { debounce: true })}
                  className={FIELD_INPUT}
                />
              )}
            </div>

            {node.type === 'subject' ? (
              <>
                <div className="space-y-2">
                  <label className={FIELD_LABEL}>Importanță</label>
                  <Select
                    value={node.data.importanceGrade}
                    onChange={(grade) => onNodeDataChange(node.id, { importanceGrade: Number(grade) })}
                    options={IMPORTANCE_GRADES.map((grade) => ({
                      value: grade.value,
                      label: `${grade.value} · ${grade.label}`,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className={FIELD_LABEL}>Lecție legată</label>
                  <Select
                    value={node.data.lessonId ?? ''}
                    onChange={(lessonId) => onNodeDataChange(node.id, { lessonId: lessonId || null })}
                    options={lessonOptions}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <label className={FIELD_LABEL}>Culoare</label>
              <ColorSwatchPicker
                value={node.data.color}
                onChange={(color) => onNodeDataChange(node.id, { color }, { debounce: true })}
              />
            </div>
          </div>
        ) : null}

        {edge ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Etichetă săgeată</label>
              <input
                type="text"
                value={edge.data?.label ?? ''}
                onChange={(event) => onEdgeDataChange(edge.id, { label: event.target.value }, { debounce: true })}
                placeholder="ex. După lecția 3"
                className={FIELD_INPUT}
              />
            </div>
            <div className="space-y-2">
              <label className={FIELD_LABEL}>Culoare</label>
              <ColorSwatchPicker
                value={edge.data?.color ?? ''}
                onChange={(color) => onEdgeDataChange(edge.id, { color }, { debounce: true })}
              />
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onDeleteSelection}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          {totalSelected > 1 ? `Șterge ${totalSelected} elemente` : 'Șterge'}
        </button>
      </div>
    </Panel>
  )
}
