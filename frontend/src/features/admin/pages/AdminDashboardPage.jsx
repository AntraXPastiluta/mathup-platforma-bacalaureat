import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '../../../shared/ui/Navbar'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { SectionNav } from '../components/SectionNav'
import { getAdminSectionsForUser } from '../constants'
import { useAuth } from '../../../app/providers/AuthProvider'

const CurriculumSection = lazy(() =>
  import('../components/CurriculumSection').then((m) => ({ default: m.CurriculumSection })),
)
const RoadmapsSection = lazy(() =>
  import('../components/RoadmapsSection').then((m) => ({ default: m.RoadmapsSection })),
)
const SolvedVariantsSection = lazy(() =>
  import('../components/SolvedVariantsSection').then((m) => ({ default: m.SolvedVariantsSection })),
)
const AccesSection = lazy(() =>
  import('../components/AccesSection').then((m) => ({ default: m.AccesSection })),
)
const PlatformSection = lazy(() =>
  import('../components/PlatformSection').then((m) => ({ default: m.PlatformSection })),
)

const SECTION_LOADERS = {
  curriculum: CurriculumSection,
  roadmaps: RoadmapsSection,
  variants: SolvedVariantsSection,
  admins: AccesSection,
  platform: PlatformSection,
}

function SectionFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="size-12 border-4 border-primary/10 border-t-primary animate-spin rounded-full shadow-2xl shadow-primary/20" />
    </div>
  )
}

export function AdminDashboardPage() {
  const { isPrimaryAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const visibleSectionIds = useMemo(
    () => new Set(getAdminSectionsForUser(isPrimaryAdmin).map((s) => s.id)),
    [isPrimaryAdmin],
  )

  const adminSection = useMemo(() => {
    const fromUrl = searchParams.get('section')
    if (fromUrl === 'platform' && !isPrimaryAdmin) {
      return 'curriculum'
    }
    return visibleSectionIds.has(fromUrl) ? fromUrl : 'curriculum'
  }, [searchParams, visibleSectionIds, isPrimaryAdmin])

  useEffect(() => {
    const fromUrl = searchParams.get('section')
    if (fromUrl && !visibleSectionIds.has(fromUrl)) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, visibleSectionIds])

  const setAdminSection = (id) => {
    if (id === 'curriculum') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ section: id }, { replace: true })
    }
  }

  const ActiveSection = SECTION_LOADERS[adminSection] ?? CurriculumSection

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 selection:bg-primary/30 transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="container py-16 relative z-10">
        <div className="absolute inset-0 scholar-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />
        
        <header className="mb-10 space-y-2 border-b-2 border-border pb-8">
           <div className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white dark:bg-white dark:text-slate-950">
              Control Panel / Secure Environment
           </div>
           <h1 className="text-3xl font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
             Academic Console
           </h1>
           <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
             Curriculum &amp; Systems Management
           </p>
        </header>

        <SectionNav activeSection={adminSection} onSelectSection={setAdminSection} />

        <Suspense fallback={<SectionFallback />}>
          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">
             <ActiveSection />
          </div>
        </Suspense>
      </main>

      <footer className="container py-24 mt-20 border-t-2 border-border text-center opacity-40">
        <div className="flex flex-col items-center gap-6 grayscale hover:grayscale-0 transition-all duration-700 group">
          <BrandLogo className="size-12 group-hover:rotate-12 transition-transform" />
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-[0.6em] text-slate-900 dark:text-white">
              MathUP Scholarly Infrastructure
            </span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Encrypted Management Session
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
