import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Camera,
  Check,
  ArrowLeft,
  Target,
  Crown,
  Download,
  Trash2,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  Hash,
  Pencil,
  FileText,
  BadgeCheck,
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
import { isEntitlementActive, syncPremiumCheckout } from '../../../services/billingService'
import { uploadProfilePhoto } from '../../../services/profilePhotoService'
import { AVATAR_PRESETS } from '../avatarPresets'
import { LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { exportAndDownloadUserData } from '../../../services/gdprExportService'
import {
  requestAccountDeletion,
  confirmAccountDeletion,
  readPendingAccountDeletionSession,
  savePendingAccountDeletionSession,
  clearPendingAccountDeletionSession,
} from '../../../services/accountDeletionService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { AccountDeletionModal } from '../components/AccountDeletionModal'

// After a successful Stripe checkout the webhook may not have written the
// entitlement yet, so we poll a few times before giving up. When we already
// pushed the session id ourselves the sync is faster, so we poll more eagerly.
const ENTITLEMENT_POLL_ATTEMPTS = 8
const ENTITLEMENT_POLL_DELAY_WITH_SESSION_MS = 600
const ENTITLEMENT_POLL_DELAY_WITHOUT_SESSION_MS = 1500

// Intrare scenografiată: blocurile paginii apar pe rând, ca filele unui dosar.
const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}

const blockVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

// Antet de secțiune numerotat — dă paginii ritmul unui registru oficial.
function SectionHeading({ index, icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50 font-heading text-[11px] font-black tabular-nums text-primary dark:bg-white/[0.04]">
        {index}
      </span>
      {Icon ? <Icon className="size-4 shrink-0 text-slate-400" aria-hidden /> : null}
      <h3 className="font-heading text-sm font-black uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">
        {title}
      </h3>
      <span className="ml-2 h-px flex-1 bg-gradient-to-r from-border to-transparent" aria-hidden />
    </div>
  )
}

export function ProfilePage() {
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
    signOutAfterAccountDeletion,
  } = useAuth()
  const metadata = user?.user_metadata || {}
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
  const [checkoutActivating, setCheckoutActivating] = useState(false)
  const [deletionStep, setDeletionStep] = useState(() => readPendingAccountDeletionSession(user?.id)?.step ?? null)
  const [deletionCode, setDeletionCode] = useState(() => readPendingAccountDeletionSession(user?.id)?.code ?? '')
  const [deletionLoading, setDeletionLoading] = useState(false)
  const [deletionError, setDeletionError] = useState('')
  const [deletionModalOpen, setDeletionModalOpen] = useState(
    () => readPendingAccountDeletionSession(user?.id)?.step === 'awaiting_code',
  )

  // Resetează câmpurile formularului doar la schimbarea contului (login/logout),
  // nu la fiecare actualizare de metadate în fundal (ex. last_location, streak).
  useEffect(() => {
    if (!user?.id) return
    setFullName(metadata.full_name || '')
    setSelectedProfile(getProfilesFromMetadata(metadata)[0])
    setTargetGrade(normalizeTargetGrade(metadata.target_grade))
    setBio(metadata.bio || '')
    setSelectedAvatar(metadata.avatar_id || 'user')
    setAvatarPhotoUrl(metadata.avatar_photo_url || '')
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    if (deletionStep === 'awaiting_code') {
      savePendingAccountDeletionSession(user.id, { code: deletionCode })
      return
    }
    clearPendingAccountDeletionSession()
  }, [user?.id, deletionStep, deletionCode])

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return

    let cancelled = false

    async function activatePremiumAfterCheckout() {
      setCheckoutActivating(true)
      setErrorMessage('')
      setSuccessMessage('')

      try {
        const sessionId = searchParams.get('session_id')
        if (sessionId) {
          await syncPremiumCheckout(sessionId)
        }

        const pollDelayMs = sessionId
          ? ENTITLEMENT_POLL_DELAY_WITH_SESSION_MS
          : ENTITLEMENT_POLL_DELAY_WITHOUT_SESSION_MS

        for (let attempt = 0; attempt < ENTITLEMENT_POLL_ATTEMPTS; attempt += 1) {
          if (cancelled) return
          const row = await refreshEntitlement()
          if (isEntitlementActive(row)) {
            setSuccessMessage('Abonament Premium activat. Portalul tău academic a fost actualizat.')
            navigate('/profile', { replace: true })
            return
          }
          await new Promise((resolve) => setTimeout(resolve, pollDelayMs))
        }

        setErrorMessage(
          'Plata a fost înregistrată, dar activarea Premium durează mai mult. Reîncarcă pagina în câteva minute sau contactează suportul.',
        )
        navigate('/profile', { replace: true })
      } catch (error) {
        setErrorMessage(
          toUserFacingError(
            error,
            'Nu am putut confirma activarea Premium. Contactează suportul dacă plata a fost debitată.',
          ),
        )
      } finally {
        if (!cancelled) setCheckoutActivating(false)
      }
    }

    void activatePremiumAfterCheckout()

    return () => {
      cancelled = true
    }
  }, [searchParams, refreshEntitlement, setSuccessMessage, setErrorMessage, navigate])

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

  // Cod de registru stabil derivat din id-ul contului — detaliul de „legitimație".
  const registryCode = useMemo(() => {
    const raw = (user?.id || '').replace(/[^a-zA-Z0-9]/g, '')
    const tail = raw.slice(-6).toUpperCase()
    return `MUP-${tail || '000000'}`
  }, [user?.id])

  const memberSince = useMemo(() => {
    const createdAt = user?.created_at
    if (!createdAt) return null
    const date = new Date(createdAt)
    return Number.isNaN(date.getTime()) ? null : date.getFullYear()
  }, [user?.created_at])

  const selectedProgramMeta = getProfileMeta(selectedProfile)

  const handleCancelPremium = async () => {
    const confirmed = window.confirm(
      'Abonamentul Premium va fi terminat la sfârșitul perioadei curente. Confirmi dezactivarea?',
    )
    if (!confirmed) return

    setErrorMessage('')
    try {
      await cancelPremiumSubscription()
    } catch (error) {
      setErrorMessage(
        toUserFacingError(error, 'Nu am putut anula abonamentul Premium. Încearcă din nou sau contactează suportul.'),
      )
    }
  }

  const handleCancelDeletion = () => {
    setDeletionStep(null)
    setDeletionCode('')
    setDeletionError('')
    clearPendingAccountDeletionSession()
    setDeletionModalOpen(false)
  }

  const handleRequestDeletion = async () => {
    setDeletionError('')
    setDeletionLoading(true)
    try {
      await requestAccountDeletion()
      setDeletionStep('awaiting_code')
      setDeletionCode('')
    } catch (error) {
      setDeletionError(error?.message || 'Nu am putut trimite codul. Încearcă din nou.')
    } finally {
      setDeletionLoading(false)
    }
  }

  const handleConfirmDeletion = async () => {
    setDeletionError('')
    setDeletionLoading(true)
    try {
      await confirmAccountDeletion(deletionCode)
      setDeletionModalOpen(false)
      setDeletionStep(null)
      setDeletionCode('')
      clearPendingAccountDeletionSession()
      navigate('/', { replace: true })
      await signOutAfterAccountDeletion()
    } catch (error) {
      setDeletionError(error?.message || 'Nu am putut șterge contul. Încearcă din nou.')
      setDeletionLoading(false)
    }
  }

  const fieldLabelClass = 'mb-2 ml-0.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400'
  const inputClass = 'w-full rounded-xl border border-border bg-slate-50 px-4 py-3.5 text-[15px] font-semibold text-slate-900 transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 dark:bg-white/[0.04] dark:text-white'

  return (
    <div className="relative min-h-screen pb-32 text-slate-900 transition-colors duration-500 dark:text-slate-50">
      <MathRainCurtain />
      <Navbar />

      <main className="page-ambient-content container relative py-16">
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-5xl space-y-10"
        >
          {/* Masthead — bară de registru */}
          <motion.div
            variants={blockVariants}
            className="flex items-end justify-between gap-4 border-b border-border pb-6"
          >
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="group flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-primary"
              whileHover={{ x: -4 }}
            >
              <span className="flex size-8 items-center justify-center rounded-lg border border-border transition-colors group-hover:border-primary">
                <ArrowLeft className="size-4" />
              </span>
              Tabloul de bord
            </motion.button>
            <div className="text-right">
              <p className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">
                Registrul candidatului
              </p>
              <p className="font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70 tabular-nums">
                {registryCode}
              </p>
            </div>
          </motion.div>

          {/* Titlu pagină */}
          <motion.div variants={blockVariants} className="space-y-2">
            <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Profilul tău
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Personalizează-ți identitatea de candidat, gestionează abonamentul și controlează-ți datele.
            </p>
          </motion.div>

          {/* Banner status Premium */}
          <motion.div variants={blockVariants}>
            {checkoutActivating ? (
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-8 dark:bg-slate-900">
                <div className="flex items-center gap-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  <div className="size-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  Confirmăm activarea Premium...
                </div>
              </div>
            ) : isPremium ? (
              <div className="relative overflow-hidden rounded-[1.75rem] border border-primary/30 bg-gradient-to-br from-white via-indigo-50/40 to-primary/[0.06] p-8 text-slate-900 shadow-[0_24px_60px_-32px_rgba(67,56,202,0.45)] sm:p-10 dark:bg-slate-900 dark:bg-none dark:text-white dark:shadow-[0_30px_70px_-32px_rgba(67,56,202,0.7)]">
                <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/30" aria-hidden />
                <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-400/20" aria-hidden />
                <span className="profile-foil hidden dark:block" aria-hidden />
                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-5">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-400 shadow-lg shadow-primary/40 ring-1 ring-white/20">
                      <Crown className="size-8 text-white" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-heading text-2xl font-black uppercase tracking-tight">
                          {premiumStatusTitle}
                        </h2>
                        {premiumStatusBadge && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-white ${
                            isAdmin ? 'bg-primary' : 'bg-emerald-500/90'
                          }`}>
                            <BadgeCheck className="size-3" />
                            {premiumStatusBadge}
                          </span>
                        )}
                      </div>
                      <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                        {premiumStatusDescription}
                      </p>
                    </div>
                  </div>

                  {canCancelPremiumSubscription && (
                    <motion.button
                      type="button"
                      onClick={handleCancelPremium}
                      disabled={cancelPremiumLoading}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="shrink-0 self-start rounded-xl border border-red-200 bg-red-50 px-7 py-3.5 text-xs font-black uppercase tracking-widest text-red-600 transition-colors hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:opacity-40 lg:self-auto dark:border-white/20 dark:bg-white/5 dark:text-red-300 dark:hover:border-red-400/60 dark:hover:bg-red-500/10 dark:hover:text-red-200"
                    >
                      {cancelPremiumLoading ? 'Procesare...' : 'Întrerupe abonamentul'}
                    </motion.button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-8 shadow-[0_18px_48px_-24px_rgba(67,56,202,0.28)] sm:p-10 dark:bg-slate-900">
                <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-5">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900">
                      <Crown className="size-8" />
                    </div>
                    <div className="space-y-3">
                      <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        {premiumStatusTitle}
                      </h2>
                      <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {premiumStatusDescription}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={openPremiumModal}
                    className="h-16 shrink-0 rounded-xl bg-primary px-10 text-white shadow-xl shadow-primary/20"
                  >
                    Activează MathUP Premium
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={pageVariants} className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Coloana stângă — legitimația candidatului */}
            <motion.aside
              variants={blockVariants}
              className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
            >
              <div className="profile-id-card relative overflow-hidden rounded-[1.75rem] border border-border shadow-[0_24px_60px_-30px_rgba(67,56,202,0.45)]">
                {/* Bandă superioară */}
                <div className="flex items-center justify-between border-b border-border bg-slate-900 px-6 py-4 text-white dark:bg-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <BrandLogo className="size-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Legitimație candidat</span>
                  </div>
                  <BadgeCheck className="size-4 text-primary-300" />
                </div>

                {/* Corp */}
                <div className="px-6 pt-8 pb-6 text-center">
                  <div className="relative mx-auto mb-6 size-40">
                    <div
                      className="profile-orbit-ring motion-reduce:animate-none pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600"
                      aria-hidden
                    />
                    <div className="absolute inset-2 flex items-center justify-center">
                      <UserAvatar
                        metadata={previewMetadata}
                        avatarId={selectedAvatar}
                        className="!size-32 border-4 border-white shadow-2xl dark:border-slate-800"
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

                  <div className="mb-6 space-y-1">
                    <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {fullName || 'Elev'}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                      {selectedProgramMeta.label}
                    </p>
                  </div>

                  {/* Date de registru */}
                  <dl className="overflow-hidden rounded-xl border border-border text-left">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-slate-50/70 px-4 py-2.5 dark:bg-white/[0.03]">
                      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <Hash className="size-3" /> Nr. registru
                      </dt>
                      <dd className="font-heading text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">
                        {registryCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <GraduationCap className="size-3" /> Programă
                      </dt>
                      <dd className="font-heading text-xs font-black uppercase text-slate-700 dark:text-slate-200">
                        {selectedProgramMeta.shortLabel}
                      </dd>
                    </div>
                    {memberSince && (
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <Sparkles className="size-3" /> Membru din
                        </dt>
                        <dd className="font-heading text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">
                          {memberSince}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Obiectiv notă — inel de progres (Premium) */}
                  {isPremium && (
                    <div className="mt-5 flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
                      <div className="relative size-14 shrink-0">
                        <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
                          <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="2.5" className="stroke-slate-200 dark:stroke-white/10" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.9155"
                            fill="none"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            className="stroke-primary transition-[stroke-dasharray] duration-700"
                            strokeDasharray={`${targetGradeProgress} 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="font-heading text-base font-black tabular-nums text-primary">{targetGrade}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Obiectiv notă BAC</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          Țintești nota {targetGrade} din 10
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linie de rupere + ștampilă */}
                <div className="border-t border-dashed border-border" />
                <div className="flex items-center justify-between px-6 py-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  <span>MathUP · Bacalaureat</span>
                  <span>M1 · M2 · M3</span>
                </div>
              </div>
            </motion.aside>

            {/* Coloana dreaptă — formularul */}
            <motion.section variants={blockVariants} className="lg:col-span-8">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-white p-8 shadow-[0_18px_48px_-24px_rgba(67,56,202,0.28)] md:p-12 dark:bg-slate-900/80 dark:backdrop-blur-sm">
                <div className="space-y-12">
                  {successMessage && <AlertMessage message={successMessage} type="success" />}
                  {errorMessage && <AlertMessage message={errorMessage} type="error" />}

                  {/* 01 — Insignă & fotografie */}
                  <section className="space-y-6">
                    <SectionHeading index="01" icon={Sparkles} title="Insignă & fotografie" />
                    <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
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
                            className={`group relative mx-auto flex size-14 items-center justify-center rounded-2xl text-white shadow-md transition-all ${avatar.color} ${
                              isActive
                                ? 'scale-105 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900'
                                : 'opacity-55 hover:scale-105 hover:opacity-100'
                            }`}
                            aria-label={`Avatar ${avatar.id}`}
                            aria-pressed={isActive}
                          >
                            <Icon className="size-6" />
                            {isActive && (
                              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary dark:border-slate-900">
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
                  </section>

                  {/* 02 — Date personale */}
                  <section className="space-y-6">
                    <SectionHeading index="02" icon={Pencil} title="Date personale" />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label htmlFor="full-name" className={fieldLabelClass}>Nume complet</label>
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
                        <div>
                          <label htmlFor="target-grade" className={fieldLabelClass}>Obiectiv notă BAC</label>
                          <div className="relative">
                            <Target className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <input
                              id="target-grade"
                              type="text"
                              inputMode="decimal"
                              className={`${inputClass} pl-11`}
                              value={targetGrade}
                              onChange={(e) => setTargetGrade(constrainTargetGradeInput(e.target.value))}
                              onBlur={() => setTargetGrade(normalizeTargetGrade(targetGrade))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 03 — Specializare */}
                  <section className="space-y-6">
                    <SectionHeading index="03" icon={GraduationCap} title="Specializare / Programă" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {selectablePrograms.map((p) => {
                        const active = selectedProfile === p.key
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setSelectedProfile(p.key)}
                            className={`group relative flex items-center gap-4 rounded-2xl border p-5 text-left transition-all ${
                              active
                                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                : 'border-border bg-slate-50 hover:border-slate-400 dark:bg-white/[0.03]'
                            }`}
                          >
                            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400 dark:bg-white/5'
                            }`}>
                              <GraduationCap className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-heading text-sm font-black uppercase tracking-tight ${
                                active ? 'text-primary' : 'text-slate-700 dark:text-slate-300'
                              }`}>
                                {p.label}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Programa {p.shortLabel}
                              </p>
                            </div>
                            {active && <Check className="ml-auto size-5 shrink-0 text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* 04 — Motto personal */}
                  <section className="space-y-4">
                    <SectionHeading index="04" icon={FileText} title="Motto personal" />
                    <textarea
                      id="bio"
                      rows={3}
                      aria-label="Motto personal"
                      className={`${inputClass} resize-none text-[15px] font-medium italic`}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Care este motivația ta pentru studiu?"
                    />
                  </section>

                  {/* 05 — Datele mele (GDPR) */}
                  <section className="space-y-5">
                    <SectionHeading index="05" icon={Download} title="Datele mele (GDPR)" />
                    <div className="space-y-4 rounded-2xl border border-border bg-slate-50/70 p-5 sm:p-6 dark:bg-white/[0.03]">
                      <div className="flex items-start gap-4">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Download className="size-5" />
                        </span>
                        <div className="space-y-2">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Portabilitatea datelor</p>
                          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
                  </section>

                  {/* Acțiuni */}
                  <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row">
                    <Button
                      onClick={handleSave}
                      disabled={profileSaving}
                      className="h-16 flex-1 rounded-xl bg-primary text-white shadow-xl shadow-primary/20"
                    >
                      {profileSaving ? 'Sincronizare...' : 'Salvează profilul'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                      className="h-16 rounded-xl px-10"
                    >
                      Anulează
                    </Button>
                  </div>

                  {/* Zonă periculoasă — ștergerea contului */}
                  <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50/60 p-5 sm:p-6 dark:border-red-900/40 dark:bg-red-950/20">
                    <div className="flex items-start gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                        <ShieldAlert className="size-5" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-500">
                          Zonă periculoasă
                        </p>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          Ștergerea contului este <strong>permanentă și ireversibilă</strong>. Vei pierde
                          tot istoricul de progres, abonamentul Premium și datele salvate.
                        </p>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        setDeletionError('')
                        setDeletionModalOpen(true)
                      }}
                      disabled={deletionLoading || profileSaving}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white text-xs font-black uppercase tracking-widest text-red-600 transition-colors hover:border-red-500 hover:bg-red-500 hover:text-white disabled:opacity-40 sm:w-auto sm:min-w-[280px] dark:border-red-900/50 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                    >
                      <Trash2 className="size-4" />
                      {deletionStep === 'awaiting_code' ? 'Continuă ștergerea contului' : 'Șterge contul'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.section>
          </motion.div>
        </motion.div>
      </main>

      <AccountDeletionModal
        open={deletionModalOpen}
        onClose={() => {
          if (!deletionLoading) setDeletionModalOpen(false)
        }}
        phase={deletionStep}
        deletionCode={deletionCode}
        onDeletionCodeChange={setDeletionCode}
        loading={deletionLoading}
        error={deletionError}
        onRequestCode={handleRequestDeletion}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
      />

      <footer className="container py-20 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 opacity-50 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0">
          <BrandLogo className="size-10" />
          <div className="space-y-1">
            <span className="block font-heading text-xs font-black uppercase tracking-[0.5em] text-slate-900 dark:text-white">
              MathUP · Bacalaureat
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Matematică M1 · M2 · M3
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
