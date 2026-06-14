import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sigma } from 'lucide-react'
import { Button } from './Button'
import { MATH_CATEGORIES } from './mathSymbols'

// Marja față de marginile ferestrei și dimensiunile panoului (22rem / max-h-80).
const MENU_MARGIN = 8
const MENU_WIDTH = 352
const MENU_MAX_HEIGHT = 320

// Selector popover de simboluri/termeni matematici. Rămâne „dumb”: nu cunoaște
// textarea-ul, ci doar raportează elementul ales prin `onInsert(item, block)`.
// Părintele (prin `insertMathSnippet`) decide dacă împachetează în $...$ sau
// inserează LaTeX brut, în funcție de poziția cursorului.
//
// Panoul este randat într-un portal cu poziție `fixed`, ancorat la buton și
// limitat la fereastră. Astfel rămâne complet vizibil chiar și când e deschis
// din interiorul unui container cu `overflow-hidden` (ex. cardul editorului de
// lecție) sau lângă marginea din dreapta a ecranului.
export function MathSymbolToolbar({ onInsert }) {
  const [open, setOpen] = useState(false)
  const [block, setBlock] = useState(false)
  const [coords, setCoords] = useState(null)
  const containerRef = useRef(null)
  const menuRef = useRef(null)

  // Calculează poziția panoului pornind de la butonul-ancoră, aliniat la
  // marginea lui din dreapta (se deschide spre interior) și ajustat la fereastră.
  const updatePosition = useCallback(() => {
    const anchor = containerRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const width = Math.min(MENU_WIDTH, window.innerWidth - MENU_MARGIN * 2)
    let left = rect.right - width
    left = Math.max(MENU_MARGIN, Math.min(left, window.innerWidth - width - MENU_MARGIN))

    const spaceBelow = window.innerHeight - rect.bottom - MENU_MARGIN
    const spaceAbove = rect.top - MENU_MARGIN
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow
    const maxHeight = Math.min(MENU_MAX_HEIGHT, openUp ? spaceAbove : spaceBelow)

    setCoords({
      left,
      width,
      maxHeight,
      top: openUp ? undefined : rect.bottom + MENU_MARGIN,
      bottom: openUp ? window.innerHeight - rect.top + MENU_MARGIN : undefined,
    })
  }, [])

  // Recalculează poziția la deschidere și o menține la scroll/resize.
  useLayoutEffect(() => {
    if (!open) return undefined
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, updatePosition])

  // Închide panoul la click în afara butonului și a meniului (acesta e în portal).
  useEffect(() => {
    if (!open) return undefined
    function handleClickOutside(event) {
      if (containerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) {
        return
      }
      setOpen(false)
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

      {open && coords
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                left: coords.left,
                top: coords.top,
                bottom: coords.bottom,
                width: coords.width,
                maxHeight: coords.maxHeight,
              }}
              className="z-50 space-y-4 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-xl custom-scrollbar dark:border-white/10 dark:bg-[#0a0f1c]"
            >
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
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
