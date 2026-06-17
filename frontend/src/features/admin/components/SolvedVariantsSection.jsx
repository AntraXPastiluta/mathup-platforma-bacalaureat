import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, FileText, NotebookPen, Trash2, UploadCloud } from 'lucide-react'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import {
  addProgramSolvedVariant,
  deleteProgramSolvedVariant,
  getProgramSolvedVariants,
  uploadFileToStorage,
} from '../../../services/adminService'
import { PROFILES, getProfileMeta } from '../../lessons/profiles'
import { SignedFileLink } from '../../../shared/ui/SignedFileLink'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

export function SolvedVariantsSection() {
  const [selectedProfile, setSelectedProfile] = useState('mate_info')
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedProgram = useMemo(
    () => PROFILES.find((profile) => profile.key === selectedProfile) ?? PROFILES[0],
    [selectedProfile],
  )

  useEffect(() => {
    let mounted = true

    async function loadVariants() {
      setLoading(true)
      setError('')
      try {
        const data = await getProgramSolvedVariants(selectedProfile)
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
  }, [selectedProfile])

  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const uploaded = await uploadFileToStorage(file)
      const savedVariant = await addProgramSolvedVariant({
        profile: selectedProfile,
        file_name: uploaded.name,
        file_url: uploaded.url,
        file_type: uploaded.type,
      })
      setVariants((current) => [savedVariant, ...current])
      setSuccess('Varianta rezolvată a fost încărcată!')
    } catch (uploadError) {
      setError(toUserFacingError(uploadError, USER_MESSAGES.upload))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleDelete = async (id) => {
    setError('')
    setSuccess('')
    try {
      await deleteProgramSolvedVariant(id)
      setVariants((current) => current.filter((variant) => variant.id !== id))
      setSuccess('Varianta rezolvată a fost ștearsă.')
    } catch (deleteError) {
      setError(toUserFacingError(deleteError, USER_MESSAGES.delete))
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Antet editorial ── */}
      <div className="flex flex-col gap-4 px-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
            <NotebookPen className="size-5" />
          </div>
          <div>
            <span className="mb-1 flex items-center gap-2">
              <span className="h-px w-6 bg-primary" aria-hidden />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                Registru de soluții
              </span>
            </span>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              Variante rezolvate
            </h2>
          </div>
        </div>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
      {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}

      <div className="rounded-3xl border border-slate-300/60 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
        {/* Selector de program + context */}
        <div className="mb-8 grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="program-variant-profile"
              className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"
            >
              Program destinatar
            </label>
            <select
              id="program-variant-profile"
              value={selectedProfile}
              onChange={(event) => setSelectedProfile(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold text-slate-800 scheme-light transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:scheme-dark"
            >
              {PROFILES.map((profile) => (
                <option
                  key={profile.key}
                  value={profile.key}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                >
                  {profile.label} · {profile.shortLabel}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
              {selectedProgram.shortLabel}
            </span>
            <p>
              Documentele apar pentru elevii <span className="font-bold text-slate-800 dark:text-white">Premium</span> din programul{' '}
              <span className="font-bold text-slate-800 dark:text-white">{selectedProgram.label}</span>, în dashboard și în pagina „Variante rezolvate”.
            </p>
          </div>
        </div>

        {/* ── Zonă de depunere ── */}
        <div className="group relative mb-10">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/15 to-indigo-500/15 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50/60 p-10 text-center transition-all duration-300 group-hover:border-primary/50 group-hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:group-hover:border-primary/40 dark:group-hover:bg-white/[0.04]">
            <input
              type="file"
              id="program-variant-upload"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label htmlFor="program-variant-upload" className="flex cursor-pointer flex-col items-center gap-6">
              <div className="relative flex size-20 items-center justify-center rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/12 to-indigo-500/12 text-primary shadow-lg shadow-primary/10 transition-transform duration-300 group-hover:-translate-y-1">
                {uploading ? (
                  <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                ) : (
                  <UploadCloud className="size-9" />
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                  {uploading ? 'Se depune în registru…' : 'Încarcă variantă rezolvată'}
                </h4>
                <p className="mx-auto max-w-xl text-sm text-slate-500">
                  PDF, documente sau imagini cu rezolvări complete pentru{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{getProfileMeta(selectedProfile).label}</span>.
                </p>
              </div>
              {!uploading ? (
                <span className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  Selectează fișier
                </span>
              ) : null}
            </label>
          </div>
        </div>

        {/* ── Registrul ── */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Registru · {getProfileMeta(selectedProfile).label}
            </h3>
            <span className="solved-index rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-black tracking-widest text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {String(variants.length).padStart(2, '0')}
            </span>
            <div className="solved-rule h-px flex-1" aria-hidden />
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : variants.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-600">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-medium italic text-slate-500">
                Nu există variante rezolvate pentru acest program.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:border-white/5 dark:bg-white/5 dark:text-slate-500">
                  <tr>
                    <th className="w-14 px-5 py-4 text-center">Nr.</th>
                    <th className="px-4 py-4">Nume fișier</th>
                    <th className="px-4 py-4">Tip</th>
                    <th className="px-6 py-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {variants.map((variant, index) => {
                    return (
                      <tr
                        key={variant.id}
                        className="group transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-4 text-center">
                          <span className="solved-index text-sm font-black tracking-tight text-slate-300 dark:text-slate-600">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/5 text-primary">
                              <FileText className="size-4" />
                            </div>
                            <span className="max-w-[280px] truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                              {variant.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                            {variant.file_type?.split('/')[1] || 'DOC'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <SignedFileLink
                              value={variant.file_url}
                              title="Deschide într-un tab nou"
                              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-400 shadow-sm transition-all hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:hover:text-white"
                            >
                              <ExternalLink className="size-4" />
                            </SignedFileLink>
                            <button
                              type="button"
                              onClick={() => handleDelete(variant.id)}
                              title="Șterge din registru"
                              className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive transition-all hover:bg-destructive hover:text-white"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
