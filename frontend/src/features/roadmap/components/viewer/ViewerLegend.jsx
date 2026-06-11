import { useState } from 'react'
import { Panel } from '@xyflow/react'
import { BookOpen, CheckCircle2, ChevronDown, Map } from 'lucide-react'
import { IMPORTANCE_GRADES } from '../../utils/graphMapping'

/**
 * Legenda vizualizării elevului (stânga-jos, pliabilă): scala de importanță, marcajul de
 * lecție finalizată și indiciul de navigare către lecții.
 */
export function ViewerLegend() {
  const [open, setOpen] = useState(false)

  return (
    <Panel position="bottom-left" className="!m-4">
      {open ? (
        <div className="w-64 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mb-3 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Map className="size-3.5 text-primary" />
              Legendă
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-primary"
              aria-label="Închide legenda"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Importanță</p>
              <div className="flex items-center gap-1">
                {IMPORTANCE_GRADES.map((grade) => (
                  <span
                    key={grade.value}
                    className="h-1.5 w-3.5 rounded-full bg-primary"
                    style={{ opacity: 0.25 + (grade.value / 5) * 0.75 }}
                    aria-hidden
                  />
                ))}
                <span className="ml-1.5 text-[9px] font-bold text-slate-400">
                  {IMPORTANCE_GRADES[0].label} → {IMPORTANCE_GRADES[4].label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              Lecție finalizată
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-300">
              <BookOpen className="size-4 shrink-0 text-primary" />
              Apasă un subiect cu lecție pentru a o deschide
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/95 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-lg backdrop-blur transition-colors hover:text-primary dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300"
        >
          <Map className="size-4 text-primary" />
          Legendă
        </button>
      )}
    </Panel>
  )
}
