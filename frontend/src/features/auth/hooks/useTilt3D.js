import { useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'

// Înclinare 3D care urmărește cursorul: rotateX/rotateY cu arcuri (spring), în același
// limbaj framer-motion folosit pe paginile publice. Dezactivată la prefers-reduced-motion
// și pe ecrane tactile (pointerType ≠ mouse), ca să nu tremure la derulare.
export function useTilt3D(maxTilt = 9) {
  const reduce = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const springCfg = { stiffness: 150, damping: 18, mass: 0.55 }
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), springCfg)
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), springCfg)

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const onPointerLeave = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return {
    px,
    py,
    reduce,
    style: reduce
      ? undefined
      : { rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 1100 },
    handlers: reduce ? {} : { onPointerMove, onPointerLeave },
  }
}
