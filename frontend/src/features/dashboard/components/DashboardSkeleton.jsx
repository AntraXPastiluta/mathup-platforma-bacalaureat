import { Skeleton } from '../../../shared/ui/Skeleton'

// Skeleton al tabloului de bord. Oglindește structura reală (hero editorial + comutator +
// bento-ul „Progres", care e vizualizarea implicită) ca să nu existe salt de layout când
// datele se încarcă. Reutilizează aceleași clase de chrome data-independente (`dashboard-*`,
// `scholar-grid`, `study-calendar-grid`) ca pagina propriu-zisă.

const cardClass = 'dashboard-glass-card'

function WeekDaySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton rounded="rounded" className="h-2 w-5" />
      <Skeleton rounded="rounded-full" className="size-10 sm:size-11" />
    </div>
  )
}

function StatChipSkeleton() {
  return (
    <div className="dashboard-stat-chip">
      <Skeleton rounded="rounded-[0.6rem]" className="size-[1.85rem] shrink-0" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-2 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="relative space-y-6 sm:space-y-7" aria-hidden>
      {/* ── Hero editorial ───────────────────────────────── */}
      <section className="dashboard-hero-card relative overflow-hidden p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 size-40 rounded-full bg-indigo-400/8 blur-3xl" aria-hidden />

        <div className="relative grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
          {/* Coloana editorială */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-3 w-44" />
              <Skeleton rounded="rounded-xl" className="h-8 w-20" />
            </div>

            <Skeleton className="mt-5 h-4 w-40" />
            <Skeleton className="mt-3 h-9 w-3/4 sm:h-10" />
            <Skeleton className="mt-1.5 h-9 w-1/2 sm:h-10" />

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton rounded="rounded-lg" className="h-7 w-16" />
              <Skeleton rounded="rounded-lg" className="h-7 w-16" />
            </div>
          </div>

          {/* Ștampila de countdown */}
          <div className="relative mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
            <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-[1.1rem] border border-primary/20 bg-primary/[0.04]" aria-hidden />
            <div className="dashboard-countdown relative rotate-1 p-5">
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.5] dark:opacity-[0.35]" aria-hidden />
              <div className="relative">
                <Skeleton className="h-3 w-28" />

                <div className="mt-2 flex items-end gap-3">
                  <Skeleton rounded="rounded-xl" className="h-16 w-24" />
                  <Skeleton className="mb-2 h-3 w-16" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3.5">
                  <div className="space-y-1.5">
                    <Skeleton className="h-2 w-14" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-2 w-14" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>

                <div className="mt-3.5 flex items-center gap-1.5 border-t border-border/60 pt-3">
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fâșia săptămânii */}
        <div className="relative mt-7 border-t border-border/60 pt-5">
          <Skeleton className="mb-4 h-3 w-32" />
          <div className="dashboard-week-strip">
            {Array.from({ length: 7 }).map((_, index) => (
              <WeekDaySkeleton key={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Comutator vizualizare ────────────────────────── */}
      <div className="flex w-full gap-1 rounded-xl border-2 border-border bg-background/70 p-1 sm:inline-flex sm:w-auto">
        <Skeleton rounded="rounded-lg" className="h-8 flex-1 sm:w-28 sm:flex-none" />
        <Skeleton rounded="rounded-lg" className="h-8 flex-1 sm:w-28 sm:flex-none" />
      </div>

      {/* ── Bento „Progres" ──────────────────────────────── */}
      <div className="dashboard-bento">
        {/* Card principal — progres la lecții */}
        <section className={`dashboard-bento__main ${cardClass} relative overflow-hidden p-5 sm:p-7`}>
          <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton rounded="rounded-xl" className="size-10" />
            </div>

            <div className="mt-4 flex items-end gap-3">
              <Skeleton rounded="rounded-2xl" className="h-16 w-32 sm:h-20" />
              <Skeleton className="mb-2 h-7 w-20" />
            </div>

            <Skeleton rounded="rounded-full" className="mt-9 h-2.5 w-full" />

            <div className="mt-5 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </section>

        {/* Coloana laterală — chip-uri + obiectiv + scurtătură */}
        <aside className="dashboard-bento__aside space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatChipSkeleton />
            <StatChipSkeleton />
            <StatChipSkeleton />
            <StatChipSkeleton />
          </div>

          <section className={`${cardClass} px-4 py-3.5`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton rounded="rounded-full" className="size-11 shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-9" />
            </div>
          </section>

          {/* O singură scurtătură-placeholder: oglindește ramura cea mai frecventă
              (CTA Premium pentru utilizatorii free). La Premium, cardurile reale
              (Plan de studiu / Variante rezolvate) depind de date, deci nu pot fi
              egalate exact — coloana laterală ocupă rânduri proprii în grid, așa că
              eventuala diferență rămâne izolată la încărcare. */}
          <div className={`${cardClass} flex items-center gap-2.5 px-3.5 py-3`}>
            <Skeleton rounded="rounded-md" className="size-4 shrink-0" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </aside>

        {/* Calendar de studiu */}
        <div className="dashboard-bento__calendar">
          <section className={`${cardClass} relative overflow-hidden p-4 sm:p-5`}>
            <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
            <div className="relative">
              <Skeleton className="mb-3 h-3 w-36" />

              <div className="flex items-center gap-2">
                <Skeleton rounded="rounded-lg" className="size-7 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="mx-auto h-4 w-28" />
                  <Skeleton className="mx-auto h-2.5 w-20" />
                </div>
                <Skeleton rounded="rounded-lg" className="size-7 shrink-0" />
              </div>

              <div className="study-calendar-grid mx-auto mt-3 w-full max-w-sm">
                {Array.from({ length: 7 }).map((_, index) => (
                  <span key={`wd-${index}`} className="study-calendar-weekday">
                    <Skeleton className="h-2 w-4" />
                  </span>
                ))}
                {Array.from({ length: 35 }).map((_, index) => (
                  <span key={`cell-${index}`} className="study-calendar-day">
                    <Skeleton rounded="rounded-md" className="size-full" />
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
