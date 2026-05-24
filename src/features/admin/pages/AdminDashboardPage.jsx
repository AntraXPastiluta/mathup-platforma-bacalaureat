import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Navbar } from '../../../shared/ui/Navbar'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { SectionNav } from '../components/SectionNav'
import { getAdminSectionsForUser } from '../constants'
import { useAuth } from '../../../app/providers/AuthProvider'
import { isPrimaryAdminEmail } from '../../../services/curriculumAdminService'

const CurriculumSection = lazy(() =>
  import('../components/CurriculumSection').then((m) => ({ default: m.CurriculumSection })),
)
const RoadmapsSection = lazy(() =>
  import('../components/RoadmapsSection').then((m) => ({ default: m.RoadmapsSection })),
)
const SolvedVariantsSection = lazy(() =>
  import('../components/SolvedVariantsSection').then((m) => ({ default: m.SolvedVariantsSection })),
)
const PremiumUsersSection = lazy(() =>
  import('../components/PremiumUsersSection').then((m) => ({ default: m.PremiumUsersSection })),
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
  premium: PremiumUsersSection,
  admins: AccesSection,
  platform: PlatformSection,
}

function SectionFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="size-10 border-2 border-primary/30 border-t-primary animate-spin rounded-full" />
    </div>
  )
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const visibleSectionIds = useMemo(
    () => new Set(getAdminSectionsForUser(user?.email).map((s) => s.id)),
    [user?.email],
  )

  const adminSection = useMemo(() => {
    const fromUrl = searchParams.get('section')
    if (fromUrl === 'platform' && !isPrimaryAdminEmail(user?.email)) {
      return 'curriculum'
    }
    return visibleSectionIds.has(fromUrl) ? fromUrl : 'curriculum'
  }, [searchParams, visibleSectionIds, user?.email])

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
    <div className="min-h-screen text-slate-900 dark:text-slate-100 selection:bg-primary/30 transition-colors duration-500">
      <Navbar />

      <main className="container py-10 relative z-10">
        <SectionNav activeSection={adminSection} onSelectSection={setAdminSection} />

        <Suspense fallback={<SectionFallback />}>
          <ActiveSection />
        </Suspense>
      </main>

      <footer className="container py-20 mt-10 border-t border-slate-300/50 dark:border-white/5 opacity-30 text-center">
        <div className="flex items-center justify-center gap-3 text-slate-600 dark:text-slate-400 grayscale group hover:grayscale-0 transition-all">
          <BrandLogo className="size-6" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 dark:text-slate-400">MathUP Engineering</span>
        </div>
      </footer>
    </div>
  )
}
