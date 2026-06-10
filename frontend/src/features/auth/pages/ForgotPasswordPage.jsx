import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('remember_email') || '')
  const { requestPasswordReset, loading, errorMessage, successMessage, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await requestPasswordReset({ email })
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden">
      <motion.div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </motion.div>

      <nav className="relative z-50 p-6">
        <div className="container flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/25 text-white transform group-hover:rotate-6 transition-transform">
              <BrandLogo className="size-6" />
            </div>
            <div>
              <strong className="block text-base leading-tight font-black tracking-tight uppercase text-slate-800 dark:text-white">MathUP</strong>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Performanță construită pas cu pas.</span>
            </div>
          </motion.div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-slate-200 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="size-5 text-yellow-400" /> : <Moon className="size-5 text-slate-600" />}
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <AuthCard
            title="Ai uitat parola?"
            description="Introdu emailul contului și îți trimitem un link securizat pentru resetare."
            footer={(
              <div className="w-full text-center space-y-4">
                <Button
                  variant="link"
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80"
                  onClick={() => navigate('/login')}
                >
                  Înapoi la autentificare
                </Button>
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 rounded-full text-slate-500">
                    <ChevronLeft className="size-4" />
                    Înapoi la pornire
                  </Button>
                </div>
              </div>
            )}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <AlertMessage type="success" message={successMessage} />
              <AlertMessage message={errorMessage} />

              <div className="space-y-2">
                <label htmlFor="forgot-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                  Email Academic
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nume@exemplu.com"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs"
                  disabled={loading || Boolean(successMessage)}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      Se trimite linkul...
                    </div>
                  ) : 'Trimite link de resetare'}
                </Button>
              </div>
            </form>
          </AuthCard>
        </motion.div>
      </main>
    </div>
  )
}
