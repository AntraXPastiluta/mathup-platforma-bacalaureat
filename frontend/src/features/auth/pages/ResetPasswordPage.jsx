import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { supabase } from '../../../supabaseClient'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const { resetPassword, signOut, loading, errorMessage, successMessage, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true)
      }
      setCheckingLink(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')

    if (password.length < 8) {
      setLocalError('Parola trebuie să aibă cel puțin 8 caractere.')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Parolele nu coincid.')
      return
    }

    try {
      await resetPassword({ password })
      await signOut()
      navigate('/login')
    } catch {
      // Eroarea este deja gestionată în provider
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <motion.div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

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
            title="Parolă nouă"
            description="Alege o parolă nouă pentru contul tău MathUP."
            footer={(
              <div className="w-full text-center space-y-4">
                <Button
                  variant="link"
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80"
                  onClick={() => navigate('/forgot-password')}
                >
                  Solicită un link nou
                </Button>
                <div className="pt-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="gap-2 rounded-full text-slate-500">
                    <ChevronLeft className="size-4" />
                    Înapoi la autentificare
                  </Button>
                </div>
              </div>
            )}
          >
            {checkingLink ? (
              <div className="flex h-40 items-center justify-center">
                <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>
            ) : !recoveryReady ? (
              <div className="space-y-4">
                <AlertMessage message="Linkul de resetare este invalid sau a expirat. Solicită un link nou." />
                <Button onClick={() => navigate('/forgot-password')} className="w-full rounded-2xl">
                  Mergi la resetare parolă
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <AlertMessage type="success" message={successMessage} />
                <AlertMessage message={localError || errorMessage} />

                <div className="space-y-2">
                  <label htmlFor="reset-password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                    Parolă nouă
                  </label>
                  <input
                    id="reset-password"
                    type="password"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="reset-password-confirm" className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                    Confirmă parola
                  </label>
                  <input
                    id="reset-password-confirm"
                    type="password"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        Se salvează parola...
                      </div>
                    ) : 'Salvează parola nouă'}
                  </Button>
                </div>
              </form>
            )}
          </AuthCard>
        </motion.div>
      </main>
    </div>
  )
}
