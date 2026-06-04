import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft,
  Moon,
  Sun,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  GraduationCap,
  Layers,
} from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { useAuth } from '../../../app/providers/AuthProvider'
import { PROGRAMS, getProgramBySlug } from '../../../content/programs/programsData'

// Aceeași serif editorială ca pe WelcomePage — fără fonturi externe (CSP-safe),
// doar stiva de sistem, pentru accentul „demonstrație tipărită".
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
}

export function ProgramDetailPage() {
  const { cod } = useParams()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAuth()

  const program = getProgramBySlug(cod)

  // Cod de profil necunoscut → înapoi la pagina de start.
  if (!program) {
    return <Navigate to="/" replace />
  }

  const totalChapters = program.years.reduce((acc, year) => acc + year.chapters.length, 0)
  const otherPrograms = PROGRAMS.filter((p) => p.slug !== program.slug)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/75 backdrop-blur-md dark:bg-slate-950/75">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform group-hover:-rotate-6">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              MathUP
            </strong>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Comută tema"
              className="rounded-xl text-slate-700 dark:text-slate-200"
            >
              {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 rounded-xl text-slate-500"
            >
              <ChevronLeft className="size-4" />
              Înapoi
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="math-notebook-bg absolute inset-0 -z-10" aria-hidden="true" />
        <div className="dashboard-mesh absolute inset-0 -z-10" aria-hidden="true" />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-slate-50 dark:to-slate-950"
          aria-hidden="true"
        />
        <span
          style={{ fontFamily: SERIF }}
          className="pointer-events-none absolute -right-4 bottom-[-3rem] -z-10 select-none text-[16rem] font-bold italic leading-none text-primary/[0.06] dark:text-primary-400/[0.08]"
          aria-hidden="true"
        >
          {program.code}
        </span>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="container max-w-5xl py-16 sm:py-20"
        >
          <motion.div variants={fadeUp} className="mb-6 flex items-center gap-4">
            <span className="h-px w-12 bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
              Programa de Bacalaureat
            </span>
          </motion.div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <motion.div
              variants={fadeUp}
              style={{ fontFamily: SERIF }}
              className="hidden size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl font-semibold italic text-white shadow-xl shadow-primary/30 ring-1 ring-white/20 sm:flex"
            >
              {program.code}
            </motion.div>

            <div className="min-w-0">
              <motion.h1
                variants={fadeUp}
                className="text-4xl font-black leading-[1.02] tracking-tighter text-slate-900 sm:text-5xl dark:text-white"
              >
                {program.name}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300/90"
              >
                {program.description}
              </motion.p>
            </div>
          </div>

          {/* Chipuri-rezumat */}
          <motion.dl variants={fadeUp} className="mt-9 grid grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-3">
            {[
              { icon: Layers, label: 'Filieră', value: program.filiera },
              { icon: Clock, label: 'Ritm de studiu', value: program.hours },
              { icon: GraduationCap, label: 'Capitole', value: `${totalChapters} teme · clasele IX–XII` },
            ].map((chip) => (
              <div
                key={chip.label}
                className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 backdrop-blur dark:bg-white/[0.03]"
              >
                <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <chip.icon className="size-3" />
                  {chip.label}
                </dt>
                <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {chip.value}
                </dd>
              </div>
            ))}
          </motion.dl>

          <motion.div variants={fadeUp} className="mt-9">
            <Button
              size="lg"
              className="group h-14 rounded-xl px-9 text-sm shadow-xl shadow-primary/25"
              onClick={() => navigate(`/register?profil=${program.slug}`)}
            >
              Începe pregătirea la {program.code}
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Conținut pe ani ──────────────────────────────────── */}
      <main className="container max-w-5xl py-12 sm:py-16">
        <div className="mb-10">
          <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">
            Ce vei învăța, an cu an
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Capitolele majore din programa oficială de examen pentru profilul {program.code}, organizate
            pe clase. MathUP se axează 100% pe programa oficială — fiecare temă vine cu lecții concise și
            variante rezolvate integral, fără nimic în plus față de ce îți cere examenul.
          </p>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 md:grid-cols-2"
        >
          {program.years.map((year) => (
            <motion.section
              key={year.grade}
              variants={fadeUp}
              className="dashboard-glass-card relative overflow-hidden rounded-2xl p-7"
            >
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.3]" aria-hidden="true" />
              <div className="relative">
                <header className="mb-5 flex items-center justify-between gap-3 border-b border-border pb-4">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                    {year.grade}
                  </h3>
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-primary dark:bg-primary/15">
                    {year.hours}
                  </span>
                </header>

                <ul className="space-y-3">
                  {year.chapters.map((chapter) => (
                    <li key={chapter} className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span className="text-[0.9375rem] font-medium leading-snug text-slate-700 dark:text-slate-200/90">
                        {chapter}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.section>
          ))}
        </motion.div>

        {/* ── Notă de sursă ──────────────────────────────────── */}
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="mt-8 text-xs font-medium italic leading-relaxed text-slate-400 dark:text-slate-500"
        >
          Structura de mai sus este extrasă din programa oficială de examen pentru disciplina
          Matematică, aprobată de Ministerul Educației (Anexa nr. 2 la OME nr. 3237/05.02.2021).
        </motion.p>

        {/* ── CTA final ──────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          className="dashboard-hero-card mt-14 p-7 sm:p-9"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                Pregătit pentru profilul {program.code}?
              </h3>
              <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300/90">
                Creează-ți cont gratuit și parcurge programa cu lecții pe competențe și un plan de studiu ghidat.
              </p>
            </div>
            <Button
              size="lg"
              className="group h-14 shrink-0 rounded-xl px-9 text-sm"
              onClick={() => navigate(`/register?profil=${program.slug}`)}
            >
              Creează cont gratuit
              <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </div>
        </motion.div>

        {/* ── Celelalte profiluri ────────────────────────────── */}
        <div className="mt-12 border-t border-border/60 pt-8">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            Vezi și celelalte profiluri
          </p>
          <div className="flex flex-wrap gap-3">
            {otherPrograms.map((other) => (
              <Link
                key={other.slug}
                to={`/programa/${other.slug}`}
                className="group inline-flex items-center gap-3 rounded-xl border border-border bg-background/80 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
              >
                <span
                  style={{ fontFamily: SERIF }}
                  className="text-lg font-semibold italic text-primary"
                >
                  {other.code}
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {other.name}
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
