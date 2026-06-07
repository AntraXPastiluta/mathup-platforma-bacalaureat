import { useEffect, useId, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

// Serif de manuscris pentru accentele editoriale — fără fonturi externe (CSP-safe),
// doar stiva de sistem, ca să păstrăm contrastul „demonstrație tipărită" cu sans-ul greu.
const SERIF =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

// Fișele demonstrative — câte o variantă rezolvată reală pentru fiecare profil de
// Bacalaureat (M1–M4), în limbajul matematic al aplicației. Cardul le rotește singur
// și le poți comuta manual din selectorul de profil, ca să arate că platforma acoperă
// toate programele, nu doar Matematică-Informatică.
const WORKED_EXERCISES = [
  {
    code: 'M1',
    program: 'Matematică-Informatică',
    context: 'Integrală definită',
    statement: '∫₀¹ (3x² + 2x) dx',
    lines: [
      'F(x) = x³ + x²   (primitivă)',
      '= F(1) − F(0)',
      '= (1 + 1) − 0',
      'I = 2',
    ],
  },
  {
    code: 'M2',
    program: 'Științele Naturii',
    context: 'Studiați derivata',
    statement: 'f(x) = x³ − 3x',
    lines: [
      'f′(x) = 3x² − 3',
      'f′(x) = 0 ⇒ x² = 1',
      'x₁ = −1,  x₂ = 1',
      'Extreme în x = ±1',
    ],
  },
  {
    code: 'M3',
    program: 'Tehnologic',
    context: 'Progresie aritmetică',
    statement: 'a₁ = 3,  r = 4',
    lines: [
      'aₙ = a₁ + (n − 1)·r',
      'a₁₀ = 3 + 9·4 = 39',
      'S₁₀ = (a₁ + a₁₀)·10 / 2',
      'S₁₀ = 210',
    ],
  },
  {
    code: 'M4',
    program: 'Pedagogic',
    context: 'Calculați suma',
    statement: 'log₂ 8 + log₃ 9',
    lines: [
      'log₂ 8 = 3   (2³ = 8)',
      'log₃ 9 = 2   (3² = 9)',
      'log₂ 8 + log₃ 9 = 3 + 2',
      'Rezultat = 5',
    ],
  },
]

// Cât stă o fișă pe ecran înainte de rotația automată (ms).
const EXERCISE_ROTATION_MS = 5200

// Două variante de stil ca aceeași fișă să se integreze în contextele ei:
//  - `light`: cardul glass editorial (WelcomePage, coloana de înscriere de pe Register),
//             se adaptează la temă prin clasele dark:.
//  - `dark` : panoul întunecat permanent (showpiece-ul de pe LoginPage).
const VARIANTS = {
  light: {
    card: 'dashboard-glass-card',
    rounded: 'rounded-[1.4rem]',
    padding: 'p-7',
    grid: 'scholar-grid opacity-[0.5] dark:opacity-[0.4]',
    headerLabel: 'text-slate-400 dark:text-slate-500',
    tabWrap: 'border-border bg-background/60',
    tabInactive: 'text-slate-500 hover:text-primary dark:text-slate-400',
    context: 'text-primary',
    statement: 'text-3xl text-slate-900 dark:text-white',
    contentMinH: 'min-h-[16.5rem]',
    divider: 'bg-border',
    lines: 'space-y-2.5 text-lg text-slate-700 dark:text-slate-200',
    lineNumber: 'text-primary/40',
    lineLast: 'font-bold text-primary',
    footerBorder: 'border-border',
    footerText: 'text-slate-500 dark:text-slate-400',
  },
  dark: {
    card: 'border border-white/10 bg-white/[0.04] backdrop-blur-sm',
    rounded: 'rounded-2xl',
    padding: 'p-6',
    grid: 'scholar-grid opacity-[0.12]',
    headerLabel: 'text-slate-400',
    tabWrap: 'border-white/15 bg-white/5',
    tabInactive: 'text-slate-400 hover:text-primary-200',
    context: 'text-primary-200',
    statement: 'text-2xl text-white',
    contentMinH: 'min-h-[14.5rem]',
    divider: 'bg-white/10',
    lines: 'space-y-2 text-base text-slate-200',
    lineNumber: 'text-primary-300/60',
    lineLast: 'font-bold text-primary-200',
    footerBorder: 'border-white/10',
    footerText: 'text-slate-400',
  },
}

// Slideshow cu variante rezolvate (M1–M4): rotație automată, selector de profil cu
// evidențiere glisantă și tranziție între fișe. Se pune singur pe pauză la hover/focus.
export function WorkedExerciseShowcase({ variant = 'light', className = '' }) {
  const reduceMotion = useReducedMotion()
  const [activeExercise, setActiveExercise] = useState(0)
  const [paused, setPaused] = useState(false)
  // layoutId unic per instanță, ca evidențierea glisantă să nu se „lege" între pagini.
  const tabLayoutId = useId()
  const exercise = WORKED_EXERCISES[activeExercise]
  const v = VARIANTS[variant] ?? VARIANTS.light

  useEffect(() => {
    // Fără auto-rotație dacă utilizatorul preferă mișcare redusă sau a interacționat cu fișa.
    if (reduceMotion || paused) return undefined
    const id = setTimeout(
      () => setActiveExercise((i) => (i + 1) % WORKED_EXERCISES.length),
      EXERCISE_ROTATION_MS,
    )
    return () => clearTimeout(id)
  }, [activeExercise, paused, reduceMotion])

  return (
    <div
      className={`relative overflow-hidden ${v.card} ${v.rounded} ${v.padding} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* textură de hârtie milimetrică */}
      <div className={`pointer-events-none absolute inset-0 ${v.grid}`} aria-hidden />

      <div className="relative">
        {/* Antet + selector de profil (M1–M4) cu evidențiere glisantă */}
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${v.headerLabel}`}>
            Fișă · Variantă rezolvată
          </span>
          <div className={`flex items-center gap-0.5 rounded-lg border p-0.5 ${v.tabWrap}`}>
            {WORKED_EXERCISES.map((ex, i) => {
              const isActive = i === activeExercise
              return (
                <button
                  key={ex.code}
                  type="button"
                  onClick={() => setActiveExercise(i)}
                  aria-pressed={isActive}
                  aria-label={`Vezi un exercițiu rezolvat pentru profilul ${ex.code} — ${ex.program}`}
                  style={{ fontFamily: SERIF }}
                  className="relative rounded-md px-2 py-1 text-xs font-semibold italic transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isActive && (
                    <motion.span
                      layoutId={tabLayoutId}
                      className="absolute inset-0 rounded-md bg-primary shadow-sm shadow-primary/30"
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-white' : v.tabInactive}`}>
                    {ex.code}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Conținutul fișei — se schimbă cu profilul, înălțime stabilă */}
        <div className={`relative mt-5 ${v.contentMinH}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={exercise.code}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`mb-1 text-[11px] font-bold uppercase tracking-[0.16em] ${v.context}`}>
                {exercise.context}
              </div>
              <p
                style={{ fontFamily: SERIF }}
                className={`font-semibold tracking-tight ${v.statement}`}
              >
                {exercise.statement}
              </p>

              <div className={`my-6 h-px w-full ${v.divider}`} />

              <div style={{ fontFamily: SERIF }} className={v.lines}>
                {exercise.lines.map((line, i) => (
                  <div key={line} className="flex items-baseline gap-3">
                    <span className={`select-none font-sans text-xs font-black ${v.lineNumber}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={i === exercise.lines.length - 1 ? v.lineLast : ''}>{line}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Subsol — comun tuturor fișelor */}
        <div className={`mt-7 flex items-center gap-2.5 border-t pt-5 ${v.footerBorder}`}>
          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className={`text-[11px] font-black uppercase tracking-[0.16em] ${v.footerText}`}>
            Rezolvare completă, pas cu pas
          </span>
        </div>
      </div>
    </div>
  )
}
