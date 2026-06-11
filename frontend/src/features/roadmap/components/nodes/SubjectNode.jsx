import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { AlertTriangle, BookOpen, CheckCircle2 } from 'lucide-react'
import { getImportanceMeta, getSubjectMeta, IMPORTANCE_GRADES } from '../../utils/graphMapping'
import { useRoadmapMeta } from '../RoadmapMetaContext'

/**
 * Cardul unui subiect de Bac pe canvas: bandă de accent, chip „Subiectul I/II/III”,
 * importanță (5 puncte), lecția legată. Umbra dură decalată în culoarea nodului dă
 * efectul tactil-3D al restului aplicației.
 */
function SubjectNodeBase({ data, selected, isConnectable }) {
  const { lessonsById, completedLessonIds, readOnly } = useRoadmapMeta()
  const subjectMeta = getSubjectMeta(data.subjectPart)
  const importanceMeta = getImportanceMeta(data.importanceGrade)
  const color = data.color
  const lesson = data.lessonId ? lessonsById.get(data.lessonId) : null
  const completed = Boolean(readOnly && data.lessonId && completedLessonIds.has(data.lessonId))
  const openable = Boolean(readOnly && data.lessonId)

  return (
    <div
      className={`w-60 rounded-2xl border-2 bg-white transition-transform dark:bg-slate-900 ${selected ? '-translate-y-0.5' : ''} ${openable ? 'cursor-pointer' : ''}`}
      style={{
        borderColor: completed ? '#10b981' : color,
        boxShadow: selected
          ? `0 8px 0 0 ${color}55, 0 18px 36px -14px ${color}88`
          : `0 6px 0 0 ${color}33, 0 14px 28px -16px ${color}66`,
      }}
    >
      <div className="h-1.5 rounded-t-[14px]" style={{ backgroundColor: completed ? '#10b981' : color }} aria-hidden />

      <div className="space-y-2.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white"
            style={{ backgroundColor: color }}
          >
            {subjectMeta.label}
          </span>
          {completed ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-label="Lecție finalizată" /> : null}
        </div>

        <p className="text-sm font-black leading-snug text-slate-900 dark:text-white">
          {data.label || subjectMeta.label}
        </p>

        <div className="flex items-center gap-1" title={`Importanță: ${importanceMeta.label}`}>
          {IMPORTANCE_GRADES.map((grade) => (
            <span
              key={grade.value}
              className="h-1.5 w-3.5 rounded-full bg-slate-200 dark:bg-slate-700"
              style={grade.value <= data.importanceGrade ? { backgroundColor: color } : undefined}
              aria-hidden
            />
          ))}
          <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
            {importanceMeta.label}
          </span>
        </div>

        {data.lessonId ? (
          readOnly ? (
            <span
              className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-black uppercase tracking-widest ${completed ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5'}`}
            >
              <BookOpen className="size-3.5 shrink-0" />
              <span className="truncate">{completed ? 'Lecție finalizată' : 'Deschide lecția'}</span>
            </span>
          ) : lesson ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <BookOpen className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{lesson.title}</span>
            </span>
          ) : (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="truncate">Lecție indisponibilă</span>
            </span>
          )
        ) : null}
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

export const SubjectNode = memo(SubjectNodeBase)
