import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <div className="min-h-screen text-slate-900 dark:text-slate-50">
        <Navbar />
        <main className="container py-10">
          <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Crown className="mx-auto mb-4 size-10 text-primary" />
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Variantele rezolvate sunt disponibile pentru Premium</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Profesorul publică variantele rezolvate, iar elevii Premium le pot consulta aici.
            </p>
            <Button onClick={openPremiumModal} className="mt-6 rounded-2xl">
              Activează Premium
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500">
      <Navbar />

      <main className="container py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-3.5" />
              Înapoi la dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <NotebookPen className="size-5" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Variante deja rezolvate</h1>
                <p className="text-sm text-muted-foreground">
                  Materiale rezolvate pentru {activeProfiles.map((key) => getProfileMeta(key).shortLabel).join(' · ')}.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error ? <AlertMessage message={error} className="mb-6" /> : null}

        {loading ? (
          <div className="flex h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
            <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : groupedVariants.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-lg font-black text-slate-800 dark:text-white">Nu există variante rezolvate publicate încă</p>
            <p className="mt-2 text-sm text-muted-foreground">Revino după ce profesorul publică variante rezolvate pentru programul tău.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedVariants.map((group) => (
              <section
                key={group.profileKey}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-lg font-black text-primary">
                    {group.profile.shortLabel}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">{group.profile.label}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {group.items.length} {group.items.length === 1 ? 'variantă' : 'variante'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.items.map((variant) => (
                    <div
                      key={variant.id}
                      className="platform-surface-hover flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <SolvedVariantDocumentIcon compact />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{variant.file_name}</p>
                          <p className="text-xs text-muted-foreground">{group.profile.label}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleDownloadVariant(variant)}
                        disabled={downloadingVariantId === variant.id}
                        className="rounded-2xl"
                      >
                        {downloadingVariantId === variant.id ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Download className="size-4" />
                        )}
                        Descarcă
                      </Button>
                    </div>
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
