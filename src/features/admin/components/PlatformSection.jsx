import { useEffect, useState } from 'react'
import { Hammer, Mail, Power } from 'lucide-react'
import { useMaintenanceMode } from '../../../app/providers/MaintenanceModeProvider'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { isPrimaryAdminEmail } from '../../../services/curriculumAdminService'
import {
  fetchMaintenanceMode,
  MAINTENANCE_CONTACT_EMAIL,
  setMaintenanceMode,
} from '../../../services/platformSettingsService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

export function PlatformSection() {
  const { refresh } = useMaintenanceMode()
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canToggle = isPrimaryAdminEmail(user?.email)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const value = await fetchMaintenanceMode()
        if (!mounted) return
        setEnabled(value)
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
      setError('Doar administratorul principal poate modifica modul de mentenanță.')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Hammer className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Platformă</h2>
          <p className="text-sm text-muted-foreground">
            Activează sau dezactivează modul de mentenanță pentru toți utilizatorii (producție și local, via Supabase).
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
                  Doar administratorul principal poate folosi acest comutator.
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
                <code className="text-primary">primary_admin_email</code>) același email ca{' '}
                <code className="text-primary">VITE_PRIMARY_ADMIN_EMAIL</code>.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
