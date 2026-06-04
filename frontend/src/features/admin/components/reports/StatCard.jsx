/**
 * Card de metrică sumar pentru panoul de Rapoarte: etichetă + cifră mare + indiciu.
 * Stil aliniat cu restul consolei de administrare (rounded-3xl, dark mode).
 */
export function StatCard({ label, value, hint, icon: Icon, accent = 'primary' }) {
  const accentClasses = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }[accent] || 'bg-primary/10 text-primary'

  const displayValue =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number'
        ? new Intl.NumberFormat('ro-RO').format(value)
        : value

  return (
    <div className="rounded-3xl border border-slate-300/50 bg-white p-5 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            {displayValue}
          </p>
          {hint ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${accentClasses}`}>
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
    </div>
  )
}
