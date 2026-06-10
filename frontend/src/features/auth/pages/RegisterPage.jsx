import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Moon, Sun, ChevronLeft, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { LegalDocumentModal } from '../../../shared/ui/LegalDocumentModal'
import { LEGAL_DOCS_VERSION, LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { PROFILES, PROFILE_KEYS, getProfileKeyByProgramCode } from '../../lessons/profiles'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { useTilt3D } from '../hooks/useTilt3D'
import { resolvePostAuthRedirect } from '../../../services/lastLocationService'

// Aceeași stivă serif „de manuscris" ca pe WelcomePage — accente editoriale fără
// fonturi externe (CSP-safe), pentru contrastul „demonstrație tipărită".
const SERIF =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

// Etichete scurte, cu diacritice, pentru fiecare profil (datele din profiles.js
// nu au diacritice — le păstrăm pentru afișare curată, fără a modifica sursa).
const PROFILE_TAGS = {
  [PROFILE_KEYS.MATE_INFO]: 'Real · informatică',
  [PROFILE_KEYS.TEHNOLOGIC]: 'Filieră tehnologică',
  [PROFILE_KEYS.STIINTELE_NATURII]: 'Real · științele naturii',
  [PROFILE_KEYS.PEDAGOGIC]: 'Vocațional · pedagogic',
}

const ENROLLMENT_STEPS = [
  { n: '01', title: 'Alege specializarea', text: 'Selectezi programa liceală potrivită profilului tău.' },
  { n: '02', title: 'Confirmă identitatea', text: 'Completezi datele și accepți termenii academici.' },
  { n: '03', title: 'Începe pregătirea', text: 'Primești planul de studiu și variantele rezolvate.' },
]

const railVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const railItem = {
  hidden: { opacity: 0, y: 18, rotateX: 8, transformPerspective: 700 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transformPerspective: 700,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  // Profil pre-selectat în funcție de programa vizualizată (ex. /register?profil=m1),
  // dacă utilizatorul vine de pe o pagină de profil. Altfel, profilul implicit.
  const [formData, setFormData] = useState(() => ({
    nume: '',
    email: '',
    parola: '',
    profiles: [getProfileKeyByProgramCode(searchParams.get('profil')) ?? PROFILES[0].key],
  }))
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [legalModal, setLegalModal] = useState(null)
  const [legalError, setLegalError] = useState('')
  const [dossierNo] = useState(() => Math.floor(Math.random() * 9000) + 1000)
  const { register, loginWithGoogle, loading, errorMessage, successMessage, theme, toggleTheme, user, isAdmin } = useAuth()
  const navigate = useNavigate()

  // Sigiliul de specializare și cardul de formular se înclină 3D după cursor
  // (formularul foarte discret, ca să nu deranjeze completarea câmpurilor).
  const sealTilt = useTilt3D(7)
  const formTilt = useTilt3D(3)
  const reduce = sealTilt.reduce

  const selectedProfile = PROFILES.find((p) => formData.profiles.includes(p.key)) ?? PROFILES[0]

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
      const authData = await register({
        email: formData.email,
        password: formData.parola,
        fullName: formData.nume,
        profiles: formData.profiles,
        legalConsent: {
          acceptedAt: new Date().toISOString(),
          version: LEGAL_DOCS_VERSION,
        },
      })
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
    'w-full bg-slate-50 dark:bg-white/5 border-2 border-border rounded-xl px-5 py-4 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm'

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 transition-colors duration-500 dark:bg-slate-950">
      {/* ── Atmosferă (fixă, decupată separat ca să nu blocheze scroll/sticky) ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 scholar-grid opacity-[0.035] dark:opacity-[0.05]" />
        <div className="absolute -left-24 -top-32 size-[34rem] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/15" />
        <div className="absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-indigo-400/10 blur-[120px] dark:bg-primary/10" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 p-8">
        <div className="container flex items-center justify-between">
          <motion.div
            className="group flex cursor-pointer items-center gap-3"
            onClick={() => navigate('/')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:perspective(420px)_rotateY(-24deg)_rotateX(8deg)_scale(1.05)]">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Math<span className="text-primary">UP</span></strong>
          </motion.div>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Comută tema" className="rounded-lg text-slate-500">
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
            {/* ── Coloana editorială (dosar de înscriere) ── */}
            <motion.aside
              variants={railVariants}
              initial="hidden"
              animate="visible"
              className="pt-2 lg:sticky lg:top-28"
            >
              <motion.div variants={railItem} className="flex items-center gap-4">
                <span className="h-px w-12 bg-primary" />
                <span className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">
                  Dosar de înscriere · BAC 2026
                </span>
              </motion.div>

              <motion.h1
                variants={railItem}
                className="mt-7 text-4xl font-black uppercase leading-[0.95] tracking-tighter text-slate-900 dark:text-white sm:text-5xl"
              >
                Creează-ți
                <br />
                <span style={{ fontFamily: SERIF }} className="font-medium italic lowercase tracking-normal text-primary">
                  identitatea
                </span>{' '}
                academică.
              </motion.h1>

              <motion.p
                variants={railItem}
                className="mt-6 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300"
              >
                Un singur cont îți deschide lecțiile, variantele rezolvate integral și planul de studiu
                construit pentru programa ta de Bacalaureat.
              </motion.p>

              {/* Sigiliu „specializare selectată" — se schimbă în timp real cu profilul ales;
                  tot cardul se înclină 3D după cursor, cu ștampila ridicată deasupra (translateZ). */}
              <motion.div variants={railItem} className="relative mt-9 max-w-md">
                <motion.div className="relative" style={sealTilt.style} {...sealTilt.handlers}>
                <motion.div
                  className="absolute -right-3 -top-3 z-10 hidden size-16 items-center justify-center rounded-full border-2 border-primary/30 bg-white/90 text-center shadow-sm dark:bg-slate-900/90 sm:flex"
                  style={reduce ? undefined : { z: 28 }}
                  initial={{ rotate: 12 }}
                  animate={reduce ? { rotate: 12 } : { rotate: [12, 6, 12] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-[8px] font-black uppercase leading-tight tracking-[0.14em] text-primary">
                    BAC
                    <br />
                    2026
                  </span>
                </motion.div>

                <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-white/80 p-6 backdrop-blur-sm dark:bg-white/5">
                  <div className="pointer-events-none absolute inset-0 scholar-grid opacity-50 dark:opacity-40" aria-hidden />
                  <div className="relative flex items-center gap-5">
                    <div className="relative flex size-20 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/5">
                      <span className="pointer-events-none absolute inset-1.5 rounded-xl border border-dashed border-primary/30" aria-hidden />
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={selectedProfile.key}
                          initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                          exit={{ opacity: 0, rotateY: 90, scale: 0.8 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          style={{ fontFamily: SERIF, transformPerspective: 500 }}
                          className="text-3xl font-semibold italic text-primary"
                        >
                          {selectedProfile.shortLabel}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Specializare selectată
                      </p>
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedProfile.key}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          <p className="mt-1 truncate text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                            {selectedProfile.label}
                          </p>
                          <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
                            {PROFILE_TAGS[selectedProfile.key]}
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                </motion.div>
              </motion.div>

              {/* Pașii înscrierii (cuprins numerotat, ca pe WelcomePage) */}
              <motion.ol variants={railItem} className="mt-9 hidden max-w-md space-y-5 sm:block">
                {ENROLLMENT_STEPS.map((step) => (
                  <li key={step.n} className="flex items-start gap-4">
                    <span style={{ fontFamily: SERIF }} className="text-2xl italic leading-none text-slate-300 dark:text-slate-700">
                      {step.n}
                    </span>
                    <div className="border-l-2 border-border pl-4">
                      <p className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{step.text}</p>
                    </div>
                  </li>
                ))}
              </motion.ol>
            </motion.aside>

            {/* ── Formularul ── */}
            <motion.section
              initial={{ opacity: 0, y: 32, rotateX: 7, transformPerspective: 1400 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, transformPerspective: 1400 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 opacity-60 blur-2xl" aria-hidden />

              <motion.div
                style={formTilt.style}
                {...formTilt.handlers}
                className="relative overflow-hidden rounded-[1.5rem] border-2 border-border bg-white/95 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:bg-slate-900/95 dark:shadow-none sm:p-10"
              >
                {/* Sigiliu academic în colț */}
                <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full border-2 border-primary/10 bg-primary/5 opacity-30" aria-hidden>
                  <div className="absolute inset-6 rounded-full border border-dashed border-primary/30" />
                </div>

                <div className="relative">
                  <div className="border-b-2 border-border pb-7">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Formular de înscriere</p>
                    <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-tighter text-slate-900 dark:text-white">
                      Solicitare acces
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                    <AlertMessage type="success" message={successMessage} />
                    <AlertMessage message={errorMessage} />

                    <GoogleSignInButton onClick={handleGoogleSignIn} loading={loading} />

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div className="space-y-3">
                        <label htmlFor="register-nume" className="ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Nume complet
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
                        <label htmlFor="register-email" className="ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Email academic
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
                    </div>

                    <div className="space-y-4">
                      <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Specializare (profilul liceal)
                      </label>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {PROFILES.map((p) => {
                          const active = formData.profiles.includes(p.key)
                          return (
                            <button
                              key={p.key}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setFormData((prev) => ({ ...prev, profiles: [p.key] }))}
                              className={`group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:[transform:perspective(700px)_rotateX(3deg)_rotateY(-2deg)_translateY(-2px)] ${
                                active
                                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                  : 'border-border bg-white hover:border-primary/50 dark:bg-white/5'
                              }`}
                            >
                              <div
                                className={`flex size-12 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                                  active
                                    ? 'border-primary/40 bg-primary text-white'
                                    : 'border-border bg-slate-50 text-slate-400 group-hover:text-primary dark:bg-white/5'
                                }`}
                              >
                                <span style={{ fontFamily: SERIF }} className="text-lg font-semibold italic">
                                  {p.shortLabel}
                                </span>
                              </div>
                              <div className="min-w-0 pr-5">
                                <p
                                  className={`truncate text-sm font-black uppercase tracking-tight ${
                                    active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {p.label}
                                </p>
                                <p className="truncate text-[11px] font-bold text-slate-400">{PROFILE_TAGS[p.key]}</p>
                              </div>
                              <span
                                className={`absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-white transition-transform duration-200 ${
                                  active ? 'scale-100' : 'scale-0'
                                }`}
                              >
                                <Check className="size-3" strokeWidth={3} />
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label htmlFor="register-password" className="ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Cheie de acces (minim 8 caractere)
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

                    <div className="space-y-4">
                      <AlertMessage message={legalError} />
                      <div className="flex items-start gap-3 rounded-xl border-2 border-border bg-slate-50/80 p-4 dark:bg-white/5">
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
                        <label
                          htmlFor="register-legal-consent"
                          className="cursor-pointer select-none text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400"
                        >
                          Am citit și accept{' '}
                          <button
                            type="button"
                            className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                            onClick={() => setLegalModal('terms')}
                          >
                            Termenii și Condițiile
                          </button>{' '}
                          și{' '}
                          <button
                            type="button"
                            className="font-bold text-primary underline underline-offset-2 hover:text-primary/80"
                            onClick={() => setLegalModal('privacy')}
                          >
                            Politica de Confidențialitate
                          </button>{' '}
                          MathUP.
                        </label>
                      </div>
                      <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Poți citi documentele și pe paginile{' '}
                        <Link to={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                          Termeni
                        </Link>{' '}
                        și{' '}
                        <Link to={LEGAL_ROUTES.privacy} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
                          Confidențialitate
                        </Link>
                        .
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="group h-16 w-full rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                      disabled={loading || !acceptedLegal}
                    >
                      {loading ? (
                        'Procesare în curs...'
                      ) : (
                        <>
                          Finalizează înregistrarea
                          <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Footer-ul cardului */}
                  <div className="mt-8 space-y-5 border-t-2 border-border pt-7 text-center">
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
                      <Link to={LEGAL_ROUTES.terms} className="hover:text-primary">
                        Termeni
                      </Link>
                      <Link to={LEGAL_ROUTES.privacy} className="hover:text-primary">
                        Confidențialitate
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Numărul de dosar (detaliu academic, ca pe AuthCard) */}
                <div className="pointer-events-none absolute bottom-5 right-7 select-none text-[10px] font-black uppercase tracking-[0.5em] text-slate-300 dark:text-slate-700">
                  Dosar MU-{dossierNo}
                </div>
              </motion.div>
            </motion.section>
          </div>
        </div>
      </main>

      <LegalDocumentModal open={legalModal !== null} documentType={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  )
}
