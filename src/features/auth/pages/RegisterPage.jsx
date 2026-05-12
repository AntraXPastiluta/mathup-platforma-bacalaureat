import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Moon, Sun, ChevronLeft, BarChart3 } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AuthCard } from '../../../shared/ui/AuthCard'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { PROFILES } from '../../lessons/profiles'

export function RegisterPage() {
  const [formData, setFormData] = useState({
    nume: '',
    email: '',
    parola: '',
    profiles: [PROFILES[0].key],
  })
  const { register, loading, errorMessage, successMessage, theme, toggleTheme } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await register({
        email: formData.email,
        password: formData.parola,
        fullName: formData.nume,
        profiles: formData.profiles,
      })
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
              <GraduationCap className="size-6" />
            </div>
            <div>
              <strong className="block text-base leading-tight font-black tracking-tight uppercase text-slate-800 dark:text-white">ScholarBAC</strong>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Elevate Your Mind</span>
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

      <main className="flex-1 flex items-center justify-center p-6 relative z-10 my-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <AuthCard 
            title="Acces în platformă" 
            description="Creează-ți contul ScholarBAC pentru a începe pregătirea academică."
            footer={
              <div className="w-full text-center space-y-4">
                 <Button 
                  variant="link" 
                  className="text-xs font-bold uppercase tracking-widest text-primary hover:text-primary/80" 
                  onClick={() => navigate('/login')}
                >
                  Ai deja cont? Intră în platformă
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="register-nume" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Nume complet
                  </label>
                  <input
                    id="register-nume"
                    type="text"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
                    value={formData.nume}
                    onChange={(event) => setFormData((prev) => ({ ...prev, nume: event.target.value }))}
                    placeholder="Ex: Andrei Ionescu"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="register-email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Email Academic
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="nume@exemplu.com"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Programe liceale (una sau mai multe)
                  </label>
                  <p className="text-xs text-muted-foreground mb-1">Alege filiera pentru care vrei acces la materiale.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PROFILES.map((p) => {
                      const active = formData.profiles.includes(p.key)
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, profiles: [p.key] }))}
                          className={`relative flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${active ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'}`}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                              <span className="text-[10px] font-black">✓</span>
                            </span>
                          )}
                          <div className={`size-8 shrink-0 rounded-xl flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                            <BarChart3 className="size-4" />
                          </div>
                          <span className={`text-xs font-bold pr-5 ${active ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label htmlFor="register-password" name="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Parolă Securizată (Minim 8 caractere)
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
                    value={formData.parola}
                    onChange={(event) => setFormData((prev) => ({ ...prev, parola: event.target.value }))}
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs" disabled={loading}>
                  {loading ? (
                    <div className="flex items-center gap-3">
                       <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                       Se creează contul...
                    </div>
                  ) : 'Finalizează contul academic'}
                </Button>
              </div>
            </form>
          </AuthCard>
        </motion.div>
      </main>
    </div>
  )
}
