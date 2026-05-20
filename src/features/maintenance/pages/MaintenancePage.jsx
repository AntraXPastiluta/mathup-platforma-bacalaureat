import { motion } from 'framer-motion'
import { Hammer, Sparkles } from 'lucide-react'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function MaintenancePage() {
  return (
    <motion.div
      className="min-h-screen flex items-center justify-center p-6 text-slate-900 dark:text-slate-50"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="w-full max-w-xl rounded-[2.5rem] border border-slate-200/70 bg-white/85 p-10 text-center shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/25">
          <BrandLogo className="size-8" />
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary">MathUP</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Platforma este în mentenanță</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground">
          Lucrăm la îmbunătățiri și revenim online în curând. Îți mulțumim pentru răbdare.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-left">
          <Hammer className="size-5 shrink-0 text-primary" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Dacă ai nevoie urgentă de acces, contactează echipa MathUP.
          </p>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Sparkles className="size-3.5 text-primary" />
          Revenim curând
        </div>
      </div>
    </motion.div>
  )
}
