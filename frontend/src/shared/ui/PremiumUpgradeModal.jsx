import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Crown,
  Layers,
  Loader2,
  Lock,
  Route,
  ScrollText,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { PREMIUM_PRICE_LABEL } from '../../constants/premiumDisplay'
import { AlertMessage } from './AlertMessage'
import { Button } from './Button'

const PREMIUM_FEATURES = [
  {
    icon: Route,
    title: 'Roadmap personalizat',
    text: 'Plan de studiu pentru fiecare program, subiect și grad de importanță.',
  },
  {
    icon: ScrollText,
    title: 'Variante rezolvate',
    text: 'Acces la toate variantele de Bacalaureat deja rezolvate pas cu pas.',
  },
  {
    icon: Layers,
    title: 'Toate programele',
    text: 'Materialele complete pentru programele liceale M1, M2 și M3.',
  },
]

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

  const [checkoutPendingRaw, setCheckoutPendingRaw] = useState(false)
  const checkoutPending = premiumModalOpen && checkoutPendingRaw
  const isCheckoutBusy = checkoutPending || checkoutLoading

  const handleCheckout = useCallback(async () => {
    if (isCheckoutBusy) return
    setCheckoutPendingRaw(true)
    try {
      await startPremiumCheckout()
    } catch {
      setCheckoutPendingRaw(false)
    }
  }, [isCheckoutBusy, startPremiumCheckout])

  const handleClose = useCallback(() => {
    if (isCheckoutBusy) return
    setCheckoutPendingRaw(false)
    closePremiumModal()
  }, [closePremiumModal, isCheckoutBusy])

  return (
    <AnimatePresence>
      {premiumModalOpen && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={isCheckoutBusy ? undefined : handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-modal-title"
            className="premium-modal-card relative w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* ── Indigo ink header with gold foil sweep ── */}
            <div className="premium-modal-header px-7 pb-7 pt-6">
              <span className="premium-modal-foil" aria-hidden />

              <button
                type="button"
                onClick={handleClose}
                disabled={isCheckoutBusy}
                aria-label="Închide"
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white disabled:opacity-40"
              >
                <X className="size-4" />
              </button>

              <div className="relative flex items-center gap-4">
                <div className="premium-modal-medallion flex size-14 shrink-0 items-center justify-center rounded-2xl">
                  <Crown className="size-7 text-amber-950" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.32em] text-amber-200">
                    <Sparkles className="size-3" aria-hidden />
                    MathUP Premium
                  </p>
                  <h2
                    id="premium-modal-title"
                    className="mt-1 font-heading text-[1.7rem] font-extrabold leading-tight tracking-tight text-white"
                  >
                    Deblochează tot ce ai nevoie pentru BAC
                  </h2>
                </div>
              </div>

              <p className="relative mt-4 max-w-md text-sm font-medium leading-relaxed text-indigo-100/85">
                Roadmap-uri de studiu, variante rezolvate și toate programele liceale, într-un
                singur abonament.
              </p>
            </div>

            {/* ── Body ── */}
            <div className="px-7 pb-7 pt-6">
              <ul className="space-y-3.5">
                {PREMIUM_FEATURES.map(({ icon: Icon, title, text }, index) => (
                  <motion.li
                    key={title}
                    className="flex gap-3.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.32, delay: 0.12 + index * 0.07, ease: 'easeOut' }}
                  >
                    <span className="premium-modal-check mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="size-[1.05rem]" strokeWidth={2.25} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-snug text-slate-900 dark:text-white">
                        {title}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] font-medium leading-snug text-slate-500 dark:text-slate-400">
                        {text}
                      </span>
                    </span>
                  </motion.li>
                ))}
              </ul>

              <div className="premium-modal-price mt-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                    Preț abonament
                  </p>
                  {PREMIUM_PRICE_LABEL ? (
                    <p className="mt-1 font-heading text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {PREMIUM_PRICE_LABEL}
                    </p>
                  ) : (
                    <p className="mt-1 text-[0.8125rem] font-medium leading-snug text-slate-600 dark:text-slate-300">
                      Suma exactă și perioada de facturare apar în pagina securizată Stripe.
                    </p>
                  )}
                </div>
                <Crown className="size-7 shrink-0 text-amber-500/80" aria-hidden />
              </div>

              {errorMessage ? <AlertMessage message={errorMessage} className="mt-5" /> : null}

              {isPremium && premiumExpiresAt ? (
                <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-5 shrink-0" aria-hidden />
                  Premium activ până la {new Date(premiumExpiresAt).toLocaleDateString('ro-RO')}.
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    motionless
                    onClick={handleCheckout}
                    disabled={isCheckoutBusy}
                    aria-busy={isCheckoutBusy}
                    className="premium-modal-cta mt-5 h-14 w-full rounded-2xl text-[11px] font-black uppercase tracking-[0.16em]"
                  >
                    {isCheckoutBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="size-4" aria-hidden />
                    )}
                    {isCheckoutBusy ? 'Redirecționăm către plată...' : 'Continuă către plată'}
                  </Button>

                  <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-500">
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    Plată securizată prin Stripe · poți revizui totul înainte de confirmare
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
