import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, LayoutDashboard } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { useAuth } from '../../../app/providers/AuthProvider'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function ForbiddenPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { user } = useAuth()

  // Simbolul „nu aparține” își desenează intrarea, ca o concluzie scrisă pe tablă.
  const glyphReveal = reduceMotion
    ? {}
    : {
        initial: { scale: 0.4, opacity: 0, rotate: -8 },
        animate: { scale: 1, opacity: 1, rotate: 0 },
        transition: { delay: 0.55, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      }

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
          {/* —— Relația de apartenență care nu se verifică: tu ∉ mulțimea cu acces —— */}
          <motion.div
            variants={item}
            className="mx-auto mb-8 flex items-end justify-center gap-4 font-heading text-foreground"
          >
            <span className="text-5xl italic text-muted-foreground sm:text-6xl">tu</span>

            <motion.span
              {...glyphReveal}
              className="bg-gradient-to-br from-[#818cf8] to-[#4338ca] bg-clip-text pb-1 text-6xl font-black text-transparent sm:text-7xl"
              style={{ display: 'inline-block' }}
            >
              ∉
            </motion.span>

            {/* Mulțimea celor cu acces, cu indicele 403 ca „rol cerut” */}
            <span className="relative inline-flex flex-col items-start leading-none">
              <span className="text-5xl italic sm:text-6xl">
                𝔸<span className="align-super text-base font-semibold not-italic tabular-nums text-primary sm:text-lg">403</span>
              </span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                mulțimea cu acces
              </span>
            </span>
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
              MathUP · Eroare 403
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl"
          >
            Acces interzis
          </motion.h1>

          {/* Replica de „cretă” — limbajul matematic al brandului. */}
          <motion.p
            variants={item}
            className="mt-3 font-heading text-base italic text-primary/80 sm:text-lg"
          >
            Nu faci parte din mulțimea cu acces
          </motion.p>

          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
          >
            Această zonă este rezervată și contul tău nu are permisiunile necesare pentru a o
            deschide. Dacă crezi că este o greșeală, contactează-ne prin chatul de suport.
          </motion.p>

          {/* —— Navigare (adaptată la sesiune) —— */}
          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {user ? (
              <Button
                variant="primary"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto"
              >
                <LayoutDashboard /> Spre dashboard
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto"
              >
                <Home /> Acasă
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft /> Înapoi
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
