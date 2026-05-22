import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, NotebookPen, Trash2 } from 'lucide-react'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { SolvedVariantDocumentIcon } from '../../../shared/ui/SolvedVariantDocumentIcon'
import {
  addProgramSolvedVariant,
  deleteProgramSolvedVariant,
  getProgramSolvedVariants,
  uploadFileToStorage,
} from '../../../services/adminService'
import { PROFILES, getProfileMeta } from '../../lessons/profiles'
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
      <div className="flex flex-col gap-4 px-2 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <NotebookPen className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Variante rezolvate</h2>
            <p className="text-sm text-muted-foreground">
              Pagină separată de curriculum. Publică documente rezolvate pe program, fără legătură cu o lecție.
            </p>
          </div>
        </div>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
      {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}

      <div className="rounded-3xl border border-slate-300/50 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Program</label>
            <select
              value={selectedProfile}
              onChange={(event) => setSelectedProfile(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold text-slate-800 scheme-light dark:border-white/10 dark:bg-white/5 dark:text-white dark:scheme-dark"
            >
              {PROFILES.map((profile) => (
                <option
                  key={profile.key}
                  value={profile.key}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                >
                  {profile.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-slate-600 dark:text-slate-300 md:col-span-2">
            Încarci pentru <span className="font-bold text-slate-800 dark:text-white">{selectedProgram.label}</span>.
            Elevii Premium din acest program le vor vedea în dashboard și în pagina Variante deja rezolvate.
          </div>
        </div>

        <div className="relative group mb-10">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary/10 to-indigo-600/10 opacity-20 blur transition-opacity group-hover:opacity-40" />
          <div className="relative rounded-[2rem] border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center shadow-inner transition-all group-hover:bg-white dark:border-white/10 dark:bg-white/2 dark:group-hover:bg-white/5">
            <input
              type="file"
              id="program-variant-upload"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label htmlFor="program-variant-upload" className="flex cursor-pointer flex-col items-center gap-6">
              <div className="flex size-20 items-center justify-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-primary/10 to-indigo-600/10 text-primary shadow-lg">
                {uploading ? (
                  <div className="size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                ) : (
                  <NotebookPen className="size-10" />
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                  {uploading ? 'Se încarcă varianta...' : 'Încarcă variantă rezolvată'}
                </h4>
                <p className="mx-auto max-w-xl text-sm text-slate-500">
                  PDF, documente sau imagini cu rezolvări complete pentru {getProfileMeta(selectedProfile).shortLabel}.
                </p>
              </div>
              {!uploading ? (
                <div className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 shadow-sm transition-all group-hover:bg-primary group-hover:text-white dark:border-white/5 dark:bg-white/5">
                  Selectează fișier
                </div>
              ) : null}
            </label>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="px-2 text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Variante pentru {getProfileMeta(selectedProfile).shortLabel} ({variants.length})
          </h3>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/2">
              <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          ) : variants.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 bg-slate-50 p-12 text-center shadow-sm dark:border-white/5 dark:bg-white/2">
              <p className="text-sm font-medium italic text-slate-500">Nu există variante rezolvate pentru acest program.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-white/5 dark:text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Nume fișier</th>
                    <th className="px-6 py-4">Tip</th>
                    <th className="px-6 py-4 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {variants.map((variant) => (
                    <tr key={variant.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <SolvedVariantDocumentIcon compact />
                          <span className="max-w-[280px] truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                            {variant.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/5">
                          {variant.file_type?.split('/')[1] || 'DOC'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={variant.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-400 shadow-sm transition-all hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <ExternalLink className="size-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDelete(variant.id)}
                            className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive transition-all hover:bg-destructive/20"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
