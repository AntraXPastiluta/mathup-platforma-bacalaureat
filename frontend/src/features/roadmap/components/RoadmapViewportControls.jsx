import { Focus, Grid3x3, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'

export function RoadmapViewportControls({
  scale,
  showGrid,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
  onToggleGrid,
}) {
  const zoomPercent = Math.round(scale * 100)

  return (
    <div
      data-roadmap-control
      className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2"
    >
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onZoomOut}
          className="size-9 rounded-xl p-0"
          aria-label="Zoom out"
        >
          <Minus className="size-4" />
        </Button>
        <span className="min-w-[3rem] text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
          {zoomPercent}%
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onZoomIn}
          className="size-9 rounded-xl p-0"
          aria-label="Zoom in"
        >
          <Plus className="size-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onFit}
          className="size-9 rounded-xl p-0"
          aria-label="Fit to content"
        >
          <Maximize2 className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="size-9 rounded-xl p-0"
          aria-label="Reset view"
        >
          <RotateCcw className="size-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showGrid ? 'default' : 'ghost'}
          onClick={onToggleGrid}
          className="size-9 rounded-xl p-0"
          aria-label="Toggle grid"
        >
          <Grid3x3 className="size-4" />
        </Button>
      </div>
      <p className="flex items-center gap-1 rounded-lg bg-slate-900/70 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white/80 backdrop-blur dark:bg-slate-950/80">
        <Focus className="size-3" />
        Scroll = zoom · Space + drag = pan
      </p>
    </div>
  )
}
