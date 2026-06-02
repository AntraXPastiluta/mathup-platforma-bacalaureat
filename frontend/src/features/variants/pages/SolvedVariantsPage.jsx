import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown, Download, FileText, Lock, NotebookPen, Sparkles } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getSolvedVariantsForProfiles } from '../../../services/solvedVariantService'
import { downloadRemoteFile } from '../../../shared/utils/downloadRemoteFile'
import { getProfileMeta } from '../../lessons/profiles'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

// Serif de manuscris pentru accentele editoriale — aceeași voce „document tipărit”
// folosită pe Dashboard/Admin, fără fonturi externe (CSP-safe).
const SERIF =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const padIndex = (value) => String(value + 1).padStart(2, '0')

export function SolvedVariantsPage() {
  const navigate = useNavigate()
  const { user, isPremium, openPremiumModal } = useAuth()
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingVariantId, setDownloadingVariantId] = useState(null)

  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )

  useEffect(() => {
    let mounted = true

    async function loadVariants() {
      if (!user?.id || !isPremium) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const data = await getSolvedVariantsForProfiles(activeProfiles)
        if (!mounted) return
        setVariants(data)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadVariants()
    return () => {
      mounted = false
    }
  }, [user?.id, activeProfiles, isPremium])

  const groupedVariants = useMemo(() => {
    return activeProfiles
      .map((profileKey) => ({
        profileKey,
        profile: getProfileMeta(profileKey),
        items: variants
          .filter((variant) => variant.profile === profileKey)
          .sort((left, right) => String(left.file_name).localeCompare(String(right.file_name), 'ro')),
      }))
      .filter((group) => group.items.length > 0)
  }, [variants, activeProfiles])

  const totalDocuments = useMemo(
    () => groupedVariants.reduce((sum, group) => sum + group.items.length, 0),
    [groupedVariants],
  )

  const handleDownloadVariant = async (variant) => {
    setDownloadingVariantId(variant.id)
    setError('')
    try {
      await downloadRemoteFile(variant.file_url, variant.file_name)
    } catch (downloadError) {
      setError(toUserFacingError(downloadError, USER_MESSAGES.download))
    } finally {
      setDownloadingVariantId(null)
    }
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen text-slate-900 dark:text-slate-50 math-notebook-bg">
        <Navbar />
        <main className="container relative py-24">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-2xl overflow-hidden rounded-[2.5rem] border-2 border-amber-300/60 bg-white/95 p-12 text-center shadow-2xl backdrop-blur-sm dark:border-amber-500/25 dark:bg-slate-900/90"
          >
            <div className="solved-foil" aria-hidden />
            {/* Cotor aurit — semnătura unui dosar sigilat. */}
            <div className="absolute inset-y-0 left-0 w-2 solved-seal" aria-hidden />

            <div className="relative">
              <div className="relative mx-auto mb-9 flex size-24 items-center justify-center rounded-3xl solved-seal text-white">
                <Crown className="size-11 drop-shadow" />
                <span className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-amber-300 shadow-lg dark:border-slate-900 dark:bg-amber-400 dark:text-slate-900">
                  <Lock className="size-4" />
                </span>
              </div>

              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <Sparkles className="size-3.5" />
                Resursă Platinum
              </span>

              <h1
                className="mb-5 text-5xl font-black tracking-tight text-slate-900 dark:text-white"
                style={{ fontFamily: SERIF }}
              >
                Dosar sigilat
              </h1>
              <p className="mx-auto mb-10 max-w-md text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Arhiva de variante rezolvate este o resursă <span className="font-bold text-slate-700 dark:text-slate-200">Platinum exclusivă</span>. Activează accesul complet pentru a consulta registrul de soluții pas-cu-pas al programelor tale.
              </p>

              <Button
                onClick={openPremiumModal}
                motionless
                className="h-16 rounded-2xl border-amber-500 bg-gradient-to-br from-amber-400 to-amber-600 px-12 text-white shadow-xl shadow-amber-500/30 hover:from-amber-500 hover:to-amber-700 hover:text-white"
              >
                <Crown className="size-5" />
                Deblochează Platinum Access
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32 text-slate-900 transition-colors duration-500 math-notebook-bg dark:text-slate-50">
      <Navbar />

      <main className="container py-16">
        {/* ── Masthead editorial ── */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="group mb-8 inline-flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            Înapoi la Dashboard
          </button>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span className="mb-4 flex items-center gap-2.5">
                <span className="h-px w-8 bg-primary" aria-hidden />
                <span className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  Registrul Soluțiilor Academice
                </span>
              </span>
              <h1
                className="text-6xl font-black leading-[0.92] tracking-tight text-slate-900 dark:text-white md:text-7xl"
                style={{ fontFamily: SERIF }}
              >
                Arhivă<br />
                <span className="text-primary">rezolvări</span>
              </h1>
              <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Variante de Bacalaureat rezolvate pas-cu-pas, arhivate pe programul tău. Consultă-le sau descarcă-le ca PDF.
              </p>
            </div>

            {/* Stat-block tabular — „inventarul” registrului */}
            <div className="flex shrink-0 items-stretch gap-3">
              <div className="flex flex-col justify-between rounded-2xl border-2 border-border bg-white/70 px-6 py-5 backdrop-blur-sm dark:bg-slate-900/60">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Documente</span>
                <span className="solved-index mt-2 text-5xl font-black leading-none tracking-tight text-slate-900 dark:text-white">
                  {String(totalDocuments).padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border-2 border-border bg-white/70 px-6 py-5 backdrop-blur-sm dark:bg-slate-900/60">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Programe</span>
                <span className="solved-index mt-2 text-5xl font-black leading-none tracking-tight text-primary">
                  {String(groupedVariants.length).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
          <div className="solved-rule mt-10" aria-hidden />
        </motion.header>

        {error ? <AlertMessage message={error} className="mb-10" /> : null}

        {loading ? (
          <div className="flex h-96 items-center justify-center rounded-[2.5rem] border-2 border-border bg-white/70 backdrop-blur-sm dark:bg-slate-900/60">
            <div className="flex flex-col items-center gap-5">
              <div className="size-14 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Se deschide arhiva…
              </span>
            </div>
          </div>
        ) : groupedVariants.length === 0 ? (
          <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-dashed border-border bg-white/70 p-20 text-center backdrop-blur-sm dark:bg-slate-900/50">
            <div className="mx-auto mb-7 flex size-20 items-center justify-center rounded-3xl border-2 border-border bg-slate-50 text-slate-300 dark:bg-slate-800/60 dark:text-slate-600">
              <NotebookPen className="size-9" />
            </div>
            <p
              className="mb-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white"
              style={{ fontFamily: SERIF }}
            >
              Arhivă goală
            </p>
            <p className="mx-auto max-w-md text-sm font-medium text-slate-400">
              Revino după ce profesorul publică variante rezolvate pentru programul tău.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {groupedVariants.map((group, groupIndex) => (
              <motion.section
                key={group.profileKey}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 * groupIndex, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {/* Divizor de registru pe program */}
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900">
                    {group.profile.shortLabel}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      {group.profile.label}
                    </h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {group.profile.description}
                    </p>
                  </div>
                  <div className="solved-rule h-px flex-1" aria-hidden />
                  <span className="solved-index shrink-0 rounded-full border-2 border-border bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    {String(group.items.length).padStart(2, '0')} doc.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {group.items.map((variant, itemIndex) => {
                    const isDownloading = downloadingVariantId === variant.id
                    return (
                      <motion.article
                        key={variant.id}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.4, delay: 0.04 * itemIndex }}
                        className="solved-dossier flex items-center justify-between gap-5 overflow-hidden rounded-2xl border-2 border-border bg-white py-5 pl-7 pr-5 shadow-sm dark:bg-slate-900"
                      >
                        <span className="solved-dossier__spine" aria-hidden />

                        <div className="flex min-w-0 items-center gap-4">
                          {/* Etichetă de inventar */}
                          <div className="flex shrink-0 flex-col items-center justify-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-600">
                              Nr.
                            </span>
                            <span className="solved-index text-lg font-black leading-none tracking-tight text-slate-400 dark:text-slate-500">
                              {padIndex(itemIndex)}
                            </span>
                          </div>

                          <div className="h-12 w-px bg-border" aria-hidden />

                          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
                            <FileText className="size-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                              {variant.file_name}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                              PDF · Arhivă digitală
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleDownloadVariant(variant)}
                          disabled={isDownloading}
                          className="h-12 shrink-0 rounded-xl px-6"
                        >
                          {isDownloading ? (
                            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          ) : (
                            <Download className="size-4" />
                          )}
                          <span className="hidden sm:inline">Descarcă</span>
                        </Button>
                      </motion.article>
                    )
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
