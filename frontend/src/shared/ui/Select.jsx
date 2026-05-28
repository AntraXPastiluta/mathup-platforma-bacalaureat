import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Selectează…',
  disabled = false,
  className = '',
  id: idProp,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const generatedId = useId()
  const id = idProp || generatedId

  const selectedOption = options.find((option) => String(option.value) === String(value))

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-primary/40"
      >
        <span className={selectedOption ? 'truncate' : 'truncate text-slate-400 dark:text-slate-500'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/50"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-sm font-medium text-slate-400 dark:text-slate-500">
              Nicio opțiune disponibilă
            </li>
          ) : (
            options.map((option) => {
              const isSelected = String(option.value) === String(value)
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-bold transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
