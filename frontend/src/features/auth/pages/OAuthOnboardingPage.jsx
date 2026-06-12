import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Moon, Sun, BarChart3 } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { LegalDocumentModal } from '../../../shared/ui/LegalDocumentModal'
import { LEGAL_DOCS_VERSION, LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { PROFILES } from '../../lessons/profiles'
import { needsProfileSetup } from '../../../services/profileService'
import { resolvePostAuthRedirect } from '../../../services/lastLocationService'

function getDisplayNameFromMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return ''
  const name = metadata.full_name || metadata.name
  return typeof name === 'string' ? name.trim() : ''
}

export function OAuthOnboardingPage() {
  const { user, authLoading, completeOAuthProfile, loading, errorMessage, theme, toggleTheme, isAdmin } = useAuth()
  const navigate = useNavigate()
  const suggestedName = getDisplayNameFromMetadata(user?.user_metadata)
  const [formData, setFormData] = useState({
    nume: '',
    profiles: [PROFILES[0].key],
  })
  const [nameTouched, setNameTouched] = useState(false)
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [legalModal, setLegalModal] = useState(null)
  const [legalError, setLegalError] = useState('')

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!needsProfileSetup(user)) {
    return <Navigate to={resolvePostAuthRedirect({ user, isAdmin, fallback: '/dashboard' })} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!acceptedLegal) {
      setLegalError('Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate pentru a continua.')
      return
    }
    setLegalError('')
    try {
      const result = await completeOAuthProfile({
        fullName: (nameTouched ? formData.nume : (formData.nume || suggestedName)).trim(),
        profiles: formData.profiles,
        legalConsent: {
          acceptedAt: new Date().toISOString(),
          version: LEGAL_DOCS_VERSION,
        },
      })
      navigate(
        resolvePostAuthRedirect({
          user: result?.user ?? user,
          isAdmin,
          fallback: '/dashboard',
        }),
        { replace: true },
      )
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  const inputClass = 'w-full bg-slate-50 dark:bg-white/5 border-2 border-border rounded-xl px-5 py-4 focus:outline-none focus:border-primary transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm'

  return (
    <div className="min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="absolute inset-0 scholar-grid opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      <nav className="relative z-50 p-8">
        <div className="container flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">MathUP</strong>
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg text-slate-500"
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10 my-10">
        <div className="w-full max-w-2xl">
          <AuthCard
            title="Finalizează contul"
            description="Completează profilul academic pentru a accesa platforma"
            footer={(
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Link to={LEGAL_ROUTES.terms} className="hover:text-primary">Termeni</Link>
                <Link to={LEGAL_ROUTES.privacy} className="hover:text-primary">Confidențialitate</Link>
              </div>
            )}
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <AlertMessage message={errorMessage} />

              <div className="space-y-3">
                <label htmlFor="oauth-nume" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Nume Complet
                </label>
                <input
                  id="oauth-nume"
                  type="text"
                  className={inputClass}
                  value={nameTouched ? formData.nume : (formData.nume || suggestedName)}
                  onChange={(event) => {
                    setNameTouched(true)
                    setFormData((prev) => ({ ...prev, nume: event.target.value }))
                  }}
                  placeholder="Ex: Andrei Ionescu"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Specializare (Profilul Liceal)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PROFILES.map((p) => {
                    const active = formData.profiles.includes(p.key)
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, profiles: [p.key] }))}
                        className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${active ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' : 'bg-white dark:bg-white/2 border-border hover:border-slate-400'}`}
                      >
                        <div className={`size-10 shrink-0 rounded-lg flex items-center justify-center ${active ? 'bg-primary text-white shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                          <BarChart3 className="size-5" />
                        </div>
                        <div className="min-w-0 pr-4">
                          <p className={`text-sm font-black tracking-tight uppercase ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programa {p.shortLabel}</p>
                        </div>
                        {active && (
                          <div className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                            <span className="text-[10px] font-black">✓</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <AlertMessage message={legalError} />
                <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-4 dark:bg-white/5">
                  <input
                    id="oauth-legal-consent"
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 rounded border-2 border-border bg-white text-primary accent-primary focus:ring-primary/50 dark:bg-white/5"
                    checked={acceptedLegal}
                    onChange={(event) => {
                      setAcceptedLegal(event.target.checked)
                      if (event.target.checked) setLegalError('')
                    }}
                    required
                  />
                  <label htmlFor="oauth-legal-consent" className="cursor-pointer select-none text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                    Am citit și accept{' '}
                    <button
                      type="button"
                      className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                      onClick={() => setLegalModal('terms')}
                    >
                      Termenii și Condițiile
                    </button>
                    {' '}și{' '}
                    <button
                      type="button"
                      className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                      onClick={() => setLegalModal('privacy')}
                    >
                      Politica de Confidențialitate
                    </button>
                    {' '}MathUP.
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                  disabled={loading || !acceptedLegal}
                >
                  {loading ? 'Procesare în curs...' : 'Accesează platforma'}
                </Button>
              </div>
            </form>
          </AuthCard>
        </div>
      </main>

      <LegalDocumentModal
        open={legalModal !== null}
        documentType={legalModal}
        onClose={() => setLegalModal(null)}
      />
    </div>
  )
}
