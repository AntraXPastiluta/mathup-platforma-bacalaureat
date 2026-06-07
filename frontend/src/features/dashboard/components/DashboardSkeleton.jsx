import { Skeleton } from '../../../shared/ui/Skeleton'

// Skeleton al tabloului de bord. Oglindește noua structură (bară laterală + antet editorial +
// grilă de statistici + feed „Progres" cu coloană de calendar) ca să nu existe salt de layout
// când datele se încarcă. Reutilizează aceleași clase de chrome data-independente
// (`dashboard-*`, `scholar-grid`, `study-calendar-grid`) ca pagina propriu-zisă.

const cardClass = 'dashboard-glass-card'

function WeekDaySkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Skeleton rounded="rounded" className="h-2 w-5" />
      <Skeleton rounded="rounded-full" className="size-10 sm:size-11" />
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className={`${cardClass} relative overflow-hidden p-4 sm:p-5`}>
      <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.3] dark:opacity-[0.22]" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-2 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-2 w-2/3" />
        </div>
        <Skeleton rounded="rounded-xl" className="size-10 shrink-0" />
      </div>
    </div>
  )
}

function SidebarNavSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5">
      <Skeleton rounded="rounded-lg" className="size-8 shrink-0" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="relative grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6" aria-hidden>
      {/* ── Bară laterală ─────────────────────────────────── */}
      <aside className="space-y-3">
        {/* Profil */}
        <div className={`${cardClass} relative overflow-hidden p-4`}>
          <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.35] dark:opacity-[0.24]" aria-hidden />
          <div className="relative flex items-center gap-3">
            <Skeleton rounded="rounded-full" className="size-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
          <div className="mt-3 flex gap-1.5 border-t border-border/60 pt-3">
            <Skeleton rounded="rounded-lg" className="h-6 w-12" />
            <Skeleton rounded="rounded-lg" className="h-6 w-12" />
          </div>
        </div>

        {/* Navigare */}
        <div className={`${cardClass} p-3`}>
          <Skeleton className="mb-3 ml-1 h-2.5 w-20" />
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <SidebarNavSkeleton key={index} />
            ))}
          </div>
        </div>

        {/* Premium */}
        <div className={`${cardClass} flex items-center gap-2.5 px-3.5 py-3`}>
          <Skeleton rounded="rounded-md" className="size-4 shrink-0" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      </aside>

      {/* ── Zona de conținut ──────────────────────────────── */}
      <div className="min-w-0 space-y-5 sm:space-y-6">
        {/* Antet editorial */}
        <section className="dashboard-hero-card relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 size-40 rounded-full bg-indigo-400/8 blur-3xl" aria-hidden />

          <div className="relative grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            {/* Coloana editorială */}
            <div className="flex min-w-0 flex-col">
              <Skeleton className="h-3 w-44" />
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

        {/* Grila de statistici */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>

        {/* Feed principal + coloana de calendar */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-6">
          {/* Feed principal */}
          <div className="min-w-0 space-y-5">
            {/* Card mare de progres */}
            <section className={`${cardClass} relative overflow-hidden p-5 sm:p-7`}>
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

            {/* Progres pe subiecte */}
            <section className={`${cardClass} relative overflow-hidden p-5 sm:p-6`}>
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="mt-4 space-y-2.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 dark:bg-white/5">
                      <Skeleton rounded="rounded" className="h-7 w-7 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton rounded="rounded-full" className="h-1.5 w-full" />
                      </div>
                      <Skeleton rounded="rounded-md" className="size-4 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Coloana laterală dreaptă */}
          <aside className="space-y-4">
            {/* Calendar de studiu */}
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

            {/* Obiectiv azi */}
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
          </aside>
        </div>
      </div>
    </div>
  )
}
