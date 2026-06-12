import { motion } from 'framer-motion'

export function ProgressBar({ value, max = 100, className = '' }) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100)

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1 flex justify-end">
        <span className="text-xs font-medium text-muted-foreground">{Math.round(percentage)}% finalizat</span>
      </div>
    </div>
  )
}
