import { useEffect, useState } from 'react'
import { Crown, Trash2 } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import {
  getPremiumUsersForAdmin,
  revokePremiumEntitlement,
} from '../../../services/adminPremiumService'
import { isPrimaryAdminEmail } from '../../../services/curriculumAdminService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

export function AdminPremiumUsersSection() {
  const { user } = useAuth()
  const [premiumUsers, setPremiumUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canRevokePremium = isPrimaryAdminEmail(user?.email)

  useEffect(() => {
    let mounted = true

    async function loadPremiumUsers() {
      setLoading(true)
      setError('')
      try {
        const rows = await getPremiumUsersForAdmin()
        if (!mounted) return
        setPremiumUsers(rows)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPremiumUsers()
    return () => {
      mounted = false
    }
  }, [])

  const handleRevokePremium = async (premiumRow) => {
    if (!canRevokePremium) {
      setError('Doar administratorul principal poate elimina statusul Premium.')
      return
    }

    const confirmed = window.confirm(
      `Elimini accesul Premium pentru ${premiumRow.email}? Utilizatorul își pierde beneficiile imediat în aplicație.`
    )
    if (!confirmed) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await revokePremiumEntitlement(premiumRow.user_id)
      setPremiumUsers((current) => current.filter((row) => row.user_id !== premiumRow.user_id))
      setSuccess(`Accesul Premium pentru ${premiumRow.email} a fost eliminat.`)
    } catch (saveError) {
      setError(toUserFacingError(saveError, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <Crown className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Utilizatori Premium</h2>
          <p className="text-sm text-muted-foreground">
            Abonamente Premium active înregistrate în platformă. Administratorii au acces Premium fără o înregistrare separată aici.
            {canRevokePremium
              ? ' Doar administratorul principal poate elimina statusul Premium.'
              : ' Doar administratorul principal poate elimina accesul Premium din această listă.'}
          </p>
        </div>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
      {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}

      <div className="rounded-3xl border border-slate-200/50 bg-white p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-white/2">
            <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : premiumUsers.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center dark:border-white/5 dark:bg-white/2">
            <p className="text-sm font-medium italic text-slate-500">Nu există utilizatori Premium activi înregistrați.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-white/5 dark:text-slate-500">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Activ până la</th>
                  <th className="px-6 py-4">Status</th>
                  {canRevokePremium ? <th className="px-6 py-4 text-right">Acțiuni</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {premiumUsers.map((premiumRow) => {
                  const isCurrentUser = user?.email?.toLowerCase() === premiumRow.email?.toLowerCase()
                  return (
                    <tr key={premiumRow.user_id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg border border-amber-500/10 bg-amber-500/10 text-amber-500">
                            <Crown className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{premiumRow.email}</p>
                            {isCurrentUser ? (
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Contul tău</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {premiumRow.expires_at
                          ? new Date(premiumRow.expires_at).toLocaleDateString('ro-RO', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-6 py-5">
                        {premiumRow.cancel_at_period_end ? (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Se încheie la expirare
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Activ
                          </span>
                        )}
                      </td>
                      {canRevokePremium ? (
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRevokePremium(premiumRow)}
                            disabled={saving}
                            className="rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive transition-all hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
