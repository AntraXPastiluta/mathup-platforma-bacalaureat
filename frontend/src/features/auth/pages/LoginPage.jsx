import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, Sun, ChevronLeft, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { DashboardAmbient } from '../../dashboard/components/DashboardAmbient'
import { resolvePostAuthRedirect } from '../../../services/lastLocationService'

// Serif de manuscris pentru accentele editoriale — doar stiva de sistem (CSP-safe),
// pentru a păstra contrastul „demonstrație tipărită” cu sans-ul greu, ca pe pagina de start.
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

// Fișa demonstrativă din panoul de brand — o variantă rezolvată reală.
const WORKED_STATEMENT = 'x² − 5x + 6 = 0'
const WORKED_LINES = [
  'Δ = b² − 4ac = 25 − 24 = 1',
  'x₁ = (5 + √Δ) / 2 = 3',
  'x₂ = (5 − √Δ) / 2 = 2',
  'S = {2, 3}',
]
const PROGRAMS = ['M1', 'M2', 'M3']

const formContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const formItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export function LoginPage() {
  const [formData, setFormData] = useState(() => {
    const savedEmail = localStorage.getItem('remember_email')
    return {
      email: savedEmail || '',
      parola: '',
    }
  })
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remember_email'))
  const [showPassword, setShowPassword] = useState(false)
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
        password: formData.parola,
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

  const inputClass =
    'w-full rounded-xl border-2 border-border bg-white/70 py-3.5 pl-11 pr-12 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-200 placeholder:font-medium placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10'

  return (
    <div className="flex min-h-screen transition-colors duration-500">
      {/* ── Panou de brand (showpiece) — întunecat permanent, doar pe desktop ── */}
      <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex xl:p-16">
        <DashboardAmbient />
        <div className="scholar-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/30 to-transparent" aria-hidden />

        {/* Brand */}
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          className="group relative z-10 flex items-center gap-3 self-start"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30 transition-transform duration-500 group-hover:-rotate-6">
            <BrandLogo className="size-6" />
          </div>
          <div className="text-left">
            <strong className="block text-lg font-black uppercase leading-tight tracking-tighter">MathUP</strong>
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary-300">Excelență Academică</span>
          </div>
        </motion.button>

        {/* Showpiece — fișă de variantă rezolvată */}
        <motion.div
          className="relative z-10 my-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-7 flex items-center gap-3">
            <span className="h-px w-10 bg-primary" />
            <span className="text-[11px] font-black uppercase tracking-[0.24em] text-primary-200">Reia de unde ai rămas</span>
          </div>
          <h2 className="max-w-md text-4xl font-black leading-[1.05] tracking-tighter xl:text-5xl">
            Pregătirea ta te{' '}
            <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary-300">
              așteaptă
            </span>
            .
          </h2>

          <div className="relative mt-10 max-w-sm">
            {/* strat-umbră în spate, pentru adâncime tipărită */}
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06]" aria-hidden />

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
              <div className="scholar-grid pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Fișă · Variantă rezolvată
                  </span>
                  <span
                    style={{ fontFamily: SERIF }}
                    className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold italic text-white shadow-sm shadow-primary/40"
                  >
                    M1
                  </span>
                </div>
                <p style={{ fontFamily: SERIF }} className="mt-5 text-2xl font-semibold tracking-tight text-white">
                  {WORKED_STATEMENT}
                </p>
                <div className="my-5 h-px w-full bg-white/10" />
                <div style={{ fontFamily: SERIF }} className="space-y-2 text-base text-slate-200">
                  {WORKED_LINES.map((line, i) => (
                    <div key={line} className="flex items-baseline gap-3">
                      <span className="select-none font-sans text-[10px] font-black text-primary-300/60">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={i === WORKED_LINES.length - 1 ? 'font-bold text-primary-200' : ''}>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subsol panou — chip-uri de profil + ștampilă */}
        <motion.div
          className="relative z-10 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            {PROGRAMS.map((code) => (
              <span
                key={code}
                style={{ fontFamily: SERIF }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-sm font-semibold italic text-slate-200"
              >
                {code}
              </span>
            ))}
          </div>
          <div className="flex size-16 rotate-[-10deg] items-center justify-center rounded-full border-2 border-primary/30 text-center" aria-hidden>
            <span className="text-[9px] font-black uppercase leading-tight tracking-[0.14em] text-primary-200">
              BAC
              <br />
              2026
            </span>
          </div>
        </motion.div>
      </aside>

      {/* ── Coloana formularului ── */}
      <div className="relative flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
        <div className="scholar-grid pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]" aria-hidden />

        {/* Bară superioară */}
        <header className="relative z-10 flex items-center justify-between p-6 sm:px-10 sm:py-8">
          {/* Mobil: brand. Desktop: înapoi la pagina principală */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 lg:hidden"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">MathUP</strong>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hidden items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-primary lg:inline-flex"
          >
            <ChevronLeft className="size-4" />
            Pagina principală
          </button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Comută tema" className="rounded-lg text-slate-500">
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </header>

        {/* Formular centrat */}
        <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <motion.div
            className="w-full max-w-md"
            variants={formContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Antet */}
            <motion.div variants={formItem} className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-primary" />
                <span className="text-[11px] font-black uppercase tracking-[0.24em] text-primary">Autentificare</span>
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tighter text-slate-900 dark:text-white sm:text-[2.75rem]">
                Bine ai{' '}
                <span style={{ fontFamily: SERIF }} className="font-medium italic tracking-normal text-primary">
                  revenit
                </span>
                .
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-500 dark:text-slate-400">
                Autentifică-te ca să-ți continui pregătirea pentru Bacalaureat.
              </p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div variants={formItem}>
                <AlertMessage message={errorMessage} />
              </motion.div>

              <motion.div variants={formItem}>
                <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />
              </motion.div>

              {/* Email */}
              <motion.div variants={formItem} className="space-y-2">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                >
                  Adresă de email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="nume@exemplu.com"
                    required
                  />
                </div>
              </motion.div>

              {/* Parolă */}
              <motion.div variants={formItem} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
                  >
                    Parolă
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:text-primary/70"
                  >
                    Ai uitat parola?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={inputClass}
                    value={formData.parola}
                    onChange={(event) => setFormData((prev) => ({ ...prev, parola: event.target.value }))}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}
                    className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Ține-mă minte */}
              <motion.div variants={formItem} className="flex items-center gap-3">
                <input
                  id="remember"
                  type="checkbox"
                  className="size-4 cursor-pointer rounded border-2 border-border bg-white accent-primary focus:ring-primary/50 dark:bg-white/5"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-400"
                >
                  Ține-mă minte pe acest dispozitiv
                </label>
              </motion.div>

              {/* Submit */}
              <motion.div variants={formItem} className="pt-2">
                <Button
                  type="submit"
                  className="group h-14 w-full rounded-xl text-sm shadow-xl shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? 'Se verifică…' : 'Autentifică-te'}
                  {!loading && <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />}
                </Button>
              </motion.div>

              {/* Înregistrare */}
              <motion.p variants={formItem} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                Nu ai încă un cont?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="font-black text-primary underline-offset-4 hover:underline"
                >
                  Creează unul acum
                </button>
              </motion.p>
            </form>
          </motion.div>
        </main>

        {/* Subsol */}
        <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 pb-8 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span>© {new Date().getFullYear()} MathUP</span>
          <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">·</span>
          <Link to={LEGAL_ROUTES.terms} className="transition-colors hover:text-primary">
            Termeni
          </Link>
          <Link to={LEGAL_ROUTES.privacy} className="transition-colors hover:text-primary">
            Confidențialitate
          </Link>
        </footer>
      </div>
    </div>
  )
}
