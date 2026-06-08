import { useEffect, useRef, useState } from 'react'
import { Sigma } from 'lucide-react'
import { Button } from './Button'
import { MATH_CATEGORIES } from './mathSymbols'

// Selector popover de simboluri/termeni matematici. Rămâne „dumb”: nu cunoaște
// textarea-ul, ci doar raportează elementul ales prin `onInsert(item, block)`.
// Părintele (prin `insertMathSnippet`) decide dacă împachetează în $...$ sau
// inserează LaTeX brut, în funcție de poziția cursorului.
export function MathSymbolToolbar({ onInsert }) {
  const [open, setOpen] = useState(false)
  const [block, setBlock] = useState(false)
  const containerRef = useRef(null)

  // Închide panoul la click în afara lui.
  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handlePick = (item) => {
    onInsert(item, block)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        motionless
        onClick={() => setOpen((value) => !value)}
        className="gap-2 text-[10px]"
      >
        <Sigma className="size-4" />
        Simboluri
      </Button>

      {open ? (
        <div className="absolute left-0 z-30 mt-2 max-h-80 w-[22rem] max-w-[calc(100vw-2rem)] space-y-4 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-xl custom-scrollbar dark:border-white/10 dark:bg-[#0a0f1c]">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={block}
              onChange={(event) => setBlock(event.target.checked)}
              className="accent-primary"
            />
            Formulă pe rând separat ($$)
          </label>

          {MATH_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {category.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handlePick(item)}
                    title={item.snippet}
                    className="min-w-9 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary dark:bg-white/5 dark:text-slate-200 dark:hover:bg-primary/20"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
