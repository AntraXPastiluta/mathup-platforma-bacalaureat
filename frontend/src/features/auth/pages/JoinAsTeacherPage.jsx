import { motion, useReducedMotion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Moon,
  Sun,
  Award,
  GraduationCap,
  FileBadge,
  BookOpenCheck,
  ShieldCheck,
  Mail,
} from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { useAuth } from '../../../app/providers/AuthProvider'
import { OPERATOR, LEGAL_ROUTES } from '../../../content/legal/legalConstants'

// Aceeași serif editorială ca pe WelcomePage/ProgramDetailPage — fără fonturi externe
// (CSP-safe), doar stiva de sistem, pentru accentul „demonstrație tipărită".
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
}

// Cerințele pentru a deveni profesor colaborator MathUP. Conținut bespoke pentru
// această pagină → inline (la fel ca textul de marketing din ProgramDetailPage).
const REQUIREMENTS = [
  {
    icon: Award,
    title: 'Notă de minimum 9,20 la Bacalaureat',
    text: 'La proba de Matematică din examenul de Bacalaureat trebuie să fi obținut o notă de 9,20 sau peste.',
  },
  {
    icon: GraduationCap,
    title: 'Studii superioare — licență și master',
    text: 'Diplomă de licență și de master finalizate, de preferință la o facultate de matematică, cu dovada acestora.',
  },
  {
    icon: FileBadge,
    title: 'Formare pedagogică',
    text: 'Dovada absolvirii unui curs sau modul pedagogic care atestă pregătirea didactică.',
  },
  {
    icon: BookOpenCheck,
    title: 'Cunoașterea programei de examen',
    text: 'Stăpânirea temeinică a programei oficiale de Bacalaureat la matematică (profilurile M1, M2 și M3).',
  },
]

export function JoinAsTeacherPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAuth()
  const reduce = useReducedMotion()
  const fromHidden = reduce ? 'show' : 'hidden'

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
          Σ
        </span>

        <motion.div
          variants={stagger}
          initial={fromHidden}
          animate="show"
          className="container max-w-5xl py-16 sm:py-20"
        >
          <motion.div variants={fadeUp} className="mb-6 flex items-center gap-4">
            <span className="h-px w-12 bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
              Alătură-te echipei · Cariere la MathUP
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="max-w-3xl text-4xl font-black leading-[1.02] tracking-tighter text-slate-900 sm:text-5xl dark:text-white"
          >
            Predă matematică{' '}
            <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary">
              alături
            </span>{' '}
            de MathUP.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300/90"
          >
            Construim o pregătire de Bacalaureat riguroasă, pe competențe. Căutăm profesori de
            matematică cu rezultate de excelență, care să scrie lecții concise și să rezolve integral
            variante de examen pentru elevii noștri. Dacă te regăsești în cerințele de mai jos, te
            invităm să ne contactezi.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Cerințe ──────────────────────────────────────────── */}
      <main className="container max-w-5xl py-12 sm:py-16">
        <div className="mb-10">
          <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">Cerințe pentru colaborare</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Selectăm profesori după criterii clare de performanță academică și pregătire didactică,
            pentru ca fiecare lecție și fiecare variantă rezolvată să fie la nivelul așteptat de elevi.
          </p>
        </div>

        <motion.div
          variants={stagger}
          initial={fromHidden}
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-6 md:grid-cols-2"
        >
          {REQUIREMENTS.map((req, i) => {
            const Icon = req.icon
            return (
              <motion.section
                key={req.title}
                variants={fadeUp}
                className="dashboard-glass-card relative overflow-hidden rounded-2xl p-7"
              >
                <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.3]" aria-hidden="true" />
                <div className="relative flex items-start gap-5">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-primary">
                    <Icon className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: SERIF }} className="text-sm font-semibold italic text-primary/50">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {req.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-[0.9375rem] font-medium leading-relaxed text-slate-600 dark:text-slate-300/90">
                      {req.text}
                    </p>
                  </div>
                </div>
              </motion.section>
            )
          })}
        </motion.div>

        {/* ── Cum decurge procesul (confidențialitate) ─────────── */}
        <motion.div
          variants={fadeUp}
          initial={fromHidden}
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="dashboard-hero-card mt-14 p-7 sm:p-9"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-7" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                Cum decurge procesul
              </span>
              <h2 className="mt-3 text-2xl font-black tracking-tighter text-slate-900 dark:text-white sm:text-3xl">
                Verificare confidențială, prin interviu
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300/90">
                Pentru a proteja confidențialitatea documentelor tale — diplome, certificate, foaie
                matricolă — <strong className="font-bold text-slate-800 dark:text-white">nu îți cerem să încarci nimic pe platformă</strong>.
                Verificarea dovezilor și a cunoașterii programei se face într-un{' '}
                <strong className="font-bold text-slate-800 dark:text-white">interviu direct cu un administrator MathUP</strong>,
                în care prezinți documentele relevante.
              </p>

              <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-background/70 p-5 dark:bg-white/[0.03]">
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  <Mail className="size-3.5" />
                  Pentru a programa un interviu, scrie-ne la
                </span>
                <span className="select-all break-all text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {OPERATOR.email}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-8 py-12 md:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-950">
              <BrandLogo className="size-6" />
            </div>
            <div>
              <span className="block text-2xl font-black uppercase tracking-tighter">Math<span className="text-primary">UP</span></span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Fundament Academic</span>
            </div>
          </div>
          <div className="space-y-2 text-center md:text-right">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
              <Link
                to={LEGAL_ROUTES.terms}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
              >
                Termeni și Condiții
              </Link>
              <Link
                to={LEGAL_ROUTES.privacy}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
              >
                Politica de Confidențialitate
              </Link>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              &copy; {new Date().getFullYear()} MathUP. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
