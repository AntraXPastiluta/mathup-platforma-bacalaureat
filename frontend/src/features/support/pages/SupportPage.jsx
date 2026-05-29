import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import {
  submitSupportRequest,
  SUPPORT_SAVED_WITH_AUTOREPLY,
  SUPPORT_SAVED_WITHOUT_AUTOREPLY,
} from '../../../services/supportService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

const CATEGORIES = [
  { value: 'billing', label: 'Facturare' },
  { value: 'technical', label: 'Problemă tehnică' },
  { value: 'content', label: 'Conținut lecții' },
  { value: 'other', label: 'Altele' },
]

const CATEGORY_EXAMPLES = {
  billing: {
    subject: 'Ex: Abonamentul Premium nu s-a activat după plată',
    message:
      'Ex: Am plătit pe data de …, dar în profil încă văd cont gratuit. Am folosit cardul / emailul … și nu am primit confirmare.',
  },
  technical: {
    subject: 'Ex: Nu pot accesa lecția sau pagina se încarcă greu',
    message:
      'Ex: Când deschid lecția … apare mesajul de eroare …. Pași: m-am logat → dashboard → …. Browser: Chrome / telefon.',
  },
  content: {
    subject: 'Ex: Eroare la exercițiu sau lecție incompletă',
    message:
      'Ex: La lecția „…” (Subiectul …), exercițiul … pare greșit / lipsește explicația / imaginea nu se încarcă. Ce așteptam să văd: …',
  },
  other: {
    subject: 'Ex: Întrebare despre cont sau utilizarea platformei',
    message:
      'Ex: Vreau să … / Am nevoie de ajutor cu …. Orice detaliu util (program M1/M2/M3, ce pagină, ce ai încercat deja).',
  },
}

const INITIAL_FORM = {
  category: 'technical',
  subject: '',
  message: '',
}

export function SupportPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const userEmail = user?.email || ''
  const userName = user?.user_metadata?.full_name?.trim() || 'Elev'

  const categoryExamples = useMemo(
    () => CATEGORY_EXAMPLES[form.category] ?? CATEGORY_EXAMPLES.technical,
    [form.category],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.subject.trim()) {
      setError('Subiectul solicitării este obligatoriu.')
      return
    }
    if (!form.message.trim()) {
      setError('Mesajul solicitării este obligatoriu.')
      return
    }

    setLoading(true)
    try {
      const result = await submitSupportRequest({
        category: form.category,
        subject: form.subject,
        message: form.message,
      })
      setForm(INITIAL_FORM)
      setSuccess(
        result.autoreplyDelivered ? SUPPORT_SAVED_WITH_AUTOREPLY : SUPPORT_SAVED_WITHOUT_AUTOREPLY,
      )
    } catch (submitError) {
      setError(toUserFacingError(submitError, USER_MESSAGES.supportSubmit))
    } finally {
      setLoading(false)
    }
  }

  const fieldLabelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-2 block"
  const inputClass = "w-full rounded-xl border-2 border-border bg-slate-50 px-5 py-4 font-bold text-slate-900 focus:outline-none focus:border-primary transition-all dark:bg-white/5 dark:text-white"

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <Navbar />

      <main className="container relative z-0 max-w-3xl py-16 px-4">
        <div className="absolute inset-0 scholar-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />

        <motion.button
          onClick={() => navigate('/dashboard')}
          className="mb-10 inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
          whileHover={{ x: -4 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ArrowLeft className="size-4" />
          Înapoi la Dashboard
        </motion.button>

        <motion.section 
          className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-border shadow-2xl p-10 md:p-16 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Decorative Seal */}
          <div className="absolute -top-12 -right-12 size-48 bg-primary/5 rounded-full border-2 border-dashed border-primary/10 flex items-center justify-center p-12 opacity-40">
             <MessageCircle className="size-full text-primary/20" />
          </div>

          <header className="relative z-10 pb-12 border-b-2 border-border mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/5 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest mb-4">
               Registry / Help Center
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-tight">
              Contact Academic
            </h1>
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg">
              Utilizează acest canal formal pentru asistență tehnică, întrebări despre curriculum sau probleme de facturare.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
            <AlertMessage type="success" message={success} />
            <AlertMessage message={error} />

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2">
                <label className={fieldLabelClass}>Identitate</label>
                <div className="w-full bg-slate-100/50 dark:bg-white/2 border-2 border-border rounded-xl px-5 py-4 font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm">
                  {userName}
                </div>
              </div>
              <div className="space-y-2">
                <label className={fieldLabelClass}>Contact Sincronizat</label>
                <div className="w-full bg-slate-100/50 dark:bg-white/2 border-2 border-border rounded-xl px-5 py-4 font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed text-sm truncate">
                  {userEmail}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="support-category" className={fieldLabelClass}>Departament Vizat</label>
              <select
                id="support-category"
                className={`${inputClass} appearance-none cursor-pointer pr-10`}
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                disabled={loading || Boolean(success)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value} className="bg-white dark:bg-slate-900">{item.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="support-subject" className={fieldLabelClass}>Subiect Solicitare</label>
              <input
                id="support-subject"
                type="text"
                maxLength={120}
                className={inputClass}
                value={form.subject}
                onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                placeholder={categoryExamples.subject}
                required
                disabled={loading || Boolean(success)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="support-message" className={fieldLabelClass}>Detaliere Solicitare</label>
              <textarea
                id="support-message"
                rows={6}
                maxLength={2000}
                className={`${inputClass} resize-none font-medium text-base h-48`}
                value={form.message}
                onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder={categoryExamples.message}
                required
                disabled={loading || Boolean(success)}
              />
              <div className="flex justify-end pt-2">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Caractere: {form.message.length}/2000</span>
              </div>
            </div>

            <div className="pt-8 border-t-2 border-border flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                className="flex-1 h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                disabled={loading || Boolean(success)}
              >
                {loading ? 'Transmisie în curs...' : 'Expediază Solicitarea'}
                {!loading && <Send className="size-4 ml-2" />}
              </Button>
              {success && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-16 px-10 rounded-xl"
                  onClick={() => {
                    setSuccess('')
                    setForm(INITIAL_FORM)
                  }}
                >
                  Mesaj Nou
                </Button>
              )}
            </div>
          </form>
        </motion.section>
      </main>

      <footer className="container py-24 text-center opacity-40">
        <div className="flex flex-col items-center gap-4 grayscale hover:grayscale-0 transition-all duration-700">
          <BrandLogo className="size-10" />
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-[0.6em] text-slate-900 dark:text-white">
              MathUP Scholarly Support
            </span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Academic Registry & Helpdesk
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
