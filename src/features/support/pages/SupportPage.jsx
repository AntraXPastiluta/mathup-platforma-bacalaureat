import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { submitSupportRequest, SUPPORT_SAVED_EMAIL_PENDING } from '../../../services/supportService'
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
      setError('Introdu un subiect pentru mesaj.')
      return
    }
    if (!form.message.trim()) {
      setError('Introdu mesajul către suport.')
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
        result.emailDelivered
          ? 'Mesajul a fost trimis. Îți răspundem pe email în cel mult 48 de ore.'
          : SUPPORT_SAVED_EMAIL_PENDING,
      )
    } catch (submitError) {
      setError(toUserFacingError(submitError, USER_MESSAGES.supportSubmit))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500">
      <Navbar />

      <main className="container max-w-2xl py-10 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="mb-6 gap-2 rounded-full text-slate-500"
        >
          <ArrowLeft className="size-4" />
          Înapoi la dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AuthCard
            title="Contactează suportul"
            description="Descrie problema ta și îți răspundem pe emailul contului în cel mult 48 de ore."
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <AlertMessage type="success" message={success} />
              <AlertMessage message={error} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="support-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Nume
                  </label>
                  <input
                    id="support-name"
                    type="text"
                    className="w-full bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed"
                    value={userName}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="support-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Email
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    className="w-full bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3.5 font-bold text-slate-600 dark:text-slate-300 cursor-not-allowed"
                    value={userEmail}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="support-category" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Categorie
                </label>
                <select
                  id="support-category"
                  className="w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-800 shadow-sm transition-all scheme-light focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:scheme-dark"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  disabled={loading || Boolean(success)}
                >
                  {CATEGORIES.map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                      className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="support-subject" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Subiect
                </label>
                <input
                  id="support-subject"
                  type="text"
                  maxLength={120}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={form.subject}
                  onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder={categoryExamples.subject}
                  key={`subject-${form.category}`}
                  required
                  disabled={loading || Boolean(success)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="support-message" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Mesaj
                </label>
                <textarea
                  id="support-message"
                  rows={6}
                  maxLength={2000}
                  className="w-full resize-y bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder={categoryExamples.message}
                  key={`message-${form.category}`}
                  required
                  disabled={loading || Boolean(success)}
                />
                <p className="text-[10px] font-semibold text-slate-400 text-right">
                  {form.message.length}/2000
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs gap-2"
                  disabled={loading || Boolean(success)}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      Se trimite...
                    </div>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Trimite mesajul
                    </>
                  )}
                </Button>
                {success && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 rounded-2xl font-bold"
                    onClick={() => {
                      setSuccess('')
                      setForm(INITIAL_FORM)
                    }}
                  >
                    <MessageCircle className="size-4 mr-2" />
                    Mesaj nou
                  </Button>
                )}
              </div>
            </form>
          </AuthCard>
        </motion.div>
      </main>
    </div>
  )
}
