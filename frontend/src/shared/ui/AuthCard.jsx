import { useState } from 'react'
import { motion } from 'framer-motion'

export function AuthCard({ children, title, description, footer, className = '' }) {
  const [documentMark] = useState(() => Math.floor(Math.random() * 1000))
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group ${className}`.trim()}
    >
      <div className="absolute -inset-2 bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-border rounded-[1.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        {/* Academic Seal detail */}
        <div className="absolute -top-10 -right-10 size-40 bg-primary/5 rounded-full border-2 border-primary/10 flex items-center justify-center p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-500">
           <div className="size-full rounded-full border border-dashed border-primary/30" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-col space-y-3 pb-10 border-b-2 border-border mb-10">
            {title && (
              <h3 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-relaxed">
                {description}
              </p>
            )}
          </div>
          
          <div className="space-y-6">
            {children}
          </div>
          
          {footer && (
            <div className="flex items-center justify-center pt-10 border-t-2 border-border mt-10">
              {footer}
            </div>
          )}
        </div>
        
        {/* Subtle numbering or academic mark */}
        <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.5em] select-none pointer-events-none">
          Document MU-{documentMark}
        </div>
      </div>
    </motion.div>
  )
}
