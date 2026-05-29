import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clampViewportOffset, getContentBounds, getViewCenter } from '../utils/canvasLayout'

export const MIN_SCALE = 0.05
export const MAX_SCALE = 2
export const DEFAULT_SCALE = 1
const ZOOM_FACTOR = 1.12

export function loadViewFromSession(key) {
  if (!key || typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`roadmap-view:${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.scale === 'number'
      && typeof parsed.offsetX === 'number'
      && typeof parsed.offsetY === 'number'
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

export function saveViewToSession(key, view) {
  if (!key || typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`roadmap-view:${key}`, JSON.stringify(view))
  } catch {
    /* ignore */
  }
}

function clampScale(value, minScale = MIN_SCALE) {
  return Math.min(Math.max(value, minScale), MAX_SCALE)
}

export function useRoadmapViewport({
  viewportRef,
  nodes,
  persistKey = null,
  fitOnLoad = false,
}) {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [spacePressed, setSpacePressed] = useState(false)
  const panStateRef = useRef(null)
  const fittedKeysRef = useRef(new Set())
  const scaleRef = useRef(DEFAULT_SCALE)
  const contentBounds = useMemo(() => getContentBounds(nodes), [nodes])

  const getView = useCallback(
    () => ({ scale, offsetX: offset.x, offsetY: offset.y }),
    [scale, offset.x, offset.y],
  )

  const getMinScale = useCallback(() => {
    const el = viewportRef.current
    if (!el) return MIN_SCALE

    const fitScale = Math.min(
      el.clientWidth / contentBounds.width,
      el.clientHeight / contentBounds.height,
    ) * 0.95

    return Math.max(MIN_SCALE, Math.min(DEFAULT_SCALE, fitScale))
  }, [contentBounds.height, contentBounds.width, viewportRef])

  const clampOffset = useCallback((nextOffset, nextScale = scaleRef.current) => {
    const el = viewportRef.current
    if (!el) return nextOffset
    return clampViewportOffset(
      nextOffset,
      nextScale,
      el.clientWidth,
      el.clientHeight,
      contentBounds,
    )
  }, [contentBounds, viewportRef])

  const centerViewAtScale = useCallback((targetScale) => {
    const el = viewportRef.current
    if (!el) return

    const center = getViewCenter(nodes)
    const nextScale = clampScale(targetScale, getMinScale())

    setScale(nextScale)
    setOffset(clampOffset({
      x: el.clientWidth / 2 - center.x * nextScale,
      y: el.clientHeight / 2 - center.y * nextScale,
    }, nextScale))
  }, [clampOffset, getMinScale, nodes, viewportRef])

  const applyView = useCallback((view) => {
    const el = viewportRef.current
    const minScale = el ? Math.max(MIN_SCALE, Math.min(
      DEFAULT_SCALE,
      Math.min(el.clientWidth / contentBounds.width, el.clientHeight / contentBounds.height) * 0.95,
    )) : MIN_SCALE

    setScale(clampScale(view.scale, minScale))
    setOffset(clampOffset(
      { x: view.offsetX, y: view.offsetY },
      clampScale(view.scale, minScale),
    ))
  }, [clampOffset, contentBounds.height, contentBounds.width, viewportRef])

  const fitToContent = useCallback(() => {
    const el = viewportRef.current
    if (!el) return

    const viewportWidth = el.clientWidth
    const viewportHeight = el.clientHeight
    const scaleX = viewportWidth / contentBounds.width
    const scaleY = viewportHeight / contentBounds.height
    const nextScale = clampScale(Math.min(scaleX, scaleY) * 0.9, getMinScale())
    const centerX = (contentBounds.minX + contentBounds.maxX) / 2
    const centerY = (contentBounds.minY + contentBounds.maxY) / 2

    setScale(nextScale)
    setOffset(clampOffset({
      x: viewportWidth / 2 - centerX * nextScale,
      y: viewportHeight / 2 - centerY * nextScale,
    }, nextScale))
  }, [clampOffset, contentBounds, getMinScale, viewportRef])

  const resetView = useCallback(() => {
    centerViewAtScale(DEFAULT_SCALE)
  }, [centerViewAtScale])

  const zoomBy = useCallback((direction, anchorX, anchorY) => {
    const minScale = getMinScale()
    setScale((currentScale) => {
      const nextScale = clampScale(
        direction > 0 ? currentScale * ZOOM_FACTOR : currentScale / ZOOM_FACTOR,
        minScale,
      )
      if (nextScale === currentScale) return currentScale

      // Zoom „ancorat”: ajustăm offset-ul astfel încât punctul de sub cursor (anchorX/Y)
      // să rămână fix pe ecran în timp ce se modifică scala.
      const ratio = nextScale / currentScale
      setOffset((currentOffset) => clampOffset({
        x: anchorX - (anchorX - currentOffset.x) * ratio,
        y: anchorY - (anchorY - currentOffset.y) * ratio,
      }, nextScale))
      return nextScale
    })
  }, [clampOffset, getMinScale])

  const zoomIn = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    zoomBy(1, el.clientWidth / 2, el.clientHeight / 2)
  }, [viewportRef, zoomBy])

  const zoomOut = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    zoomBy(-1, el.clientWidth / 2, el.clientHeight / 2)
  }, [viewportRef, zoomBy])

  const screenToWorld = useCallback(
    (clientX, clientY) => {
      const el = viewportRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      return {
        x: (clientX - rect.left - offset.x) / scale,
        y: (clientY - rect.top - offset.y) / scale,
      }
    },
    [offset.x, offset.y, scale, viewportRef],
  )

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault()
      const el = viewportRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const anchorX = event.clientX - rect.left
      const anchorY = event.clientY - rect.top
      const direction = event.deltaY < 0 ? 1 : -1
      zoomBy(direction, anchorX, anchorY)
    },
    [viewportRef, zoomBy],
  )

  const canPan = useCallback(
    (event) => event.button === 1 || spacePressed || event.button === 0,
    [spacePressed],
  )

  const handlePointerDownPan = useCallback(
    (event) => {
      if (!canPan(event)) return false
      if (event.target.closest('[data-roadmap-node]') || event.target.closest('[data-roadmap-control]')) {
        return false
      }

      panStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
      return true
    },
    [canPan, offset.x, offset.y],
  )

  const handlePointerMovePan = useCallback((event) => {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return

    setOffset(clampOffset({
      x: panState.originX + (event.clientX - panState.startX),
      y: panState.originY + (event.clientY - panState.startY),
    }))
  }, [clampOffset])

  const handlePointerUpPan = useCallback((event) => {
    const panState = panStateRef.current
    if (!panState || panState.pointerId !== event.pointerId) return
    panStateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  // După ce nodurile se schimbă, re-limităm offset-ul ca să nu rămână conținut în afara
  // cadrului. queueMicrotask amână până se aplică noile dimensiuni de conținut.
  useEffect(() => {
    queueMicrotask(() => {
      setOffset((current) => clampOffset(current))
    })
  }, [nodes, clampOffset])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return undefined

    const observer = new ResizeObserver(() => {
      setOffset((current) => clampOffset(current))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [clampOffset, viewportRef])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Space' && !event.repeat) {
        setSpacePressed(true)
      }
    }
    const onKeyUp = (event) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
        panStateRef.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // La încărcare: dacă există o vizualizare salvată în sesiune o restaurăm; altfel, prima
  // dată când vedem acest persistKey, încadrăm automat conținutul (fitOnLoad).
  // fittedKeysRef previne reîncadrarea repetată pentru aceeași hartă.
  useEffect(() => {
    if (!persistKey) return undefined
    const saved = loadViewFromSession(persistKey)
    if (saved) {
      const timer = window.setTimeout(() => applyView(saved), 0)
      fittedKeysRef.current.add(persistKey)
      return () => window.clearTimeout(timer)
    }
    if (fitOnLoad && !fittedKeysRef.current.has(persistKey)) {
      fittedKeysRef.current.add(persistKey)
      const timer = window.setTimeout(() => {
        if (nodes.length === 0) {
          centerViewAtScale(DEFAULT_SCALE)
        } else {
          fitToContent()
        }
      }, 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [persistKey, fitOnLoad, applyView, fitToContent, centerViewAtScale, nodes.length])

  useEffect(() => {
    if (!persistKey) return
    saveViewToSession(persistKey, getView())
  }, [persistKey, getView])

  return {
    scale,
    offset,
    showGrid,
    setShowGrid,
    fitToContent,
    resetView,
    zoomIn,
    zoomOut,
    screenToWorld,
    handleWheel,
    handlePointerDownPan,
    handlePointerMovePan,
    handlePointerUpPan,
    spacePressed,
  }
}
