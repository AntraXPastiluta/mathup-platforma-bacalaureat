import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { AlertMessage } from './AlertMessage'
import { Button } from './Button'

export function PremiumUpgradeModal() {
  const {
    premiumModalOpen,
    closePremiumModal,
    startPremiumCheckout,
    checkoutLoading,
    premiumExpiresAt,
    isPremium,
    errorMessage,
  } = useAuth()

  return (
    <AnimatePresence>
      {premiumModalOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closePremiumModal}
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-primary/20 bg-white p-8 shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePremiumModal}
              className="absolute right-4 top-4 rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:text-primary dark:border-white/10"
            >
              <X className="size-4" />
            </button>

            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/25">
                <Crown className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">ScholarBAC Premium</p>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Deblochează pregătirea completă
                </h2>
              </div>
            </div>

            <ul className="mb-8 space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <li>Acces la toate programele liceale și Subiectul III</li>
              <li>Lecții complete, quiz-uri, fișiere și materiale rezolvate</li>
              <li>Roadmap de studiu și progres complet până la finalul sezonului BAC</li>
            </ul>

            {errorMessage ? <AlertMessage message={errorMessage} className="mb-6" /> : null}

            {isPremium && premiumExpiresAt ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Premium activ până la {new Date(premiumExpiresAt).toLocaleDateString('ro-RO')}.
              </div>
            ) : (
              <Button
                onClick={startPremiumCheckout}
                disabled={checkoutLoading}
                className="h-14 w-full rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              >
                <Sparkles className="size-4" />
                {checkoutLoading ? 'Redirecționăm către Stripe...' : 'Cumpără Premium'}
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
