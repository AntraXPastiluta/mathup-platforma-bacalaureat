import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, ChevronLeft, BarChart3 } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { LegalDocumentModal } from '../../../shared/ui/LegalDocumentModal'
import { LEGAL_DOCS_VERSION, LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { PROFILES } from '../../lessons/profiles'
import { GoogleSignInButton } from '../components/GoogleSignInButton'

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nume: '',
    email: '',
    parola: '',
    profiles: [PROFILES[0].key],
  })
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [legalModal, setLegalModal] = useState(null)
  const [legalError, setLegalError] = useState('')
  const { register, loginWithGoogle, loading, errorMessage, successMessage, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle()
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!acceptedLegal) {
      setLegalError('Trebuie să accepți Termenii și Condițiile și Politica de Confidențialitate pentru a continua.')
      return
    }
    setLegalError('')
    try {
      await register({
        email: formData.email,
        password: formData.parola,
        fullName: formData.nume,
        profiles: formData.profiles,
        legalConsent: {
          acceptedAt: new Date().toISOString(),
          version: LEGAL_DOCS_VERSION,
        },
      })
      navigate('/dashboard')
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  const inputClass = "w-full bg-slate-50 dark:bg-white/5 border-2 border-border rounded-xl px-5 py-4 focus:outline-none focus:border-primary transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"

  return (
    <div className="min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background Decor */}
      <div className="absolute inset-0 scholar-grid opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

      {/* Simple Navbar */}
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
            title="Solicitare Acces" 
            description="Creează-ți identitatea academică în platformă"
            footer={
              <div className="w-full text-center space-y-6">
                 <Button 
                  variant="link" 
                  className="text-xs tracking-widest text-slate-500 hover:text-primary" 
                  onClick={() => navigate('/login')}
                >
                  Ai deja un cont activ? Intră în portal
                </Button>
                <div>
                   <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-3 rounded-xl text-slate-400">
                      <ChevronLeft className="size-4" />
                      Înapoi la pagina principală
                   </Button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <Link to={LEGAL_ROUTES.terms} className="hover:text-primary">Termeni</Link>
                  <Link to={LEGAL_ROUTES.privacy} className="hover:text-primary">Confidențialitate</Link>
                </div>
              </div>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <AlertMessage type="success" message={successMessage} />
              <AlertMessage message={errorMessage} />

              <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label htmlFor="register-nume" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Nume Complet
                  </label>
                  <input
                    id="register-nume"
                    type="text"
                    className={inputClass}
                    value={formData.nume}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nume: event.target.value }))}
                    placeholder="Ex: Andrei Ionescu"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="register-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Email Academic
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    className={inputClass}
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="nume@exemplu.com"
                    required
                  />
                </div>

                <div className="space-y-4 sm:col-span-2">
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

                <div className="space-y-3 sm:col-span-2">
                  <label htmlFor="register-password" name="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Cheie de Acces (Minim 8 caractere)
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    className={inputClass}
                    value={formData.parola}
                    onChange={(event) => setFormData((prev) => ({ ...prev, parola: event.target.value }))}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 sm:col-span-2">
                <AlertMessage message={legalError} />
                <div className="flex items-start gap-3 rounded-xl border border-border bg-slate-50/80 p-4 dark:bg-white/5">
                  <input
                    id="register-legal-consent"
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 rounded border-2 border-border bg-white text-primary accent-primary focus:ring-primary/50 dark:bg-white/5"
                    checked={acceptedLegal}
                    onChange={(event) => {
                      setAcceptedLegal(event.target.checked)
                      if (event.target.checked) setLegalError('')
                    }}
                    required
                  />
                  <label htmlFor="register-legal-consent" className="cursor-pointer select-none text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400">
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
                <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Poți citi documentele și pe paginile{' '}
                  <Link to={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    Termeni
                  </Link>
                  {' '}și{' '}
                  <Link to={LEGAL_ROUTES.privacy} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                    Confidențialitate
                  </Link>
                  .
                </p>
              </div>

              <div className="pt-6 sm:col-span-2">
                <Button
                  type="submit"
                  className="w-full h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                  disabled={loading || !acceptedLegal}
                >
                  {loading ? 'Procesare în curs...' : 'Finalizează Înregistrarea'}
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
