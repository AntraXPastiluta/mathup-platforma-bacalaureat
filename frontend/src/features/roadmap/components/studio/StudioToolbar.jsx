import { Panel, useReactFlow } from '@xyflow/react'
import { Magnet, StickyNote, Wand2 } from 'lucide-react'
import { SUBJECT_PARTS } from '../../../lessons/profiles'

const TOOL_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary dark:text-slate-300'

/**
 * Bara de unelte a editorului (stânga-sus): adaugă subiecte (I/II/III) și note în centrul
 * viewport-ului, aranjare automată și snap-to-grid. Săgețile se trag direct între noduri
 * (mânerele din stânga/dreapta cardului), fără un „mod conectare” separat.
 */
export function StudioToolbar({ onAddSubject, onAddNote, onAutoArrange, canArrange, snapToGrid, onToggleSnap }) {
  const { screenToFlowPosition, fitView } = useReactFlow()

  const viewportCenter = () =>
    screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })

  const handleArrange = () => {
    onAutoArrange()
    window.requestAnimationFrame(() => fitView({ padding: 0.25, duration: 400, maxZoom: 1 }))
  }

  return (
    <Panel position="top-left" className="!m-4">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <span className="px-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Adaugă</span>
        {SUBJECT_PARTS.map((subject) => (
          <button
            key={subject.value}
            type="button"
            onClick={() => onAddSubject(subject.value, viewportCenter())}
            className={TOOL_BUTTON}
            title={`Adaugă ${subject.label}`}
            aria-label={`Adaugă ${subject.label}`}
          >
            {subject.roman}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onAddNote(viewportCenter())}
          className={TOOL_BUTTON}
          title="Adaugă notă"
          aria-label="Adaugă notă"
        >
          <StickyNote className="size-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />

        <button
          type="button"
          onClick={handleArrange}
          disabled={!canArrange}
          className={`${TOOL_BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
          title="Aranjează automat după săgeți"
          aria-label="Aranjează automat"
        >
          <Wand2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToggleSnap}
          className={`${TOOL_BUTTON} ${snapToGrid ? 'bg-primary/10 text-primary' : ''}`}
          title={snapToGrid ? 'Snap pe grilă: activ' : 'Snap pe grilă: inactiv'}
          aria-label="Comută snap pe grilă"
          aria-pressed={snapToGrid}
        >
          <Magnet className="size-4" />
        </button>
      </div>
    </Panel>
  )
}
