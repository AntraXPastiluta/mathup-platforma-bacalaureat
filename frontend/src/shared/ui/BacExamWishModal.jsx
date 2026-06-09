import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GraduationCap, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { fetchBacExamDate } from '../../services/platformSettingsService'
import { formatBacExamDateInput, getDaysUntilExam } from '../utils/bacExamDate'
import { Button } from './Button'

const STORAGE_PREFIX = 'mathup_bac_wish_seen_v1_'

/** Cheia de localStorage e legată de data examenului, deci reapare la examenul din anul următor. */
function readSeen(key) {
  try {
    if (typeof window === 'undefined') return false
    return Boolean(window.localStorage?.getItem(key))
  } catch {
    return false
  }
}

function markSeen(key) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(key, '1')
    }
  } catch {
    // localStorage indisponibil — ignorăm, pop-up-ul e non-critic.
  }
}

/**
 * Pop-up de încurajare afișat cu o zi înainte de examenul de Bacalaureat.
 * Doar pentru elevii logați (exclude admin/profesor). Montat global în App.jsx.
 */
export function BacExamWishModal() {
  const { user, authLoading, isAdmin, adminLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [storageKey, setStorageKey] = useState('')

  useEffect(() => {
    if (authLoading || adminLoading || !user || isAdmin) return undefined

    let cancelled = false

    async function checkExamProximity() {
      try {
        const examDate = await fetchBacExamDate()
        if (cancelled) return

        // Doar cu exact o zi înainte de examen.
        if (getDaysUntilExam(examDate) !== 1) return

        const key = `${STORAGE_PREFIX}${formatBacExamDateInput(examDate)}`
        if (readSeen(key)) return

        setStorageKey(key)
        setOpen(true)
      } catch {
        // Eșec silențios: pop-up-ul de încurajare nu trebuie să blocheze aplicația.
      }
    }

    checkExamProximity()

    return () => {
      cancelled = true
    }
  }, [authLoading, adminLoading, user, isAdmin])

  const handleClose = useCallback(() => {
    if (storageKey) markSeen(storageKey)
    setOpen(false)
  }, [storageKey])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bac-wish-title"
            className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* ── Header festiv ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-7 pb-7 pt-6">
              <button
                type="button"
                onClick={handleClose}
                aria-label="Închide"
                className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="size-4" />
              </button>

              <div className="relative flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                  <GraduationCap className="size-7 text-white" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.32em] text-indigo-200">
                    <Sparkles className="size-3" aria-hidden />
                    Echipa MathUP
                  </p>
                  <h2
                    id="bac-wish-title"
                    className="mt-1 font-heading text-[1.6rem] font-extrabold leading-tight tracking-tight text-white"
                  >
                    Mult succes la Bacalaureat! 🎓
                  </h2>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="px-7 pb-7 pt-6">
              <p className="text-[0.9375rem] font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                Echipa MathUP îți urează mult succes la examenul de Bacalaureat! Fii încrezător în
                tine și atent la cerințele subiectului — citește cu calm fiecare enunț, gândește-te
                bine înainte să răspunzi și verifică-ți rezolvările la final.
              </p>
              <p className="mt-3 text-[0.9375rem] font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                Respiră adânc, odihnește-te bine diseară și ai încredere în tot ce ai învățat. Ești
                pregătit. Îți ținem pumnii! 💪
              </p>

              <Button
                type="button"
                motionless
                onClick={handleClose}
                className="mt-6 h-14 w-full rounded-2xl"
              >
                <Sparkles className="size-4" aria-hidden />
                Mulțumesc!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
