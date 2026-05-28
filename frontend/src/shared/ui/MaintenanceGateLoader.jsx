export function MaintenanceGateLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div
        className="size-10 border-2 border-primary/30 border-t-primary animate-spin rounded-full"
        role="status"
        aria-label="Se încarcă"
      />
    </div>
  )
}
