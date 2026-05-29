import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

const EQUATIONS = [
  'x² + y² = r²',
  '∫ f(x) dx',
  'lim sin(x)/x = 1',
  'a² + b² = c²',
  'sin²θ + cos²θ = 1',
  'Δ = b² − 4ac',
  'eⁱᵖ + 1 = 0',
  '∑ k = n(n+1)/2',
  'a² + 2ab + b²',
  'sin(2α) = 2 sin α cos α',
  'd/dx(xⁿ) = nxⁿ⁻¹',
  'Aria = πr²',
  'z = a + bi',
  'V = (4/3)πr³',
  'Sₙ = n(a₁ + aₙ)/2',
  '√(a·b) = √a · √b',
]

function getRainColumnCount() {
  if (typeof window === 'undefined') return 16
  const w = window.innerWidth
  if (w < 640) return 10
  if (w < 1024) return 14
  return 18
}

function subscribeRainColumns(onStoreChange) {
  const mqSm = window.matchMedia('(max-width: 639px)')
  const mqMd = window.matchMedia('(max-width: 1023px)')
  const notify = () => onStoreChange()
  mqSm.addEventListener('change', notify)
  mqMd.addEventListener('change', notify)
  return () => {
    mqSm.removeEventListener('change', notify)
    mqMd.removeEventListener('change', notify)
  }
}

function useRainColumnCount() {
  return useSyncExternalStore(subscribeRainColumns, getRainColumnCount, () => 16)
}

// Generator pseudo-aleator cu sămânță (LCG): pozițiile „ploii” de ecuații trebuie să fie
// stabile între re-randări, altfel picăturile ar sări la fiecare update de stare.
function seededRand(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function MathRainCurtain() {
  const rootRef = useRef(null)
  const columnCount = useRainColumnCount()

  const drops = useMemo(() => {
    const rand = seededRand(42 + columnCount)
    return Array.from({ length: columnCount }, (_, i) => {
      const left = 1 + (i / columnCount) * 98 + rand() * (98 / columnCount - 0.5)
      const duration = 14 + rand() * 10
      const delay = -(rand() * 24)
      const drift = -12 + rand() * 24
      const size = 0.65 + rand() * 0.35
      const eq = EQUATIONS[Math.floor(rand() * EQUATIONS.length)]
      return { id: i, left, duration, delay, drift, driftEnd: -drift, size, eq }
    })
  }, [columnCount])

  useEffect(() => {
    const root = rootRef.current
    document.documentElement.dataset.ambientPage = 'true'

    // Oprim animația când tab-ul nu este vizibil, ca să nu consumăm CPU/baterie degeaba.
    const syncPaused = () => {
      const paused = document.hidden
      root?.classList.toggle('math-rain-paused', paused)
      document.documentElement.classList.toggle('ambient-paused', paused)
    }
    syncPaused()
    document.addEventListener('visibilitychange', syncPaused)
    return () => {
      document.removeEventListener('visibilitychange', syncPaused)
      root?.classList.remove('math-rain-paused')
      document.documentElement.classList.remove('ambient-paused')
      delete document.documentElement.dataset.ambientPage
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="math-rain-curtain pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="math-notebook-bg absolute inset-0" />

      {drops.map((d) => (
        <span
          key={d.id}
          className="math-rain-drop"
          style={{
            left: `${d.left}%`,
            fontSize: `${d.size}rem`,
            '--rain-dur': `${d.duration}s`,
            '--rain-delay': `${d.delay}s`,
            '--rain-drift': `${d.drift}px`,
            '--rain-drift-end': `${d.driftEnd}px`,
          }}
        >
          {d.eq}
        </span>
      ))}
    </div>
  )
}
