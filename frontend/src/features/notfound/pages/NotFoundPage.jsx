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

export function NotFoundPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { user } = useAuth()

  // Simbolul „nu există” își desenează intrarea, ca o concluzie scrisă pe tablă.
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
          {/* —— Ecuația care nu are soluție —— */}
          <motion.div
            variants={item}
            className="mx-auto mb-8 flex flex-col items-center gap-3 font-heading text-foreground"
          >
            <div className="flex items-end justify-center gap-3">
              {/* Operatorul limită cu indicele x→404 */}
              <span className="relative inline-flex flex-col items-center leading-none">
                <span className="text-4xl italic sm:text-5xl">lim</span>
                <span className="mt-1 text-base font-semibold not-italic tabular-nums text-muted-foreground sm:text-lg">
                  x→<span className="font-black text-primary">404</span>
                </span>
              </span>
              <span className="pb-1 text-4xl italic text-muted-foreground sm:text-5xl">f(x)</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl italic text-muted-foreground sm:text-5xl">=</span>
              <motion.span
                {...glyphReveal}
                className="bg-gradient-to-br from-[#818cf8] to-[#4338ca] bg-clip-text text-6xl font-black text-transparent sm:text-7xl"
                style={{ display: 'inline-block' }}
              >
                ∄
              </motion.span>
              <span className="self-end pb-2 font-heading text-sm italic text-muted-foreground sm:text-base">
                (nu există)
              </span>
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
              MathUP · Eroare 404
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-5 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl"
          >
            Pagina nu a fost găsită
          </motion.h1>

          {/* Replica de „cretă” — limbajul matematic al brandului. */}
          <motion.p
            variants={item}
            className="mt-3 font-heading text-base italic text-primary/80 sm:text-lg"
          >
            Această rută nu are soluție
          </motion.p>

          <motion.p
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground"
          >
            Linkul pe care l-ai accesat este greșit, a expirat sau pagina a fost mutată.
            Hai să te ducem înapoi pe un drum cunoscut.
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
