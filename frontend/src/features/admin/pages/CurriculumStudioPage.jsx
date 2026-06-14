import { lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Layers } from 'lucide-react'
import { Navbar } from '../../../shared/ui/Navbar'
import { AdminAmbientBackdrop } from '../components/AdminAmbientBackdrop'
import { Reveal, SectionLabel } from '../components/AdminEditorial'

// Cod-split: editorul de curriculum (cu hook-ul + tab-urile) se încarcă doar pe pagina sa.
const CurriculumSection = lazy(() =>
  import('../components/CurriculumSection').then((m) => ({ default: m.CurriculumSection })),
)

function WorkspaceFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Se încarcă curriculumul...
      </p>
    </div>
  )
}

/**
 * Pagina dedicată de la `/admin/curriculum`: spațiul de lucru pe tot ecranul pentru gestionarea
 * lecțiilor (programe → lecții → conținut/părți/quiz/fișiere). Înlocuiește vechea secțiune
 * inline din consolă; păstrează atmosfera editorială a panoului de administrare. Toată logica
 * trăiește în `useAdminCurriculum`, apelat în interiorul `CurriculumSection`.
 */
export function CurriculumStudioPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen text-foreground selection:bg-primary/30 transition-colors duration-500">
      <AdminAmbientBackdrop />

      <Navbar />

      <main className="container relative z-10 max-w-7xl py-8 pb-20 sm:py-10">
        {/* ── Antet editorial compact ─────────────────────────────── */}
        <Reveal as="header" className="dashboard-hero-card relative overflow-hidden p-6 sm:p-7">
          <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />

          <div className="relative flex flex-col gap-5">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-border hover:text-primary"
            >
              <ArrowLeft className="size-4 shrink-0" />
              Înapoi la consolă
            </button>

            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/20 to-indigo-500/10 text-primary shadow-sm">
                  <BookOpen className="size-7" aria-hidden />
                </span>
                <div className="min-w-0">
                  <SectionLabel>MathUP · Curriculum</SectionLabel>
                  <h1 className="mt-2 font-heading text-3xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl">
                    Curriculum
                  </h1>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Gestionează lecțiile și materia pe programe — conținut, părți, quiz și fișiere.
                  </p>
                </div>
              </div>

              <span className="dashboard-hero-chip">
                <Layers className="size-3.5 text-primary" aria-hidden />
                Lecții și materie
              </span>
            </div>
          </div>
        </Reveal>

        {/* ── Spațiul de lucru ────────────────────────────────────── */}
        <div className="mt-8">
          <Suspense fallback={<WorkspaceFallback />}>
            <CurriculumSection />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
