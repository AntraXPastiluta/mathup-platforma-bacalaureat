export function AuthCard({ children, title, description, footer, className = '' }) {
  return (
    <div className={`relative group ${className}`.trim()}>
      <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-[2rem] blur-xl opacity-25 group-hover:opacity-40 transition-opacity" />
      <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none -mr-16 -mt-16 rounded-full" />
        
        <div className="relative z-10">
          <div className="flex flex-col space-y-2 pb-8">
            {title && <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">{title}</h3>}
            {description && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
          </div>
          <div className="space-y-4">
            {children}
          </div>
          {footer && (
            <div className="flex items-center pt-8 border-t border-slate-100 dark:border-white/5 mt-8">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
