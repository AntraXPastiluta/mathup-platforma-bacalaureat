import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  Crown,
  Download,
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { UserAvatar } from '../../../shared/ui/UserAvatar'
import { getProfileMeta } from '../../lessons/profiles'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { getProfilesFromMetadata, normalizeProfile, normalizeTargetGrade, constrainTargetGradeInput } from '../../../services/profileService'
import { getSelectablePrograms } from '../../../services/premiumAccessService'
import { isEntitlementActive } from '../../../services/billingService'
import { uploadProfilePhoto } from '../../../services/profilePhotoService'
import { AVATAR_PRESETS } from '../avatarPresets'
import { LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { exportAndDownloadUserData } from '../../../services/gdprExportService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'

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
    openPremiumModal,
    cancelPremiumSubscription,
    cancelPremiumLoading,
    refreshEntitlement,
    isAdmin,
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
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      refreshEntitlement()
      setSuccessMessage('Abonament Premium activat. Portalul tău academic a fost actualizat.')
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
        ...(isPremium ? { target_grade: normalizeTargetGrade(targetGrade) } : {}),
        bio: bio.trim(),
        avatar_id: selectedAvatar,
        avatar_photo_url: avatarPhotoUrl || null,
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    setErrorMessage('')
    try {
      await exportAndDownloadUserData()
      setSuccessMessage('Exportul datelor a fost descărcat pe dispozitivul tău.')
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.download))
    } finally {
      setExportLoading(false)
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
      setSuccessMessage('Fotografia de profil a fost sincronizată.')
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.upload))
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
  const hasPaidPremium = isEntitlementActive(entitlement)
  const hasManagedPremiumSubscription = Boolean(entitlement?.stripe_subscription_id)
  const canCancelPremiumSubscription =
    hasManagedPremiumSubscription &&
    hasPaidPremium &&
    !entitlement?.cancel_at_period_end

  const premiumStatusTitle = isPremium ? 'MathUP Premium' : 'Acces Standard'
  const premiumStatusBadge = isAdmin
    ? 'Administrator'
    : isPremium
      ? 'Activ'
      : null
  const premiumStatusDescription = useMemo(() => {
    if (isAdmin) {
      return 'Ca administrator ai deja acces MathUP Premium: roadmaps, variante rezolvate și toate programele liceale (M1, M2, M3), fără abonament plătit.'
    }
    if (isPremium && hasPaidPremium) {
      return `Acces nelimitat la roadmaps, variante rezolvate și toate programele liceale. Activ până la ${premiumExpiresAt ? new Date(premiumExpiresAt).toLocaleDateString('ro-RO') : 'dată nedefinită'}.`
    }
    if (isPremium) {
      return 'Acces nelimitat la roadmaps, variante rezolvate și toate programele liceale.'
    }
    return 'Deblochează experiența completă MathUP: roadmaps, variante rezolvate și acces la toate programele liceale (M1, M2, M3).'
  }, [isAdmin, isPremium, hasPaidPremium, premiumExpiresAt])

  const handleCancelPremium = async () => {
    const confirmed = window.confirm(
      'Abonamentul Premium va fi terminat la sfârșitul perioadei curente. Confirmi dezactivarea?',
    )
    if (!confirmed) return

    setErrorMessage('')
    try {
      await cancelPremiumSubscription()
    } catch (error) {
      console.error('Failed to cancel premium subscription:', error)
    }
  }

  const sectionLabelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 mb-3 block"
  const inputClass = "w-full bg-slate-50 dark:bg-white/5 border-2 border-border rounded-xl px-5 py-4 focus:outline-none focus:border-primary transition-all font-bold text-slate-900 dark:text-white"

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 pb-32">
      <MathRainCurtain />
      <Navbar />

      <main className="page-ambient-content container relative py-16">

        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header Navigation */}
          <div className="flex items-center justify-between border-b-2 border-border pb-8">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
              whileHover={{ x: -4 }}
            >
              <ArrowLeft className="size-4" />
              Portal Dashboard
            </motion.button>
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity / Profile Settings</span>
            </div>
          </div>

          {/* Premium Status Banner */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[2rem] border-2 border-border bg-white p-10 dark:bg-slate-900 shadow-xl"
          >
            <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-6">
                <div className="size-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center dark:bg-white dark:text-slate-900 shadow-2xl">
                  <Crown className="size-8" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                      {premiumStatusTitle}
                    </h2>
                    {premiumStatusBadge && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white ${
                        isAdmin ? 'bg-primary' : 'bg-emerald-500'
                      }`}>
                        {premiumStatusBadge}
                      </span>
                    )}
                  </div>
                  <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    {premiumStatusDescription}
                  </p>
                </div>
              </div>
              
              {!isPremium ? (
                <Button
                  onClick={openPremiumModal}
                  className="h-16 px-10 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                >
                  Activează MathUP Premium
                </Button>
              ) : canCancelPremiumSubscription ? (
                <Button
                  onClick={handleCancelPremium}
                  disabled={cancelPremiumLoading}
                  variant="outline"
                  className="h-14 px-8 border-red-100 text-red-600 hover:bg-red-50"
                >
                  {cancelPremiumLoading ? 'Procesare...' : 'Întrerupe Abonament'}
                </Button>
              ) : null}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Identity Preview */}
            <aside className="lg:col-span-4 space-y-8">
              <motion.div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border-2 border-border shadow-2xl text-center relative overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative mx-auto mb-8 size-44">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600"
                    aria-hidden
                  />
                  <div className="absolute inset-2 flex items-center justify-center">
                    <UserAvatar
                      metadata={previewMetadata}
                      avatarId={selectedAvatar}
                      className="!size-36 border-4 border-white shadow-2xl dark:border-slate-800"
                      imageClassName="rounded-full"
                      fallbackClassName="rounded-full"
                    />
                  </div>
                  <label
                    className="absolute bottom-1 right-1 z-20 flex size-11 cursor-pointer items-center justify-center rounded-xl bg-slate-800 text-white shadow-lg ring-4 ring-white transition-colors hover:bg-primary dark:bg-slate-700 dark:ring-slate-900"
                    title="Încarcă fotografie"
                  >
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
                
                <div className="space-y-1 mb-8">
                   <h2 className="text-2xl font-black uppercase tracking-tighter">{fullName || 'Student'}</h2>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{getProfileMeta(selectedProfile).label}</p>
                </div>

                {isPremium && (
                  <div className="space-y-4 pt-8 border-t-2 border-border">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Țintă Academică</span>
                      <span className="text-primary">{targetGrade} / 10</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary" 
                        initial={{ width: 0 }}
                        animate={{ width: `${targetGradeProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </aside>

            {/* Right Column: Settings */}
            <section className="lg:col-span-8">
              <motion.div 
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 md:p-14 border-2 border-border shadow-2xl space-y-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {successMessage && <AlertMessage message={successMessage} type="success" className="mb-6" />}
                {errorMessage && <AlertMessage message={errorMessage} type="error" className="mb-6" />}

                {/* Avatar Presets */}
                <div className="space-y-6">
                  <label className={sectionLabelClass}>Insignă Digitală / Avatar</label>
                  <div className="grid grid-cols-4 gap-5 sm:grid-cols-8">
                    {AVATAR_PRESETS.map((avatar) => {
                      const Icon = avatar.icon
                      const isActive = selectedAvatar === avatar.id && !avatarPhotoUrl
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatar(avatar.id)
                            setAvatarPhotoUrl('')
                          }}
                          className={`group relative mx-auto flex size-14 items-center justify-center rounded-full transition-all ${avatar.color} text-white shadow-md ${
                            isActive
                              ? 'scale-110 ring-4 ring-primary ring-offset-2 dark:ring-offset-slate-900'
                              : 'opacity-50 hover:scale-105 hover:opacity-100'
                          }`}
                          aria-label={`Avatar ${avatar.id}`}
                          aria-pressed={isActive}
                        >
                          <Icon className="size-6" />
                          {isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary dark:border-slate-900">
                              <Check className="size-3 text-white" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  {avatarPhotoUrl && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Folosești fotografia încărcată. Alege o insignă pentru a reveni la pictograme.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label htmlFor="full-name" className={sectionLabelClass}>Nume Complet</label>
                    <input
                      id="full-name"
                      type="text"
                      className={inputClass}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Popescu Ion"
                    />
                  </div>

                  {isPremium && (
                    <div className="space-y-2">
                      <label htmlFor="target-grade" className={sectionLabelClass}>Obiectiv Notă BAC</label>
                      <div className="relative">
                         <Target className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                         <input
                           id="target-grade"
                           type="text"
                           inputMode="decimal"
                           className={`${inputClass} pl-12`}
                           value={targetGrade}
                           onChange={(e) => setTargetGrade(constrainTargetGradeInput(e.target.value))}
                           onBlur={() => setTargetGrade(normalizeTargetGrade(targetGrade))}
                         />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <label className={sectionLabelClass}>Specializare / Programă</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectablePrograms.map((p) => {
                      const active = selectedProfile === p.key
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setSelectedProfile(p.key)}
                          className={`relative flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${active ? 'bg-primary/5 border-primary shadow-lg' : 'bg-slate-50 dark:bg-white/2 border-border hover:border-slate-400'}`}
                        >
                          <div className={`size-10 rounded-lg flex items-center justify-center ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-400'}`}>
                            <BarChart3 className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-black uppercase tracking-tight ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{p.label}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Programa {p.shortLabel}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bio" className={sectionLabelClass}>Motto Personal</label>
                  <textarea
                    id="bio"
                    rows={3}
                    className={`${inputClass} resize-none font-medium text-base italic`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Care este motivația ta pentru studiu?"
                  />
                </div>

                <div className="space-y-4 rounded-2xl border-2 border-border bg-slate-50/80 p-6 dark:bg-white/2">
                  <div className="flex items-start gap-3">
                    <Download className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="space-y-2">
                      <p className={sectionLabelClass}>Datele mele (GDPR)</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Poți descărca o copie structurată a datelor tale (cont, progres, quiz-uri,
                        abonament Premium, mesaje suport) în format JSON, conform dreptului la portabilitate.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Limită: maximum 3 exporturi la 24 de ore.{' '}
                        <Link
                          to={LEGAL_ROUTES.privacy}
                          className="font-semibold text-primary underline underline-offset-2"
                        >
                          Politica de confidențialitate
                        </Link>
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportData}
                    disabled={exportLoading || profileSaving}
                    className="h-14 w-full rounded-xl sm:w-auto sm:min-w-[280px]"
                  >
                    {exportLoading ? 'Se generează exportul...' : 'Descarcă datele mele'}
                  </Button>
                </div>

                <div className="pt-10 border-t-2 border-border flex flex-col sm:flex-row gap-4">
                   <Button 
                     onClick={handleSave} 
                     disabled={profileSaving}
                     className="flex-1 h-16 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                   >
                      {profileSaving ? 'Sincronizare...' : 'Salvează Profilul'}
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => navigate('/dashboard')}
                     className="h-16 px-10 rounded-xl"
                   >
                      Anulează
                   </Button>
                </div>
              </motion.div>
            </section>
          </div>
        </div>
      </main>

      <footer className="container py-24 text-center opacity-40">
        <div className="flex flex-col items-center gap-4 grayscale hover:grayscale-0 transition-all duration-700">
          <BrandLogo className="size-10" />
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-[0.6em] text-slate-900 dark:text-white">
              MathUP Scholarly Syllabus
            </span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Academic Foundation & Registry
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
