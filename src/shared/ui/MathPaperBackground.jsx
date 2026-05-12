import { useCallback, useEffect, useRef, useState } from 'react'

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
const IDLE_MS = 2400
const SCROLL_THROTTLE_MS = 140

function pickEquation() {
  return EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)]
}

export function MathPaperBackground() {
  const [flakes, setFlakes] = useState([])
  const nextId = useRef(0)
  const lastScrollSpawn = useRef(0)
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

    setFlakes((prev) => [...prev, ...created].slice(-MAX_FLAKES))
  }, [])

  const removeFlake = useCallback((id) => {
    setFlakes((prev) => prev.filter((flake) => flake.id !== id))
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = media.matches

    const onMotionChange = (event) => {
      prefersReducedMotion.current = event.matches
      if (event.matches) setFlakes([])
    }

    media.addEventListener('change', onMotionChange)
    spawnFlakes(4)

    const idleTimer = window.setInterval(() => spawnFlakes(1), IDLE_MS)
    const onScroll = () => {
      if (prefersReducedMotion.current) return
      const now = Date.now()
      if (now - lastScrollSpawn.current < SCROLL_THROTTLE_MS) return
      lastScrollSpawn.current = now
      spawnFlakes(Math.random() > 0.55 ? 2 : 1)
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      media.removeEventListener('change', onMotionChange)
      window.clearInterval(idleTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [spawnFlakes])

  return (
    <div
      aria-hidden
      className="math-paper-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {flakes.map((flake) => (
        <span
          key={flake.id}
          className="math-equation-fall"
          style={{
            left: `${flake.left}%`,
            animationDuration: `${flake.duration}s`,
            '--math-drift': `${flake.drift}px`,
            fontSize: `${flake.size}rem`,
          }}
          onAnimationEnd={() => removeFlake(flake.id)}
        >
          {flake.text}
        </span>
      ))}
    </div>
  )
}
