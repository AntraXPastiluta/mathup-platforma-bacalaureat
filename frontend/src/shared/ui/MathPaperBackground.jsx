import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const EQUATIONS = [
  'x^2 + y^2 = r^2',
  '∫ f(x) dx',
  'lim(x→0) sin(x)/x = 1',
  'a^2 + b^2 = c^2',
  'sin^2 θ + cos^2 θ = 1',
  'f\'(x) = lim(h→0) [f(x+h)-f(x)]/h',
  '∑(k=1)^n k = n(n+1)/2',
  'Δ = b^2 - 4ac',
  'log_a(xy) = log_a x + log_a y',
  'e^{iπ} + 1 = 0',
  '∇·F = ∂F_x/∂x + ∂F_y/∂y',
  'P(A∩B) = P(A)P(B|A)',
  'z = a + bi',
  '∫_0^1 x^2 dx = 1/3',
  'y = mx + b',
  'det(A) ≠ 0',
  '√(a^2 + b^2)',
  'π ≈ 3.14159',
  'd/dx(x^n) = nx^{n-1}',
  '∫ e^x dx = e^x + C',
]

const MAX_FLAKES = 28
const MAX_FLAKES_LITE = 6
const IDLE_MS = 2400
const IDLE_MS_LITE = 5000
const LITE_PATH_PREFIXES = []
const DASHBOARD_PATH = '/dashboard'

/** Routes that render MathRainCurtain — skip global framer flakes to avoid double animation + scroll jank. */
function usesPageMathRain(pathname) {
  return pathname === '/'
    || pathname.startsWith('/dashboard')
    || pathname.startsWith('/profile')
    || pathname.startsWith('/lessons')
}

function pickEquation() {
  return EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)]
}

export function MathPaperBackground() {
  const { pathname } = useLocation()
  const disabled = usesPageMathRain(pathname)
  const liteMode = !disabled && LITE_PATH_PREFIXES.some((path) => pathname.startsWith(path))
  const isDashboard = !disabled && pathname.startsWith(DASHBOARD_PATH)
  const maxFlakes = liteMode ? MAX_FLAKES_LITE : isDashboard ? 22 : MAX_FLAKES
  const idleMs = liteMode ? IDLE_MS_LITE : isDashboard ? 2800 : IDLE_MS

  const [flakes, setFlakes] = useState([])
  const nextId = useRef(0)
  const prefersReducedMotion = useRef(false)

  const spawnFlakes = useCallback((count = 1) => {
    if (prefersReducedMotion.current) return

    const created = Array.from({ length: count }, () => ({
      id: nextId.current++,
      text: pickEquation(),
      left: 4 + Math.random() * 92,
      duration: 9 + Math.random() * 8,
      drift: -14 + Math.random() * 28,
      size: 0.78 + Math.random() * 0.42,
    }))

    setFlakes((prev) => [...prev, ...created].slice(-maxFlakes))
  }, [maxFlakes])

  const removeFlake = useCallback((id) => {
    setFlakes((prev) => prev.filter((flake) => flake.id !== id))
  }, [])

  useEffect(() => {
    if (disabled) return undefined

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = media.matches

    const onMotionChange = (event) => {
      prefersReducedMotion.current = event.matches
      if (event.matches) setFlakes([])
    }

    media.addEventListener('change', onMotionChange)
    queueMicrotask(() => {
      setFlakes([])
      spawnFlakes(liteMode ? 2 : 4)
    })

    const idleTimer = window.setInterval(() => spawnFlakes(1), idleMs)

    return () => {
      media.removeEventListener('change', onMotionChange)
      window.clearInterval(idleTimer)
    }
  }, [disabled, spawnFlakes, liteMode, idleMs])

  if (disabled) {
    return null
  }

  return (
    <div
      aria-hidden
      className={`math-paper-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden${liteMode ? ' math-paper-bg--lite' : ''} border-8 border-transparent`}
      style={{
        backgroundImage: `
          linear-gradient(var(--border) 0.5px, transparent 0.5px),
          linear-gradient(90deg, var(--border) 0.5px, transparent 0.5px)
        `,
        backgroundSize: '32px 32px',
        opacity: 0.4
      }}
    >
      <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/80" />
      {flakes.map((flake) => (
        <motion.span
          key={flake.id}
          className="math-equation-fall font-serif italic"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 0.15, y: '100vh' }}
          transition={{ duration: flake.duration, ease: 'linear' }}
          style={{
            left: `${flake.left}%`,
            '--math-drift': `${flake.drift}px`,
            fontSize: `${flake.size}rem`,
            color: 'var(--primary)',
            filter: 'blur(0.5px)'
          }}
          onAnimationEnd={() => removeFlake(flake.id)}
        >
          {flake.text}
        </motion.span>
      ))}
    </div>
  )
}
