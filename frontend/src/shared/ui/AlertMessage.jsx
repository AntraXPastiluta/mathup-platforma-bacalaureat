import { motion, AnimatePresence } from 'framer-motion'
import { Info, CheckCircle2, AlertTriangle, X } from 'lucide-react'

const variants = {
  error: {
    container: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800/30',
    icon: AlertTriangle,
    accent: 'bg-red-500'
  },
  success: {
    container: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-400 dark:border-emerald-800/30',
    icon: CheckCircle2,
    accent: 'bg-emerald-500'
  },
  info: {
    container: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/10 dark:text-indigo-400 dark:border-indigo-800/30',
    icon: Info,
    accent: 'bg-indigo-500'
  }
}

export function AlertMessage({ message, type, variant, className = '', onClose }) {
  if (!message) return null

  const resolvedType = type || variant || 'error'
  const config = variants[resolvedType] || variants.error
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={`relative overflow-hidden rounded-xl border-2 px-6 py-4 shadow-sm backdrop-blur-sm ${config.container} ${className}`.trim()}
        role="alert"
      >
        <div className={`absolute top-0 left-0 h-full w-1.5 ${config.accent}`} />
        
        <div className="flex items-center gap-4">
          <Icon className="size-5 shrink-0" />
          <div className="flex-1 text-[11px] font-black uppercase tracking-widest leading-tight">
            {message}
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
