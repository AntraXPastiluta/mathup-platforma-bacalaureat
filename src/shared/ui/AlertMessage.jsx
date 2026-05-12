const variants = {
  error: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/20',
  info: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20',
}

export function AlertMessage({ message, type = 'error', className = '' }) {
  if (!message) return null

  const variantStyles = variants[type] || variants.error

  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-sm font-bold backdrop-blur-md shadow-sm ${variantStyles} ${className}`.trim()}
      role="alert"
    >
      <div className="flex items-center gap-3">
         {type === 'success' && <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
         {type === 'error' && <div className="size-2 rounded-full bg-destructive animate-pulse" />}
         {type === 'info' && <div className="size-2 rounded-full bg-primary animate-pulse" />}
         {message}
      </div>
    </div>
  )
}
