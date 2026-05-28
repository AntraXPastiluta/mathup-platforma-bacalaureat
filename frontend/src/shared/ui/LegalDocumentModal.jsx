import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { getPrivacyPolicySections, getPrivacyPolicyTitle } from '../../content/legal/privacyPolicy.ro'
import { getTermsAndConditionsSections, getTermsAndConditionsTitle } from '../../content/legal/termsAndConditions.ro'
import { LegalDocumentBody } from './LegalDocumentBody'
import { Button } from './Button'

const DOCUMENTS = {
  terms: {
    title: getTermsAndConditionsTitle(),
    sections: getTermsAndConditionsSections(),
  },
  privacy: {
    title: getPrivacyPolicyTitle(),
    sections: getPrivacyPolicySections(),
  },
}

export function LegalDocumentModal({ open, documentType, onClose }) {
  const dialogRef = useRef(null)
  const document = DOCUMENTS[documentType] ?? null

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && document ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-document-title"
            tabIndex={-1}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-primary/20 bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Document legal</p>
                  <h2 id="legal-document-title" className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    {document.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:text-primary dark:border-white/10"
                aria-label="Închide"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <LegalDocumentBody sections={document.sections} />
            </div>

            <div className="shrink-0 border-t border-slate-200 p-6 dark:border-white/10">
              <Button
                type="button"
                motionless
                onClick={onClose}
                className="h-12 w-full rounded-xl bg-primary text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20"
              >
                Am citit
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
