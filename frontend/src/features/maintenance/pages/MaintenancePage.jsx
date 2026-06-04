import { motion, useReducedMotion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { MAINTENANCE_CONTACT_EMAIL } from '../../../services/platformSettingsService'

// Arc geometry for the „recalibrare” instrument: a working segment orbiting the brand mark.
const ARC_R = 38
const ARC_C = 2 * Math.PI * ARC_R

// Modulele atinse de mentenanță — afișate ca un mic registru al lucrărilor în curs.
const MODULES = ['Lecții', 'Variante', 'Cont']

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function MaintenancePage() {
  const reduceMotion = useReducedMotion()
  const spin = (duration, reverse = false) =>
    reduceMotion
      ? {}
      : { animate: { rotate: reverse ? -360 : 360 }, transition: { duration, ease: 'linear', repeat: Infinity } }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fundalul de brand: ploaia de ecuații + caietul de matematică + aurora indigo. */}
      <MathRainCurtain />

      <div className="page-ambient-content relative z-10 flex min-h-screen items-center justify-center px-5 py-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="dashboard-hero-card w-full max-w-xl px-7 py-10 text-center sm:px-10 sm:py-12"
        >
          {/* —— Instrumentul de recalibrare —— */}
          <motion.div variants={item} className="relative mx-auto mb-8 size-32">
            <motion.svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full"
              {...spin(60)}
              style={{ transformOrigin: '50% 50%' }}
            >
              <circle
                cx="50"
                cy="50"
                r={ARC_R}
                fill="none"
                stroke="color-mix(in srgb, var(--primary) 30%, transparent)"
                strokeWidth="1.5"
                strokeDasharray="2 7"
                strokeLinecap="round"
              />
            </motion.svg>

            <motion.svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full"
              {...spin(3.4, true)}
              style={{ transformOrigin: '50% 50%' }}
            >
              <defs>
                <linearGradient id="maint-arc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r={ARC_R}
                fill="none"
                stroke="url(#maint-arc)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${ARC_C * 0.26} ${ARC_C * 0.74}`}
              />
            </motion.svg>

            {/* Medalionul central cu sigla — static. */}
            <div className="navbar-brand-tile absolute inset-[18%] flex items-center justify-center rounded-full text-white">
              <BrandLogo className="size-9" />
            </div>
          </motion.div>

          {/* —— Antet —— */}
          <motion.div
            variants={item}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              MathUP · Mentenanță
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl"
          >
            Platforma este în mentenanță
          </motion.h1>

          {/* Replica de „cretă” — limbajul matematic al brandului. */}
          <motion.p
            variants={item}
            className="mt-3 font-heading text-base italic text-primary/80 sm:text-lg"
          >
            Lucrăm la îmbunătățiri&nbsp;&nbsp;→&nbsp;&nbsp;pentru o experiență mai bună
          </motion.p>

          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
          >
            Lucrăm la optimizări și conținut nou. Revenim online foarte curând —
            îți mulțumim pentru răbdare.
          </motion.p>

          {/* —— Bara de progres indeterminată, stil pagină liniată —— */}
          <motion.div variants={item} className="mt-8">
            <div className="relative h-2 w-full overflow-hidden rounded-full border border-primary/10 bg-primary/5">
              <motion.div
                className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
                animate={reduceMotion ? { x: '30%' } : { x: ['-45%', '160%'] }}
                transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
              />
            </div>
            <p className="mt-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Recalibrăm platforma…
            </p>
          </motion.div>

          {/* —— Module în lucru —— */}
          <motion.div variants={item} className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {MODULES.map((mod) => (
              <span
                key={mod}
                className="rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
              >
                {mod}
              </span>
            ))}
          </motion.div>

          {/* —— Contact urgent —— */}
          <motion.a
            variants={item}
            href={`mailto:${MAINTENANCE_CONTACT_EMAIL}`}
            className="group mt-8 flex items-center justify-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
              <Mail className="size-4" />
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Ai nevoie urgentă de acces? Scrie-ne la{' '}
              <span className="font-bold text-primary group-hover:underline">
                {MAINTENANCE_CONTACT_EMAIL}
              </span>
            </span>
          </motion.a>
        </motion.div>
      </div>
    </div>
  )
}
