import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Moon, Sun, BookOpen, GraduationCap, Trophy, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useAuth } from '../../../app/providers/AuthProvider'
import { PROGRAMS } from '../../../content/programs/programsData'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { DashboardAmbient } from '../../dashboard/components/DashboardAmbient'
import { ScrollGraduationCap } from '../components/ScrollGraduationCap'
import { WorkedExerciseShowcase } from '../components/WorkedExerciseShowcase'

// Serif de manuscris pentru accentele editoriale — fără fonturi externe (CSP-safe),
// doar stiva de sistem, ca să păstrăm contrastul „demonstrație tipărită” cu sans-ul greu.
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const chapters = [
  {
    n: '01',
    title: 'Plan de studiu ghidat',
    description:
      'Un calendar academic structurat, cu obiective clare pentru fiecare săptămână de pregătire. Știi mereu ce urmează.',
    icon: BookOpen,
  },
  {
    n: '02',
    title: 'Variante rezolvate complet',
    description:
      'Variante de Bacalaureat cu rezolvări făcute de profesori pentru programul tău liceal.',
    icon: Trophy,
  },
  {
    n: '03',
    title: 'Lecții concise, pe competențe',
    description:
      'Conținut optimizat și organizat pe competențele-cheie din programă, pentru o învățare rapidă, logică și fără balast.',
    icon: GraduationCap,
  },
]

// Profilurile de Bacalaureat (M1–M4) — sursă unică în content/programs/programsData,
// reutilizată și de paginile de detaliu /programa/:cod.
const programs = PROGRAMS

// Link animat cu framer-motion, pentru cardurile de profil apăsabile.
const MotionLink = motion(Link)

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

const revealOnScroll = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}

export function WelcomePage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAuth()

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground transition-colors duration-500">
      <MathRainCurtain />
      <ScrollGraduationCap />
      <div className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
        <div className="relative h-full w-full">
          <DashboardAmbient />
          <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
        </div>
      </div>

      <div className="page-ambient-content">
        {/* ── Navbar ───────────────────────────────────────────── */}
        <nav className="sticky top-0 z-50 border-b border-border bg-background/90">
          <div className="container flex h-20 items-center justify-between">
            <motion.button
              type="button"
              className="group flex items-center gap-3"
              onClick={() => navigate('/')}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform duration-500 group-hover:-rotate-6">
                <BrandLogo className="size-6" />
              </div>
              <div className="text-left">
                <strong className="block text-lg font-black uppercase leading-tight tracking-tighter">Math<span className="text-primary">UP</span></strong>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">Excelență Academică</span>
              </div>
            </motion.button>

            <motion.div
              className="flex items-center gap-3 sm:gap-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Comută tema"
                className="rounded-xl text-slate-800 dark:text-slate-100"
              >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-slate-800 dark:text-slate-100"
              >
                Autentificare
              </Button>
              <Button size="sm" onClick={() => navigate('/register')} className="shadow-lg shadow-primary/20">
                Înregistrare
              </Button>
            </motion.div>
          </div>
        </nav>

        {/* ── Hero (editorial, asimetric) ──────────────────────── */}
        <section className="relative overflow-hidden pt-16 pb-24 lg:pt-28 lg:pb-32">
          <div className="container relative z-10">
            <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
              {/* Coloana de text */}
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <motion.div variants={itemVariants} className="mb-9 flex items-center gap-4">
                  <span className="h-px w-12 bg-primary" />
                  <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                    Portal academic
                  </span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-5xl font-black leading-[0.95] tracking-tighter sm:text-7xl xl:text-[5.5rem]"
                >
                  Excelența nu se
                  <br />
                  improvizează.
                  <br />
                  <span className="text-slate-400 dark:text-slate-600">Se </span>
                  <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary">
                    demonstrează
                  </span>
                  <span className="text-primary">.</span>
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="mt-9 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:text-xl"
                >
                  MathUP transformă programa de Bacalaureat la matematică într-un parcurs disciplinat:
                  lecții concise, variante rezolvate integral și un plan de studiu care te ține pe drumul cel bun.
                </motion.p>

                <motion.div variants={itemVariants} className="mt-11 flex flex-col gap-4 sm:flex-row">
                  <Button
                    size="lg"
                    className="group h-14 rounded-xl px-10 text-sm shadow-2xl shadow-primary/30"
                    onClick={() => navigate('/register')}
                  >
                    Începe pregătirea
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 rounded-xl px-10 text-sm"
                    onClick={() => navigate('/login')}
                  >
                    Am deja cont
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Toate profilurile
                  </span>
                  <div className="flex items-center gap-2">
                    {programs.map((p) => (
                      <Link
                        key={p.code}
                        to={`/programa/${p.slug}`}
                        aria-label={`Vezi programa profilului ${p.code}`}
                        style={{ fontFamily: SERIF }}
                        className="rounded-lg border border-border bg-background/60 px-3 py-1 text-sm font-semibold italic text-slate-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-200"
                      >
                        {p.code}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Showpiece: fișă de variantă rezolvată (slideshow M1–M4) */}
              <motion.div
                className="relative mx-auto w-full max-w-md lg:mx-0"
                initial={{ opacity: 0, y: 40, rotate: -3 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* strat-umbră în spate, pentru adâncime tipărită */}
                <div className="absolute inset-0 translate-x-3.5 translate-y-3.5 rounded-[1.4rem] border border-primary/20 bg-primary/[0.05]" aria-hidden />

                <WorkedExerciseShowcase
                  variant="light"
                  className="rotate-1 transition-transform duration-500 hover:rotate-0"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Metoda (cuprins numerotat) ───────────────────────── */}
        <section className="border-y border-border bg-slate-50/70 py-24 dark:bg-slate-900/40 lg:py-32">
          <div className="container">
            <motion.div
              className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
              variants={revealOnScroll}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <span className="h-px w-12 bg-primary" />
                  <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Metoda MathUP</span>
                </div>
                <h2 className="max-w-2xl text-4xl font-black tracking-tighter sm:text-5xl">
                  Trei piloni ai unei pregătiri{' '}
                  <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary">
                    riguroase
                  </span>
                  .
                </h2>
              </div>
              <p className="max-w-xs text-base leading-relaxed text-slate-500 dark:text-slate-400">
                Fără promisiuni goale — doar structură, conținut verificat și un ritm pe care îl poți susține.
              </p>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {chapters.map((chapter) => {
                const Icon = chapter.icon
                return (
                  <motion.div
                    key={chapter.n}
                    variants={itemVariants}
                    className="group grid grid-cols-[auto_1fr] items-start gap-6 border-t border-border py-9 transition-colors duration-300 last:border-b sm:grid-cols-[5rem_1fr_auto] sm:gap-8"
                  >
                    <span
                      style={{ fontFamily: SERIF }}
                      className="text-5xl italic leading-none text-slate-300 transition-colors duration-300 group-hover:text-primary dark:text-slate-700 sm:text-6xl"
                    >
                      {chapter.n}
                    </span>

                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">{chapter.title}</h3>
                      <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
                        {chapter.description}
                      </p>
                    </div>

                    <div className="col-span-2 sm:col-span-1 sm:self-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-background text-slate-400 transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                        <Icon className="size-6" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Programe / profiluri ─────────────────────────────── */}
        <section className="py-24 lg:py-32">
          <div className="container">
            <motion.div
              className="mb-14 text-center"
              variants={revealOnScroll}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Conținut dedicat</span>
              <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-black tracking-tighter sm:text-5xl">
                Programa potrivită profilului tău
              </h2>
            </motion.div>

            <motion.div
              className="grid gap-6 md:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              {programs.map((program) => (
                <MotionLink
                  key={program.code}
                  to={`/programa/${program.slug}`}
                  aria-label={`Vezi programa profilului ${program.code} — ${program.name}`}
                  variants={itemVariants}
                  className="group relative block overflow-hidden rounded-2xl border border-border bg-background/80 p-8 transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-2xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <div className="pointer-events-none absolute -right-6 -top-8 select-none opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.12]" aria-hidden>
                    <span style={{ fontFamily: SERIF }} className="text-[9rem] font-bold italic leading-none text-primary">
                      {program.code}
                    </span>
                  </div>

                  <div className="relative">
                    <span
                      style={{ fontFamily: SERIF }}
                      className="text-2xl font-semibold italic text-primary"
                    >
                      {program.code}
                    </span>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-tight">{program.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {program.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                      Vezi programa
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </MotionLink>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Recrutare profesori ──────────────────────────────── */}
        <section className="pb-16 lg:pb-24">
          <div className="container">
            <motion.div
              className="relative overflow-hidden rounded-[2rem] border border-border bg-background/70 px-8 py-12 sm:px-14 lg:px-16"
              variants={revealOnScroll}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" aria-hidden />
              <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-5">
                  <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary sm:flex">
                    <GraduationCap className="size-7" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                      Pentru profesori
                    </span>
                    <h2 className="mt-3 max-w-xl text-3xl font-black leading-[1.05] tracking-tighter sm:text-4xl">
                      Predai matematică la nivel de{' '}
                      <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary">
                        excelență
                      </span>
                      ?
                    </h2>
                    <p className="mt-3 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
                      Alătură-te echipei MathUP. Vezi cerințele și cum decurge procesul de selecție prin interviu.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="group h-14 shrink-0 rounded-xl px-9 text-sm"
                  onClick={() => navigate('/devino-profesor')}
                >
                  Vezi cerințele
                  <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA de final ─────────────────────────────────────── */}
        <section className="pb-24 lg:pb-32">
          <div className="container">
            <motion.div
              className="relative overflow-hidden rounded-[2rem] bg-primary px-8 py-16 text-white sm:px-14 lg:px-20 lg:py-24"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.08]" aria-hidden />
              <div
                className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-white/10 blur-3xl"
                aria-hidden
              />

              <div className="relative flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                    Începe astăzi
                  </span>
                  <h2 className="mt-4 max-w-2xl text-4xl font-black leading-[1.05] tracking-tighter sm:text-5xl">
                    Construiește-ți Bacalaureatul,{' '}
                    <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-white">
                      teoremă cu teoremă
                    </span>
                    .
                  </h2>
                </div>

                <Button
                  size="lg"
                  variant="secondary"
                  className="group h-14 shrink-0 rounded-xl px-10 text-sm"
                  onClick={() => navigate('/register')}
                >
                  Creează cont gratuit
                  <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="pb-24">
          <div className="container">
            <div className="flex flex-col items-center justify-between gap-12 border-t border-border pt-16 md:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-950">
                  <BrandLogo className="size-6" />
                </div>
                <div>
                  <span className="block text-2xl font-black uppercase tracking-tighter">Math<span className="text-primary">UP</span></span>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Excelență Academică</span>
                </div>
              </div>
              <div className="space-y-2 text-center md:text-right">
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
                  <Link
                    to="/termeni-si-conditii"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
                  >
                    Termeni și Condiții
                  </Link>
                  <Link
                    to="/politica-de-confidentialitate"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
                  >
                    Politica de Confidențialitate
                  </Link>
                  <Link
                    to="/devino-profesor"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
                  >
                    Devino profesor
                  </Link>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  &copy; {new Date().getFullYear()} MathUP. Toate drepturile rezervate.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
