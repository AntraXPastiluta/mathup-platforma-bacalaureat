import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, ChevronLeft } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function LoginPage() {
  const [formData, setFormData] = useState(() => {
    const savedEmail = localStorage.getItem('remember_email')
    return {
      email: savedEmail || '',
      parola: '',
    }
  })
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remember_email'))
  const { login, loading, errorMessage, successMessage, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await login({
        email: formData.email,
        password: formData.parola
      })
      
      if (rememberMe) {
        localStorage.setItem('remember_email', formData.email)
      } else {
        localStorage.removeItem('remember_email')
      }

      navigate('/dashboard')
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Simple Navbar */}
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
            title="Bine ai revenit!" 
            description="Introdu datele tale pentru a continua pregătirea."
            footer={
              <div className="w-full text-center space-y-4">
                 <Button 
                  variant="link" 
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80" 
                  onClick={() => navigate('/register')}
                >
                  Nu ai cont? Creează unul acum
                </Button>
                <div className="pt-2">
                   <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2 rounded-full text-slate-500">
                      <ChevronLeft className="size-4" />
                      Înapoi la pornire
                   </Button>
                </div>
              </div>
            }
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <AlertMessage type="success" message={successMessage} />
              <AlertMessage message={errorMessage} />

              <div className="space-y-2">
                <label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Email Academic
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="nume@exemplu.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" name="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Parolă Securizată
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                  value={formData.parola}
                  onChange={(event) => setFormData((prev) => ({ ...prev, parola: event.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative flex items-center">
                      <input 
                        id="remember"
                        type="checkbox" 
                        className="size-5 rounded-lg border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                    </div>
                    <label htmlFor="remember" className="text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      Ține-mă minte
                    </label>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
                  >
                     Ai uitat parola?
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground ml-1">
                  Salvează emailul pentru următoarea autentificare. Sesiunea rămâne activă după închiderea filei.
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-3">
                       <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                       Se verifică...
                    </div>
                  ) : 'Intră în platformă'}
                </Button>
              </div>
            </form>
          </AuthCard>
        </motion.div>
      </main>
    </div>
  )
}
