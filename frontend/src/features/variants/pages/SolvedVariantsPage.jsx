import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown, Download, NotebookPen } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Navbar } from '../../../shared/ui/Navbar'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { SolvedVariantDocumentIcon } from '../../../shared/ui/SolvedVariantDocumentIcon'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getSolvedVariantsForProfiles } from '../../../services/solvedVariantService'
import { downloadRemoteFile } from '../../../shared/utils/downloadRemoteFile'
import { getProfileMeta } from '../../lessons/profiles'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

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
      <div className="min-h-screen text-slate-900 dark:text-slate-50 bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <main className="container py-20 relative">
          <div className="absolute inset-0 scholar-grid opacity-[0.02] dark:opacity-[0.04] pointer-events-none" />
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl rounded-[2.5rem] border-2 border-border bg-white p-12 text-center shadow-2xl relative z-10 dark:bg-slate-900"
          >
            <div className="size-20 rounded-2xl bg-primary/5 text-primary flex items-center justify-center mx-auto mb-8 border-2 border-primary/10">
               <Crown className="size-10" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter mb-4">Portal Restricționat</h1>
            <p className="text-sm font-medium text-slate-500 leading-relaxed uppercase tracking-widest opacity-80 mb-10">
              Variantele rezolvate sunt resurse Platinum exclusive. Activează accesul complet pentru a consulta arhiva de soluții.
            </p>
            <Button onClick={openPremiumModal} className="rounded-xl px-12 h-16 bg-primary text-white shadow-xl shadow-primary/20">
              Deblochează Platinum Access
            </Button>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 bg-slate-50 dark:bg-slate-950 pb-32">
      <Navbar />

      <main className="container py-16">
        <div className="mb-14 border-b-2 border-border pb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Portal Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                <NotebookPen className="size-7" />
              </div>
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">Arhivă Rezolvări</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Academic Solutions Registry / Toate Programele
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <AlertMessage message={error} className="mb-10" /> : null}

        {loading ? (
          <div className="flex h-96 items-center justify-center rounded-[2.5rem] border-2 border-border bg-white dark:bg-slate-900">
            <div className="size-16 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
          </div>
        ) : groupedVariants.length === 0 ? (
          <div className="rounded-[2.5rem] border-2 border-dashed border-border bg-white p-20 text-center dark:bg-slate-900/50">
            <p className="text-2xl font-black uppercase tracking-tighter mb-2">Arhivă goală</p>
            <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Revino după ce profesorul publică variante rezolvate pentru programul tău.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedVariants.map((group) => (
              <section
                key={group.profileKey}
                className="space-y-6"
              >
                <div className="flex items-center gap-4 px-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-black text-xs">
                    {group.profile.shortLabel}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{group.profile.label}</h2>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {group.items.length} Documente
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.items.map((variant) => (
                    <motion.div
                      key={variant.id}
                      className="platform-surface-hover flex items-center justify-between gap-6 rounded-2xl border-2 border-border bg-white p-6 dark:bg-slate-900 shadow-sm hover:shadow-xl"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="size-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                           <SolvedVariantDocumentIcon compact />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-tight">{variant.file_name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Arhivă Digitală / PDF</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleDownloadVariant(variant)}
                        disabled={downloadingVariantId === variant.id}
                        className="rounded-xl px-6 h-12 shrink-0"
                      >
                        {downloadingVariantId === variant.id ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Descarcă
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
