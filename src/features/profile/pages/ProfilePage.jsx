import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  User, 
  Camera, 
  Check, 
  BarChart3, 
  Sparkles, 
  Save, 
  ArrowLeft,
  Target,
  FileText,
  Ghost,
  Cat,
  Dog,
  Zap,
  Brain,
  Rocket,
  Star,
  GraduationCap
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { PROFILES, getProfileMeta } from '../../lessons/profiles'
import { getProfilesFromMetadata, normalizeProfile } from '../../../services/profileService'
import { canAccessProgram } from '../../../services/premiumAccessService'

const AVATAR_ICONS = [
  { id: 'user', icon: User, color: 'bg-blue-500' },
  { id: 'ghost', icon: Ghost, color: 'bg-purple-500' },
  { id: 'cat', icon: Cat, color: 'bg-orange-500' },
  { id: 'dog', icon: Dog, color: 'bg-amber-600' },
  { id: 'zap', icon: Zap, color: 'bg-yellow-500' },
  { id: 'brain', icon: Brain, color: 'bg-pink-500' },
  { id: 'rocket', icon: Rocket, color: 'bg-indigo-500' },
  { id: 'star', icon: Star, color: 'bg-emerald-500' },
]

export function ProfilePage() {
  const { user } = useAuth()
  const metadata = user?.user_metadata || {}
  const metadataSyncKey = user?.id ? JSON.stringify(metadata) : 'anonymous'

  return <ProfilePageContent key={metadataSyncKey} metadata={metadata} />
}

function ProfilePageContent({ metadata }) {
  const {
    updateUserMetadata,
    profileSaving,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
    isPremium,
    premiumExpiresAt,
    startPremiumCheckout,
    checkoutLoading,
    openPremiumModal,
    refreshEntitlement,
  } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [fullName, setFullName] = useState(metadata.full_name || '')
  const [selectedProfile, setSelectedProfile] = useState(() => getProfilesFromMetadata(metadata)[0])
  const [targetGrade, setTargetGrade] = useState(metadata.target_grade || '10.00')
  const [bio, setBio] = useState(metadata.bio || '')
  const [selectedAvatar, setSelectedAvatar] = useState(metadata.avatar_id || 'user')

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshEntitlement()
      setSuccessMessage('Plata Premium a fost confirmată. Accesul tău se activează în câteva secunde.')
    }
  }, [searchParams, refreshEntitlement, setSuccessMessage])

  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('')
        setErrorMessage('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage, errorMessage, setSuccessMessage, setErrorMessage])

  const handleSave = async () => {
    try {
      const program = normalizeProfile(selectedProfile)
      await updateUserMetadata({
        full_name: fullName.trim() || 'Elev',
        profiles: [program],
        profile: program,
        target_grade: targetGrade.trim() || '10.00',
        bio: bio.trim(),
        avatar_id: selectedAvatar
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const CurrentAvatarIcon = AVATAR_ICONS.find(a => a.id === selectedAvatar)?.icon || User
  const currentAvatarColor = AVATAR_ICONS.find(a => a.id === selectedAvatar)?.color || 'bg-primary'

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 pb-20">
      <Navbar />

      <main className="container py-12 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10 blur-3xl rounded-full" />

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              whileHover={{ x: -4 }}
            >
              <ArrowLeft className="size-4" />
              Înapoi la Dashboard
            </motion.button>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Profil Premium</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-primary/20 bg-primary/5 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Abonament Premium</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">
                {isPremium ? 'Ai acces complet la platformă' : 'Deblochează lecțiile, quiz-urile și materialele rezolvate'}
              </p>
              {isPremium && premiumExpiresAt ? (
                <p className="text-sm text-muted-foreground">Activ până la {new Date(premiumExpiresAt).toLocaleDateString('ro-RO')}</p>
              ) : null}
            </div>
            {!isPremium ? (
              <Button onClick={startPremiumCheckout} disabled={checkoutLoading} className="rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6">
                {checkoutLoading ? 'Redirecționare...' : 'Cumpără Premium'}
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Avatar & Quick Actions */}
            <div className="lg:col-span-4 space-y-8">
              <motion.div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="relative inline-block mb-6">
                  <div className={`size-32 rounded-[2.5rem] ${currentAvatarColor} flex items-center justify-center text-white shadow-2xl relative z-10 border-4 border-white dark:border-slate-800`}>
                    <CurrentAvatarIcon className="size-16" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg z-20 border-2 border-white dark:border-slate-800">
                    <Camera className="size-5" />
                  </div>
                </div>
                
                <h2 className="text-xl font-black tracking-tight mb-1">{fullName || 'Elev ScholarBAC'}</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6 leading-relaxed">
                  {getProfileMeta(selectedProfile).label}
                </p>

                <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-3">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Nota Țintă</span>
                      <span className="font-black text-primary">{targetGrade}</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(parseFloat(targetGrade) || 0) * 10}%` }} />
                   </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Detailed Settings */}
            <div className="lg:col-span-8 space-y-8">
              <motion.div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-white/10 shadow-xl space-y-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {successMessage && <AlertMessage message={successMessage} variant="success" />}
                {errorMessage && <AlertMessage message={errorMessage} variant="error" />}

                {/* Avatar Selection */}
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <User className="size-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Alege Avatar</h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {AVATAR_ICONS.map((avatar) => {
                      const Icon = avatar.icon
                      return (
                        <button
                          key={avatar.id}
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`relative size-12 rounded-xl flex items-center justify-center transition-all ${avatar.color} text-white shadow-sm ${selectedAvatar === avatar.id ? 'ring-4 ring-primary ring-offset-4 dark:ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                        >
                          <Icon className="size-6" />
                          {selectedAvatar === avatar.id && (
                            <div className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary flex items-center justify-center text-[8px] border border-white dark:border-slate-800">
                              <Check className="size-2.5" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Name Input */}
                  <section className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nume Complet</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Popescu Ion"
                    />
                  </section>

                  {/* Target Grade */}
                  <section className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                      <Target className="size-3" />
                      Nota Țintă (BAC)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white"
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(e.target.value)}
                      placeholder="Ex: 9.50"
                    />
                  </section>
                </div>

                {/* High school programs */}
                <section className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                    <BarChart3 className="size-3" />
                    Program liceal
                  </label>
                  <p className="text-xs text-muted-foreground -mt-1 mb-1">
                    Alege programul pentru care vrei să vezi lecțiile.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PROFILES.map((p) => {
                      const active = selectedProfile === p.key
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            if (!canAccessProgram(p.key, isPremium)) {
                              openPremiumModal()
                              return
                            }
                            setSelectedProfile(p.key)
                          }}
                          className={`relative flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${active ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}
                        >
                          {active && (
                            <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow-md">
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                          )}
                          <div className={`size-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500 group-hover:text-primary'}`}>
                            <BarChart3 className="size-5" />
                          </div>
                          <div className="min-w-0 pr-6">
                            <p className={`text-sm font-black tracking-tight ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Programă {p.shortLabel}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Bio */}
                <section className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                    <FileText className="size-3" />
                    Motto sau Scurtă Descriere
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium text-slate-700 dark:text-slate-300 resize-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Ce te motivează să înveți astăzi?"
                  />
                </section>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                   <Button 
                     onClick={handleSave} 
                     disabled={profileSaving}
                     className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 gap-3 font-black uppercase tracking-widest text-[10px]"
                   >
                      <Save className="size-4" />
                      {profileSaving ? 'Se salvează...' : 'Salvează Modificările'}
                   </Button>
                   <Button 
                     variant="ghost"
                     onClick={() => navigate('/dashboard')}
                     className="h-14 rounded-2xl px-8 border border-slate-200 dark:border-white/10 font-bold uppercase tracking-widest text-[10px]"
                   >
                      Anulează
                   </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <footer className="container py-12 text-center opacity-30">
        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all">
          <GraduationCap className="size-5" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">ScholarBAC Premium</span>
        </div>
      </footer>
    </div>
  )
}
