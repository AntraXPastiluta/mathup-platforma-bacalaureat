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
  'tan α = sin α / cos α',
  'log(ab) = log a + log b',
  'n! = n · (n−1)!',
  'φ = (1 + √5) / 2',
  '∂z/∂x',
  'eˣ = ∑ xⁿ/n!',
]

function getRainColumnCount() {
  if (typeof window === 'undefined') return 9
  const w = window.innerWidth
  if (w < 640) return 6
  if (w < 1024) return 9
  return 12
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
      // O picătură rară devine „cometă”: mai luminoasă, mai rapidă, cu o coadă strălucitoare.
      const isMeteor = rand() > 0.86

      // depth ∈ [0,1]: 0 = fundal (mic, estompat, lent), 1 = prim-plan (mare, clar, rapid).
      // Cometele stau mereu în prim-plan ca să nu apară blurate.
      const depth = isMeteor ? 0.2 + rand() * 0.05 : rand()

      const left = 1 + (i / columnCount) * 98 + rand() * (98 / columnCount - 0.5)
      const duration = (isMeteor ? 14 : 38) - depth * 12 + rand() * 6
      const delay = -(rand() * duration)
      const drift = -16 + rand() * 32
      const size = 0.55 + depth * 0.72 + rand() * 0.14
      const opacity = (isMeteor ? 0.6 : 0.16) + depth * 0.32
      const blur = (1 - depth) * 1.5
      const hue = -18 + rand() * 46

      // Legănare orizontală + balans de rotație, aplicate pe un element interior
      // ca să nu intre în conflict cu transform-ul de cădere verticală al părintelui.
      const sway = 8 + rand() * 24
      const swayDur = 6 + rand() * 6
      const swayDelay = -(rand() * swayDur)
      const spin = (-6 + rand() * 12).toFixed(1)
      const twinkleDur = 4 + rand() * 5
      const twinkleDelay = -(rand() * twinkleDur)

      const eq = EQUATIONS[Math.floor(rand() * EQUATIONS.length)]
      return {
        id: i,
        isMeteor,
        left,
        duration,
        delay,
        drift,
        driftEnd: -drift,
        size,
        opacity,
        blur,
        hue,
        sway,
        swayDur,
        swayDelay,
        spin,
        twinkleDur,
        twinkleDelay,
        eq,
      }
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
      <div className="math-aurora absolute inset-0" />

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
          <span
            className={`math-rain-glyph${d.isMeteor ? ' is-meteor' : ''}`}
            style={{
              '--glyph-hue': d.hue,
              '--drop-opacity': d.opacity,
              '--drop-blur': `${d.blur}px`,
              '--sway': `${d.sway}px`,
              '--sway-dur': `${d.swayDur}s`,
              '--sway-delay': `${d.swayDelay}s`,
              '--spin': `${d.spin}deg`,
              '--twinkle-dur': `${d.twinkleDur}s`,
              '--twinkle-delay': `${d.twinkleDelay}s`,
            }}
          >
            {d.eq}
          </span>
        </span>
      ))}
    </div>
  )
}
