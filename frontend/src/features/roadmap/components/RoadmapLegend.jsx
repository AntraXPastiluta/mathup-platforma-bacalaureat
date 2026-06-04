import { useState } from 'react'
import { ChevronDown, List } from 'lucide-react'
import { IMPORTANCE_GRADES, getSubjectMeta } from '../utils/canvasLayout'

/** Rând de 5 puncte care reflectă un grad de importanță (1-5). */
function ImportancePips({ grade, color = '#94a3b8' }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {[1, 2, 3, 4, 5].map((pip) => (
        <span
          key={pip}
          className={`size-2 rounded-full ${pip <= grade ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
          style={pip <= grade ? { backgroundColor: color } : undefined}
        />
      ))}
    </span>
  )
}

/**
 * Cheie explicativă pentru canvas-ul de roadmap: scala de importanță și culorile
 * subiectelor prezente. Derivă subiectele din nodurile reale, nu dintr-o paletă fixă.
 * Colapsabilă pe ecrane mici.
 */
export function RoadmapLegend({ nodes = [] }) {
  const [open, setOpen] = useState(true)

  const subjects = []
  const seen = new Set()
  for (const node of nodes) {
    if (node.type !== 'subject' || seen.has(node.subject_part)) continue
    seen.add(node.subject_part)
    subjects.push({
      key: node.subject_part,
      roman: getSubjectMeta(node.subject_part)?.roman,
      color: node.color,
    })
  }

  return (
    <div
      data-roadmap-control
      className="absolute left-4 top-4 z-20 w-56 max-w-[calc(100%-2rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <List className="size-3.5" />
          Legendă
        </span>
        <ChevronDown
          className={`size-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
              Importanță
            </p>
            <ul className="space-y-1">
              {IMPORTANCE_GRADES.map((grade) => (
                <li key={grade.value} className="flex items-center gap-2">
                  <ImportancePips grade={grade.value} />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {grade.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {subjects.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Subiecte
              </p>
              <ul className="space-y-1">
                {subjects.map((subject) => (
                  <li key={subject.key} className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden
                    />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Subiectul {subject.roman}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
