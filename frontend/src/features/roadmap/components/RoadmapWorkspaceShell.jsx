import { useState } from 'react'
import { ArrowLeft, Info, Moon, Sun, X } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Button } from '../../../shared/ui/Button'

export function RoadmapWorkspaceShell({
  variant = 'student',
  title,
  subtitle,
  onBack,
  roadmaps = [],
  selectedRoadmapId,
  onSelectRoadmap,
  description,
  loading = false,
  error = null,
  emptyMessage,
  children,
}) {
  const { theme, toggleTheme } = useAuth()
  const [infoOpen, setInfoOpen] = useState(false)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3 dark:border-slate-800 dark:bg-slate-900/95">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-slate-200 hover:text-primary dark:hover:border-slate-700"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="hidden sm:inline">{variant === 'student' ? 'Dashboard' : 'Înapoi'}</span>
          </button>
        ) : null}

        {onBack ? <div className="h-8 w-px shrink-0 bg-slate-200 dark:bg-slate-700" aria-hidden /> : null}

        <div className="min-w-0 flex-1 leading-none">
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">
            {variant === 'student' ? 'Plan de studiu' : 'Roadmap'}
          </p>
          <h1 className="truncate text-sm font-black leading-tight text-slate-900 dark:text-white sm:text-base">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 truncate text-[10px] font-medium leading-tight text-slate-400 sm:text-[11px]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {roadmaps.length > 1 ? (
            <div className="hidden max-w-[12rem] items-center gap-1 overflow-x-auto lg:flex xl:max-w-xs">
              {roadmaps.map((roadmap) => (
                <button
                  key={roadmap.id}
                  type="button"
                  onClick={() => onSelectRoadmap?.(roadmap.id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest transition-all ${selectedRoadmapId === roadmap.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                >
                  {roadmap.title}
                </button>
              ))}
            </div>
          ) : null}

          {description ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setInfoOpen((current) => !current)}
              className="h-8 rounded-xl px-2.5"
            >
              <Info className="size-4" />
              <span className="hidden sm:inline">Info</span>
            </Button>
          ) : null}

          {variant === 'student' ? (
            <Button type="button" size="sm" variant="ghost" onClick={toggleTheme} className="size-8 rounded-xl p-0">
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          ) : null}
        </div>
      </header>

      {roadmaps.length > 1 ? (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          {roadmaps.map((roadmap) => (
            <button
              key={roadmap.id}
              type="button"
              onClick={() => onSelectRoadmap?.(roadmap.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${selectedRoadmapId === roadmap.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
            >
              {roadmap.title}
            </button>
          ))}
        </div>
      ) : null}

      {infoOpen && description ? (
        <div className="relative shrink-0 border-b border-primary/20 bg-primary/5 px-4 py-3 dark:bg-primary/10">
          <button
            type="button"
            onClick={() => setInfoOpen(false)}
            className="absolute right-3 top-3 text-slate-400 hover:text-primary"
            aria-label="Închide info"
          >
            <X className="size-4" />
          </button>
          <p className="pr-8 text-sm font-medium italic leading-relaxed text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="absolute inset-x-4 top-4 z-30 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="size-16 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Se încarcă traseul…</p>
          </div>
        ) : emptyMessage ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-2xl font-black uppercase tracking-tighter">{emptyMessage.title}</p>
              <p className="text-sm font-medium uppercase tracking-widest text-slate-400">{emptyMessage.subtitle}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
