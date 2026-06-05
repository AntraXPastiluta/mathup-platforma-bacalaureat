import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'

// „Toca” de absolvire care te însoțește la derulare: coboară pe un șină verticală
// din dreapta paginii, din punctul de pornire (sus) până la nodul de absolvire (jos).
// Conceptul: pagina e parcursul tău spre Bacalaureat, iar toca avansează odată cu tine.
//
// Mecanică (framer-motion):
//  • poziția pe șină      ← scrollYProgress, netezit cu un arc (urmărire cu inerție)
//  • umplerea șinei       ← scrollYProgress direct (scaleY pe gradient)
//  • balansul ciucurelui  ← viteza de derulare → pendul cu arc, ca un ciucure real
//  • înclinarea tocii     ← aceeași viteză, dar discretă
//  • aura de aur          ← se aprinde în ultima parte a paginii (aproape de „Absolvire”)
//
// Decorativ (aria-hidden) și pointer-events-none — nu prinde niciodată click-uri.
// Ascuns sub lg: pe ecrane mici ar aglomera; respectă și prefers-reduced-motion.

// Repere pe șină — aprox. trecerile dintre secțiunile mari ale paginii.
const RAIL_MARKERS = [0.34, 0.58, 0.82]

// Un reper care „se aprinde” când toca trece de el.
function RailMarker({ progress, at }) {
  const opacity = useTransform(progress, [at - 0.05, at], [0.28, 1])
  const scale = useTransform(progress, [at - 0.05, at], [0.85, 1.3])
  return (
    <motion.span
      className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
      style={{ top: `${at * 100}%`, opacity, scale }}
    />
  )
}

// Toca propriu-zisă. `tasselRotate` poate fi un MotionValue sau 0 (reduced-motion).
function Mortarboard({ tasselRotate }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-12 text-primary"
      role="img"
      aria-label="Tocă de absolvire"
    >
      {/* calota (partea de pe cap) — desenată prima, ca să iasă pe sub bord */}
      <path
        d="M22.5 25.5 L22.5 31 Q22.5 36.6 32 37.7 Q41.5 36.6 41.5 31 L41.5 25.5 Z"
        fill="currentColor"
        className="opacity-80"
      />
      {/* bordul pătrat în perspectivă (rombul tocii) */}
      <path d="M32 11.8 L55 22.5 L32 33.2 L9 22.5 Z" fill="currentColor" />
      {/* muchie de sub bord, pentru un strop de adâncime */}
      <path d="M9 22.5 L32 33.2 L55 22.5" fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="1.1" />

      {/* nasturele central + cordonul fix până la colțul drept (aur) */}
      <path d="M32 22.2 L55 22.7" stroke="#fbbf24" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="22.2" r="1.9" fill="#f59e0b" />

      {/* ciucurele care se leagănă — pivotează peste colțul drept al bordului (55, 22.7) */}
      <motion.g
        style={{ rotate: tasselRotate, transformOrigin: '55px 22.7px', transformBox: 'view-box' }}
      >
        <line x1="55" y1="22.7" x2="55" y2="39" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="55" cy="39.2" r="2.5" fill="#f59e0b" />
        <path
          d="M55 41.4 L52.4 50.5 M55 41.4 L54 51 M55 41.4 L55.6 51 M55 41.4 L57.5 50.5"
          stroke="#fbbf24"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
      </motion.g>
    </svg>
  )
}

export function ScrollGraduationCap() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()

  // Urmărire cu inerție: toca „aleargă” după poziția ta, fără salturi.
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.7 })
  const progress = reduce ? scrollYProgress : smooth

  // Poziția verticală pe șină.
  const capTop = useTransform(progress, [0, 1], ['0%', '100%'])

  // Viteza de derulare → balans de pendul + înclinare.
  const velocity = useVelocity(scrollYProgress)
  const smoothVel = useSpring(velocity, { stiffness: 180, damping: 22, mass: 0.6 })
  const tasselRotate = useTransform(smoothVel, [-3, 0, 3], [28, 0, -28], { clamp: true })
  const capTilt = useTransform(smoothVel, [-3, 0, 3], [-7, 0, 7], { clamp: true })

  // Aura de absolvire se aprinde spre finalul paginii.
  const auraOpacity = useTransform(progress, [0.8, 1], [0, 1])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed right-5 top-[18vh] bottom-[20vh] z-40 hidden lg:block xl:right-9"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.65, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative h-full w-10">
        {/* eticheta verticală, pe latura dinspre conținut (nu se taie la marginea ecranului) */}
        <span className="absolute right-full top-1/2 mr-3 -translate-y-1/2 rotate-180 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.42em] text-slate-400/70 [writing-mode:vertical-rl] dark:text-slate-500/70">
          Parcurs spre absolvire
        </span>

        {/* șina (traseul) */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rounded-full bg-border" />
        {/* umplerea șinei, până la poziția curentă */}
        <motion.div
          className="absolute inset-y-0 left-1/2 w-[2px] origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-primary to-primary/40"
          style={{ scaleY: progress }}
        />

        {/* capătul de pornire */}
        <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" />
        {/* reperele intermediare */}
        {RAIL_MARKERS.map((at) => (
          <RailMarker key={at} progress={progress} at={at} />
        ))}
        {/* nodul de absolvire (romb, ca bordul tocii) */}
        <span className="absolute bottom-0 left-1/2 size-2.5 -translate-x-1/2 translate-y-1/2 rotate-45 rounded-[2px] bg-primary shadow-lg shadow-primary/40" />

        {/* toca, călare pe șină */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ top: capTop }}
        >
          {/* aura de aur, spre final */}
          <motion.span
            className="absolute inset-0 -z-10 rounded-full bg-amber-400/40 blur-xl"
            style={{ opacity: auraOpacity, scale: 1.7 }}
          />
          {/* plutire ușoară în repaus */}
          <motion.div
            animate={reduce ? undefined : { y: [0, -3.5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* înclinare în direcția mișcării + umbră caldă */}
            <motion.div
              style={{ rotate: reduce ? 0 : capTilt }}
              className="drop-shadow-[0_6px_12px_rgba(15,23,42,0.28)]"
            >
              <Mortarboard tasselRotate={reduce ? 0 : tasselRotate} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
