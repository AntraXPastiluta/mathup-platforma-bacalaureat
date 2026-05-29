import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { resolvePostAuthRedirect } from '../../../services/lastLocationService'

export function LoginPage() {
  const [formData, setFormData] = useState(() => {
    const savedEmail = localStorage.getItem('remember_email')
    return {
      email: savedEmail || '',
      parola: '',
    }
  })
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remember_email'))
  const { login, loginWithGoogle, loading, errorMessage, theme, toggleTheme, user, isAdmin } = useAuth()
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
    try {
      const authData = await login({
        email: formData.email,
        password: formData.parola
      })
      
      if (rememberMe) {
        localStorage.setItem('remember_email', formData.email)
      } else {
        localStorage.removeItem('remember_email')
      }

      navigate(
        resolvePostAuthRedirect({
          user: authData?.session?.user ?? user,
          isAdmin,
          fallback: '/dashboard',
        }),
        { replace: true },
      )
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

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-lg">
          <AuthCard 
            title="Portal Elev" 
            description="Autentificare în platforma academică"
            footer={
              <div className="w-full text-center space-y-6">
                 <Button 
                  variant="link" 
                  className="text-xs tracking-widest text-slate-500 hover:text-primary" 
                  onClick={() => navigate('/register')}
                >
                  Nu ai cont? Solicită înregistrarea
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
            <form onSubmit={handleSubmit} className="space-y-8">
              <AlertMessage message={errorMessage} />

              <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />

              <div className="space-y-3">
                <label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Identitate Academică (Email)
                </label>
                <input
                  id="login-email"
                  type="email"
                  className={inputClass}
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="nume@exemplu.com"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label htmlFor="login-password" name="password" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Cheie de Acces (Parolă)
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                     Recuperare parolă
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className={inputClass}
                  value={formData.parola}
                  onChange={(event) => setFormData((prev) => ({ ...prev, parola: event.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center space-x-3 px-1">
                <input 
                  id="remember"
                  type="checkbox" 
                  className="size-5 rounded border-2 border-border bg-white dark:bg-white/5 text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none uppercase tracking-widest">
                  Menține sesiunea activă
                </label>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20" disabled={loading}>
                  {loading ? 'Verificare în curs...' : 'Intră în Portal'}
                </Button>
              </div>
            </form>
          </AuthCard>
        </div>
      </main>
    </div>
  )
}
