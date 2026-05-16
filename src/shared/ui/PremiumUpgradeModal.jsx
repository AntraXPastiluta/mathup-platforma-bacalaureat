import { AnimatePresence, motion } from 'framer-motion'
import { Check, Crown, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { PREMIUM_PRICE_LABEL } from '../../constants/premiumDisplay'
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
                  Deblochează roadmap-ul de studiu
                </h2>
              </div>
            </div>

            <p className="mb-5 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              Acces la roadmap-ul de studiu, variante rezolvate și toate programele liceale.
            </p>

            <ul className="mb-6 list-none space-y-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>Roadmap de studiu publicat de administrator</span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>Variante deja rezolvate (documente pe program)</span>
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>Toate programele liceale</span>
              </li>
            </ul>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Preț abonament
              </p>
              {PREMIUM_PRICE_LABEL ? (
                <p className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">{PREMIUM_PRICE_LABEL}</p>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Suma exactă și perioada de facturare apar în pagina securizată Stripe, înainte de plată.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">Plată securizată · poți revizui totul înainte de confirmare</p>
            </div>

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
                {checkoutLoading ? 'Redirecționăm către plată...' : 'Continuă către plată'}
              </Button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
