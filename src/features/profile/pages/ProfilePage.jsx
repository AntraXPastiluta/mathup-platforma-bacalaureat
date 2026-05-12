import { useState, useEffect, useMemo } from 'react'
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
  GraduationCap,
  Crown,
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { UserAvatar } from '../../../shared/ui/UserAvatar'
import { getProfileMeta } from '../../lessons/profiles'
import { getProfilesFromMetadata, normalizeProfile, normalizeTargetGrade, constrainTargetGradeInput } from '../../../services/profileService'
import { getSelectablePrograms } from '../../../services/premiumAccessService'
import { uploadProfilePhoto } from '../../../services/profilePhotoService'
import { AVATAR_PRESETS } from '../avatarPresets'

export function ProfilePage() {
  const { user } = useAuth()
  const metadata = user?.user_metadata || {}
  const metadataSyncKey = user?.id ? JSON.stringify(metadata) : 'anonymous'

  return <ProfilePageContent key={metadataSyncKey} metadata={metadata} />
}

function ProfilePageContent({ metadata }) {
  const {
    user,
    updateUserMetadata,
    profileSaving,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
    isPremium,
    premiumExpiresAt,
    entitlement,
    startPremiumCheckout,
    cancelPremiumSubscription,
    checkoutLoading,
    cancelPremiumLoading,
    refreshEntitlement,
  } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [fullName, setFullName] = useState(metadata.full_name || '')
  const [selectedProfile, setSelectedProfile] = useState(() => getProfilesFromMetadata(metadata)[0])
  const [targetGrade, setTargetGrade] = useState(() => normalizeTargetGrade(metadata.target_grade))
  const [bio, setBio] = useState(metadata.bio || '')
  const [selectedAvatar, setSelectedAvatar] = useState(metadata.avatar_id || 'user')
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState(metadata.avatar_photo_url || '')
  const [photoUploading, setPhotoUploading] = useState(false)

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
        target_grade: normalizeTargetGrade(targetGrade),
        bio: bio.trim(),
        avatar_id: selectedAvatar,
        avatar_photo_url: avatarPhotoUrl || null,
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !user?.id) return

    setPhotoUploading(true)
    setErrorMessage('')
    try {
      const url = await uploadProfilePhoto(file, user.id)
      setAvatarPhotoUrl(url)
      await updateUserMetadata({ avatar_photo_url: url })
      setSuccessMessage('Fotografia de profil a fost actualizată.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Nu am putut încărca fotografia.')
    } finally {
      setPhotoUploading(false)
      event.target.value = ''
    }
  }

  const registeredProfiles = useMemo(() => getProfilesFromMetadata(metadata), [metadata])
  const selectablePrograms = getSelectablePrograms(isPremium, registeredProfiles)
  const previewMetadata = useMemo(
    () => ({ ...metadata, avatar_id: selectedAvatar, avatar_photo_url: avatarPhotoUrl }),
    [metadata, selectedAvatar, avatarPhotoUrl],
  )
  const targetGradeProgress = Math.min(100, (Number.parseFloat(normalizeTargetGrade(targetGrade)) || 0) * 10)
  const hasManagedPremiumSubscription = Boolean(entitlement?.stripe_subscription_id)
  const canCancelPremiumSubscription = hasManagedPremiumSubscription && !entitlement?.cancel_at_period_end

  const handleCancelPremium = async () => {
    const confirmed = window.confirm(
      'Abonamentul Premium se anulează la sfârșitul perioadei curente. Păstrezi accesul până atunci. Continui?',
    )
    if (!confirmed) return

    setErrorMessage('')
    try {
      await cancelPremiumSubscription()
    } catch (error) {
      console.error('Failed to cancel premium subscription:', error)
    }
  }

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

          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-white/80 p-6 shadow-xl shadow-primary/10 dark:bg-slate-900/80 dark:shadow-primary/5 md:p-7">
            <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-0 size-36 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-lg shadow-primary/25">
                    <Crown className="size-6" />
                  </div>
                  <motion.div layout className="space-y-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">ScholarBAC Premium</p>
                      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                        {isPremium ? 'Ai acces la roadmap și la toate programele' : 'Deblochează roadmap-ul de studiu'}
                      </h2>
                    </div>
                    {isPremium ? (
                      <div className="space-y-2">
                        <motion.div layout className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          <Check className="size-3.5" />
                          {premiumExpiresAt
                            ? `Activ până la ${new Date(premiumExpiresAt).toLocaleDateString('ro-RO')}`
                            : 'Premium activ'}
                        </motion.div>
                        {entitlement?.cancel_at_period_end ? (
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Abonamentul nu se va reînnoi la sfârșitul perioadei curente.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
                        Acces la roadmap-ul de studiu, variante rezolvate și toate programele liceale.
                      </p>
                    )}
                  </motion.div>
                </div>
                {!isPremium ? (
                  <Button
                    onClick={startPremiumCheckout}
                    disabled={checkoutLoading}
                    className="h-14 w-full shrink-0 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-8 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 lg:w-auto"
                  >
                    <Sparkles className="size-4" />
                    {checkoutLoading ? 'Redirecționare...' : 'Cumpără Premium'}
                  </Button>
                ) : null}
              </div>
              {canCancelPremiumSubscription ? (
                <div className="flex flex-col gap-3 border-t border-primary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Poți anula oricând. Accesul rămâne până la sfârșitul perioadei plătite.
                  </p>
                  <Button
                    onClick={handleCancelPremium}
                    disabled={cancelPremiumLoading}
                    variant="ghost"
                    className="h-11 shrink-0 rounded-2xl border border-slate-200 px-5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    {cancelPremiumLoading ? 'Se anulează...' : 'Anulează abonamentul'}
                  </Button>
                </div>
              ) : null}
            </div>
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
                  <UserAvatar
                    metadata={previewMetadata}
                    size="lg"
                    className="relative z-10 border-4 border-white shadow-2xl dark:border-slate-800"
                    imageClassName="rounded-[2.5rem]"
                    fallbackClassName="rounded-[2.5rem]"
                  />
                  <label className="absolute -bottom-2 -right-2 z-20 flex size-10 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-primary text-white shadow-lg dark:border-slate-800">
                    <Camera className="size-5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={photoUploading || profileSaving}
                    />
                  </label>
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
                      <div className="h-full bg-primary" style={{ width: `${targetGradeProgress}%` }} />
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
                    <h3 className="text-sm font-black uppercase tracking-widest">Avatar sau fotografie</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Poți încărca o fotografie personală din cardul din stânga sau poți alege un avatar presetat.
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {AVATAR_PRESETS.map((avatar) => {
                      const Icon = avatar.icon
                      return (
                        <button
                          key={avatar.id}
                          onClick={() => {
                            setSelectedAvatar(avatar.id)
                            setAvatarPhotoUrl('')
                          }}
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
                      inputMode="decimal"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white"
                      value={targetGrade}
                      onChange={(e) => setTargetGrade(constrainTargetGradeInput(e.target.value))}
                      onBlur={() => setTargetGrade(normalizeTargetGrade(targetGrade))}
                      placeholder="Ex: 9.50"
                    />
                    <p className="text-xs text-muted-foreground ml-1">Nota țintă poate fi cel mult 10.</p>
                  </section>
                </div>

                {/* High school programs */}
                <section className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                    <BarChart3 className="size-3" />
                    Program liceal
                  </label>
                  <p className="text-xs text-muted-foreground -mt-1 mb-1">
                    {isPremium
                      ? 'Alege programul pentru care vrei să vezi lecțiile.'
                      : 'Pe contul gratuit poți gestiona programul ales la crearea contului. Pentru alte programe este necesar Premium.'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectablePrograms.map((p) => {
                      const active = selectedProfile === p.key
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setSelectedProfile(p.key)}
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
