import { motion } from 'framer-motion'

const variants = {
  primary:
    'bg-[var(--primary)] text-[var(--primary-foreground)] border-2 border-[var(--primary)] hover:bg-transparent hover:text-[var(--primary)]',
  secondary:
    'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600',
  outline:
    'border-2 border-slate-800 text-slate-900 dark:border-slate-200 dark:text-white bg-white dark:bg-transparent hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900',
  ghost:
    'bg-transparent text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10',
  link: 'text-[var(--primary)] underline-offset-8 hover:underline font-black',
}

const sizes = {
  default: 'h-12 px-6 py-2',
  sm: 'h-10 rounded-md px-4',
  lg: 'h-14 rounded-lg px-10 text-base',
  icon: 'h-12 w-12',
}

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  className = '',
  disabled = false,
  motionless = false,
  ...rest
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-lg text-xs font-black uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]'

  const variantStyles = variants[variant] || variants.primary
  const sizeStyles = sizes[size] || sizes.default
  const composedClassName = `${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim()

  if (motionless) {
    return (
      <button className={composedClassName} disabled={disabled} {...rest}>
        {children}
      </button>
    )
  }

  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={composedClassName}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
