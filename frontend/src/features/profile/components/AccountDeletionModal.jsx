import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ShieldAlert, Trash2, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'

export function AccountDeletionModal({
  open,
  onClose,
  phase,
  deletionCode,
  onDeletionCodeChange,
  loading,
  error,
  onRequestCode,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)
  const codeInputRef = useRef(null)
  const awaitingCode = phase === 'awaiting_code'

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, loading])

  useEffect(() => {
    if (open && awaitingCode) {
      codeInputRef.current?.focus()
    }
  }, [open, awaitingCode])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-deletion-title"
            tabIndex={-1}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] border-2 border-red-200 bg-white shadow-2xl dark:border-red-900/40 dark:bg-slate-900"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-red-600 to-red-500 px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <ShieldAlert className="size-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/80">
                      Securitate cont
                    </p>
                    <h2 id="account-deletion-title" className="text-xl font-black tracking-tight">
                      {awaitingCode ? 'Confirmă ștergerea' : 'Ștergere cont'}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:text-white disabled:opacity-50"
                  aria-label="Închide"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {error ? <AlertMessage message={error} type="error" /> : null}

              {!awaitingCode ? (
                <>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Această acțiune este <strong>permanentă și ireversibilă</strong>. Vei pierde tot
                    progresul, abonamentul Premium și datele asociate contului.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Îți vom trimite un cod de 6 cifre pe email. Introdu codul în pasul următor pentru
                    a confirma ștergerea.
                  </p>
                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={onRequestCode}
                      disabled={loading}
                      className="h-14 flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-red-900/30"
                    >
                      {loading ? 'Se trimite codul...' : (
                        <span className="flex items-center justify-center gap-2">
                          <Trash2 className="size-4" />
                          Trimite codul pe email
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={loading}
                      className="h-14 rounded-xl"
                    >
                      Anulează
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Un cod de 6 cifre a fost trimis la adresa ta de email. Introdu-l mai jos.
                  </p>
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={deletionCode}
                    onChange={(event) =>
                      onDeletionCodeChange(event.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    className="w-full rounded-xl border-2 border-red-200 bg-white px-5 py-4 text-center text-3xl font-black tracking-[0.45em] text-red-600 focus:border-red-500 focus:outline-none dark:border-red-900/40 dark:bg-slate-950 dark:text-red-400"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Codul este valabil 15 minute. Poți închide fereastra și reveni mai târziu — progresul
                    se păstrează până expiră codul.
                  </p>
                  <div className="flex flex-col gap-3 pt-1">
                    <Button
                      type="button"
                      onClick={onConfirm}
                      disabled={loading || deletionCode.length !== 6}
                      className="h-14 w-full rounded-xl bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-red-900/30"
                    >
                      {loading ? 'Se procesează...' : 'Confirmă ștergerea definitivă'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onRequestCode}
                      disabled={loading}
                      className="h-14 w-full rounded-xl"
                    >
                      Retrimite codul
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full text-center text-xs font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline dark:hover:text-slate-300"
                  >
                    Anulează ștergerea contului
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
