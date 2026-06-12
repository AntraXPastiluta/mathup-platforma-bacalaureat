import { lazy, Suspense, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarDays, Layers, Lock, ShieldCheck } from 'lucide-react'
import { Navbar } from '../../../shared/ui/Navbar'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { SectionNav } from '../components/SectionNav'
import { getAdminSectionsForUser, getSectionHref } from '../constants'
import { useAuth } from '../../../app/providers/AuthProvider'

const CurriculumSection = lazy(() =>
  import('../components/CurriculumSection').then((m) => ({ default: m.CurriculumSection })),
)
const MathGuideSection = lazy(() =>
  import('../components/MathGuideSection').then((m) => ({ default: m.MathGuideSection })),
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
const ReportsSection = lazy(() =>
  import('../components/ReportsSection').then((m) => ({ default: m.ReportsSection })),
)

const SECTION_LOADERS = {
  curriculum: CurriculumSection,
  'ghid-formule': MathGuideSection,
  variants: SolvedVariantsSection,
  rapoarte: ReportsSection,
  admins: AccesSection,
  platform: PlatformSection,
}

// Serif de manuscris pentru accentele editoriale — aceeași voce „document tipărit”
// ca pe Dashboard / Welcome, fără fonturi externe (CSP-safe).
const SERIF =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const MONTHS_RO = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
]

// Etichetă editorială: linie-accent + micro-text majuscul (ca pe Dashboard).
function SectionLabel({ children, className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-px w-7 shrink-0 bg-primary" aria-hidden />
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        {children}
      </span>
    </span>
  )
}

// Revelare unică la intrare — folosește animația comună din index.css.
function Reveal({ delay = 0, as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`dashboard-reveal ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}

function SectionFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        Se încarcă secțiunea...
      </p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { isPrimaryAdmin, isTechnicalAdmin, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const visibleSectionIds = useMemo(
    () => new Set(getAdminSectionsForUser(isTechnicalAdmin).map((s) => s.id)),
    [isTechnicalAdmin],
  )

  const adminSection = useMemo(() => {
    const fromUrl = searchParams.get('section')
    // Secțiunile invizibile (ex. un profesor care nimerește ?section=rapoarte) și cele cu
    // pagină dedicată (redirecționate mai jos) cad pe Curriculum.
    return visibleSectionIds.has(fromUrl) && !getSectionHref(fromUrl) ? fromUrl : 'curriculum'
  }, [searchParams, visibleSectionIds])

  useEffect(() => {
    const fromUrl = searchParams.get('section')
    if (!fromUrl) return
    // Linkurile vechi către secțiuni mutate pe pagină dedicată (ex. ?section=roadmaps).
    const href = getSectionHref(fromUrl)
    if (href && visibleSectionIds.has(fromUrl)) {
      navigate(href, { replace: true })
      return
    }
    if (!visibleSectionIds.has(fromUrl)) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, visibleSectionIds, navigate])

  const setAdminSection = (id) => {
    const href = getSectionHref(id)
    if (href) {
      navigate(href)
      return
    }
    if (id === 'curriculum') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ section: id }, { replace: true })
    }
  }

  const ActiveSection = SECTION_LOADERS[adminSection] ?? CurriculumSection

  const roleLabel = isPrimaryAdmin
    ? 'Administrator principal'
    : isTechnicalAdmin
      ? 'Administrator tehnic'
      : 'Profesor'
  const sectionCount = visibleSectionIds.size
  const adminName = useMemo(() => {
    const full = user?.user_metadata?.full_name?.trim()
    if (full) return full.split(/\s+/)[0]
    return user?.email?.split('@')[0] || 'administrator'
  }, [user?.user_metadata?.full_name, user?.email])
  const registryDate = useMemo(() => {
    const now = new Date()
    return `${now.getDate()} ${MONTHS_RO[now.getMonth()]} ${now.getFullYear()}`
  }, [])

  return (
    <div className="relative min-h-screen text-foreground selection:bg-primary/30 transition-colors duration-500">
      {/* Fundal ambiental fix — aceeași „atmosferă” indigo ca pe tabloul de bord. */}
      <div
        className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="dashboard-aurora absolute inset-0" />
        <div className="dashboard-mesh absolute inset-0 opacity-70 dark:opacity-50" />
        <span className="dashboard-particle dashboard-particle--a" />
        <span className="dashboard-particle dashboard-particle--b" />
        <span className="dashboard-particle dashboard-particle--c" />
        <span className="dashboard-particle dashboard-particle--d" />
        <span className="dashboard-particle dashboard-particle--e" />
        <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
      </div>

      <Navbar />

      <main className="container relative z-10 max-w-6xl py-10 pb-20 sm:py-12">
        {/* ── Antet editorial — fișa de administrare ──────────────── */}
        <Reveal
          as="header"
          className="dashboard-hero-card relative overflow-hidden p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-20 left-1/4 size-40 rounded-full bg-indigo-400/8 blur-3xl" aria-hidden />

          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            {/* Coloana editorială */}
            <div className="flex min-w-0 flex-col">
              <SectionLabel>MathUP · Administrare</SectionLabel>

              <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
                Bun venit,
                <span
                  style={{ fontFamily: SERIF }}
                  className="text-base font-semibold not-italic text-primary"
                >
                  {adminName}
                </span>
              </p>

              <h1 className="mt-2 font-heading text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl">
                Consola de administrare
              </h1>

              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                Curriculum, trasee de studiu, variante și setările platformei —
                într-un singur loc.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="dashboard-hero-chip">
                  <Layers className="size-3.5 text-primary" aria-hidden />
                  {sectionCount} secțiuni
                </span>
                <span className="dashboard-hero-chip">
                  <CalendarDays className="size-3.5 text-primary" aria-hidden />
                  {registryDate}
                </span>
              </div>
            </div>

            {/* Showpiece: sigiliul de acces (fișă oficială ștampilată) */}
            <div className="relative mx-auto w-full max-w-[16rem] lg:mx-0 lg:max-w-none">
              <div
                className="pointer-events-none absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-[1.2rem] border border-primary/20 bg-primary/[0.04]"
                aria-hidden
              />

              <div className="dashboard-countdown relative rotate-1 p-6 transition-transform duration-500 hover:rotate-0">
                <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.5] dark:opacity-[0.35]" aria-hidden />

                <div className="relative flex flex-col items-center text-center">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Sigiliu de acces
                  </span>

                  <div className="relative mt-4 flex size-24 items-center justify-center">
                    <span
                      className="profile-orbit-ring absolute inset-0 rounded-full border-2 border-dashed border-primary/35"
                      aria-hidden
                    />
                    <span className="navbar-brand-tile flex size-16 items-center justify-center rounded-2xl text-white">
                      <BrandLogo className="size-8 drop-shadow" />
                    </span>
                  </div>

                  <p
                    style={{ fontFamily: SERIF }}
                    className="mt-4 text-xl font-bold italic leading-tight text-primary sm:text-2xl"
                  >
                    {roleLabel}
                  </p>

                  <div className="mt-3 w-full border-t border-border/60 pt-3">
                    <p className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      <Lock className="size-3 text-emerald-500" aria-hidden />
                      Sesiune securizată
                    </p>
                    {user?.email ? (
                      <p
                        className="mt-1 truncate text-[11px] font-semibold text-muted-foreground"
                        title={user.email}
                      >
                        {user.email}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Ștampilă plutitoare de colț */}
              <div
                className="absolute -left-3 -top-3 hidden size-[3.75rem] rotate-[-12deg] items-center justify-center rounded-full border-2 border-primary/30 bg-background/85 text-center sm:flex"
                aria-hidden
              >
                <span className="text-[8px] font-black uppercase leading-tight tracking-[0.14em] text-primary">
                  MathUP
                  <br />
                  Admin
                </span>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Selector de secțiuni ────────────────────────────────── */}
        <Reveal delay={80} className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionLabel>Secțiuni</SectionLabel>
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {sectionCount} module
            </span>
          </div>
          <SectionNav activeSection={adminSection} onSelectSection={setAdminSection} />
        </Reveal>

        {/* ── Secțiunea activă ────────────────────────────────────── */}
        <Suspense fallback={<SectionFallback />}>
          {/* key=adminSection => revelarea se reia la fiecare schimbare de secțiune */}
          <div key={adminSection} className="dashboard-reveal relative">
            <ActiveSection />
          </div>
        </Suspense>
      </main>

      {/* ── Colofon ─────────────────────────────────────────────── */}
      <footer className="container relative z-10 mt-12 border-t border-border/60 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="navbar-brand-tile flex size-11 items-center justify-center rounded-xl text-white">
            <BrandLogo className="size-6" />
          </span>
          <div className="space-y-1">
            <span className="block text-[11px] font-black uppercase tracking-[0.35em] text-foreground">
              MathUP · Administrare
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Sesiune securizată · Acces administrativ
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
