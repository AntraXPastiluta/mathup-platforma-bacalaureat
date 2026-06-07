import { useEffect, useState } from 'react'
import { Calendar, Hammer, Mail, Power } from 'lucide-react'
import { useMaintenanceMode } from '../../../app/providers/MaintenanceModeProvider'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import {
  fetchBacExamDate,
  fetchMaintenanceMode,
  MAINTENANCE_CONTACT_EMAIL,
  setBacExamDate,
  setMaintenanceMode,
} from '../../../services/platformSettingsService'
import { formatBacExamDateInput } from '../../../shared/utils/bacExamDate'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

export function PlatformSection() {
  const { refresh } = useMaintenanceMode()
  const { isTechnicalAdmin } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [examDateInput, setExamDateInput] = useState('')
  const [savingExamDate, setSavingExamDate] = useState(false)

  const canToggle = isTechnicalAdmin

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [value, examDate] = await Promise.all([
          fetchMaintenanceMode(),
          fetchBacExamDate(),
        ])
        if (!mounted) return
        setEnabled(value)
        setExamDateInput(formatBacExamDateInput(examDate))
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleToggle = async () => {
    if (!canToggle) {
      setError('Doar administratorii tehnici pot modifica modul de mentenanță.')
      return
    }

    const next = !enabled

    if (next) {
      const confirmed = window.confirm(
        'Activezi modul de mentenanță?\n\nToți utilizatorii vor vedea pagina de mentenanță. Poți reveni aici (/admin → Platformă) pentru a dezactiva.',
      )
      if (!confirmed) return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await setMaintenanceMode(next)
      setEnabled(next)
      await refresh()
      if (!next) {
        window.location.replace('/')
        return
      }
      setSuccess('Modul de mentenanță este activ. Platforma publică afișează pagina de mentenanță.')
    } catch (toggleError) {
      setError(toUserFacingError(toggleError, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveExamDate = async (event) => {
    event.preventDefault()
    if (!canToggle) {
      setError('Doar administratorii tehnici pot modifica data examenului BAC.')
      return
    }
    if (!examDateInput) {
      setError('Alege o dată validă pentru examen.')
      return
    }

    setSavingExamDate(true)
    setError('')
    setSuccess('')
    try {
      const saved = await setBacExamDate(examDateInput)
      setExamDateInput(formatBacExamDateInput(saved))
      setSuccess('Data examenului BAC a fost actualizată. Elevii o vor vedea în dashboard și calendar.')
    } catch (saveError) {
      setError(toUserFacingError(saveError, USER_MESSAGES.save))
    } finally {
      setSavingExamDate(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Hammer className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Platformă</h2>
          <p className="text-sm text-muted-foreground">
            Mentenanță, data examenului BAC la matematică și alte setări globale ale platformei.
          </p>
        </div>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
      {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}

      <div className="rounded-3xl border border-slate-300/50 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none space-y-6">
        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/2">
            <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status curent</p>
                <p className="mt-1 text-lg font-black text-slate-800 dark:text-white">
                  {enabled ? 'Mentenanță activă' : 'Platformă online'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {enabled
                    ? 'Utilizatorii văd pagina de mentenanță. Adminul poate accesa /admin pentru a dezactiva.'
                    : 'Utilizatorii accesează platforma normal.'}
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
                  enabled
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <Power className="size-3.5" />
                {enabled ? 'Mentenanță' : 'Activ'}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="primary"
                disabled={!canToggle || saving}
                onClick={handleToggle}
                className="rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs"
              >
                <Hammer className="size-4" />
                {enabled ? 'Dezactivează mentenanța' : 'Activează mentenanța'}
              </Button>
              {!canToggle ? (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Doar administratorii tehnici pot folosi acest comutator.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 flex gap-3 text-left">
              <Mail className="size-5 shrink-0 text-primary" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                În mentenanță, utilizatorii văd contactul:{' '}
                <a
                  href={`mailto:${MAINTENANCE_CONTACT_EMAIL}`}
                  className="font-bold text-primary hover:underline"
                >
                  {MAINTENANCE_CONTACT_EMAIL}
                </a>
              </p>
            </div>

            {canToggle ? (
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                La prima utilizare în producție, setează în Supabase (tabel{' '}
                <code className="text-primary">platform_settings</code>, coloana{' '}
                <code className="text-primary">primary_admin_email</code>).
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="rounded-3xl border border-slate-300/50 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
            <Calendar className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
              Examen BAC · Matematică
            </h3>
            <p className="text-sm text-muted-foreground">
              Data afișată în dashboard (countdown) și marcată în calendarul elevilor.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/2">
            <div className="size-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : (
          <form onSubmit={handleSaveExamDate} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-6 py-5">
              <label
                htmlFor="bac-exam-date"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
              >
                Data examenului
              </label>
              <input
                id="bac-exam-date"
                type="date"
                value={examDateInput}
                onChange={(event) => setExamDateInput(event.target.value)}
                disabled={!canToggle || savingExamDate}
                className="mt-2 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />
              {!canToggle ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Doar administratorii tehnici pot modifica această dată.
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Implicit: 30 iunie (anul curent sau următor, dacă data a trecut).
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={!canToggle || savingExamDate || !examDateInput}
              className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-xs"
            >
              <Calendar className="size-4" />
              {savingExamDate ? 'Se salvează...' : 'Salvează data examenului'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
