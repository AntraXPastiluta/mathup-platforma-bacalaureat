import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { Select } from '../../../shared/ui/Select'

export function RoadmapFloatingToolbar({
  subjectToAdd,
  onSubjectChange,
  availableSubjects,
  onAddSubject,
  onAddNote,
  connectFromId,
  selectedNodeId,
  onToggleConnect,
  onDeleteSelection,
  canDelete,
  snapToGrid,
  onToggleSnap,
}) {
  return (
    <div
      data-roadmap-control
      className="absolute left-4 top-4 z-20 max-w-[calc(100%-2rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={subjectToAdd}
          onChange={onSubjectChange}
          placeholder="Alege un subiect"
          options={availableSubjects.map((subject) => ({
            value: String(subject.value),
            label: subject.label,
          }))}
          className="w-full min-w-[10rem] max-w-xs flex-[1_1_10rem]"
        />
        <Button type="button" size="sm" onClick={onAddSubject} disabled={!subjectToAdd} className="shrink-0 rounded-xl">
          <Plus className="size-4" />
          Subiect
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onAddNote} className="shrink-0 rounded-xl">
          <Plus className="size-4" />
          Notă
        </Button>
        <Button
          type="button"
          size="sm"
          variant={connectFromId ? 'default' : 'outline'}
          onClick={onToggleConnect}
          disabled={!selectedNodeId}
          className="shrink-0 rounded-xl"
        >
          <ArrowRight className="size-4" />
          {connectFromId ? 'Destinație' : 'Săgeată'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDeleteSelection}
          disabled={!canDelete}
          className="shrink-0 rounded-xl border-destructive/20 text-destructive"
        >
          <Trash2 className="size-4" />
          Șterge
        </Button>
        <Button
          type="button"
          size="sm"
          variant={snapToGrid ? 'default' : 'outline'}
          onClick={onToggleSnap}
          className="shrink-0 rounded-xl"
        >
          Snap {GRID_LABEL}
        </Button>
      </div>
    </div>
  )
}

const GRID_LABEL = '24px'
