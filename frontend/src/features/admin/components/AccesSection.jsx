import { useEffect, useState } from 'react'
import { Shield, Trash2, UserPlus } from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { Button } from '../../../shared/ui/Button'
import { Select } from '../../../shared/ui/Select'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import {
  addCurriculumAdminEmail,
  getCurriculumAdminEmails,
  isEmailPrimaryAdmin,
  normalizeAdminEmail,
  removeCurriculumAdminEmail,
  updateCurriculumAdminRole,
} from '../../../services/curriculumAdminService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'

// Rolurile pe care le poate avea un admin și ce înseamnă pentru acces.
// `short` = eticheta compactă folosită în comutatorul din tabel.
const ROLE_OPTIONS = [
  { value: 'profesor', label: 'Profesor', short: 'Profesor' },
  { value: 'technical', label: 'Administrator tehnic', short: 'Tehnic' },
]

function roleLabel(role) {
  return role === 'technical' ? 'Administrator tehnic' : 'Profesor'
}

export function AccesSection() {
  const { user, isPrimaryAdmin, primaryAdminEmail, refreshAdminAccess } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('profesor')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadAdmins() {
      setLoading(true)
      setError('')
      try {
        const rows = await getCurriculumAdminEmails()
        if (!mounted) return
        setAdmins(rows)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadAdmins()
    return () => {
      mounted = false
    }
  }, [])

  const handleAddAdmin = async (event) => {
    event.preventDefault()
    const normalized = normalizeAdminEmail(email)
    if (!normalized) {
      setError('Introdu o adresă de email validă.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const created = await addCurriculumAdminEmail(normalized, role)
      setAdmins((current) => {
        if (current.some((row) => row.email === created.email)) return current
        return [...current, created].sort((left, right) => left.email.localeCompare(right.email, 'ro'))
      })
      setEmail('')
      setRole('profesor')
      setSuccess(`Administratorul ${created.email} (${roleLabel(created.role)}) a fost adăugat.`)
      await refreshAdminAccess()
    } catch (saveError) {
      setError(toUserFacingError(saveError, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  const canManageAdmins = isPrimaryAdmin

  const handleChangeRole = async (adminRow, nextRole) => {
    if (!canManageAdmins || nextRole === adminRow.role) return

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateCurriculumAdminRole(adminRow.id, nextRole)
      setAdmins((current) =>
        current.map((row) => (row.id === adminRow.id ? { ...row, role: updated.role } : row)),
      )
      setSuccess(`Rolul lui ${adminRow.email} a fost schimbat în ${roleLabel(updated.role)}.`)
    } catch (updateError) {
      setError(toUserFacingError(updateError, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAdmin = async (adminRow) => {
    if (!canManageAdmins) {
      setError('Doar administratorul principal poate elimina administratori.')
      return
    }

    if (isEmailPrimaryAdmin(adminRow.email, primaryAdminEmail)) {
      setError('Administratorul principal nu poate fi eliminat.')
      return
    }

    if (admins.length <= 1) {
      setError('Trebuie să rămână cel puțin un administrator activ.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await removeCurriculumAdminEmail(adminRow.id, adminRow.email)
      setAdmins((current) => current.filter((row) => row.id !== adminRow.id))
      setSuccess(`Administratorul ${adminRow.email} a fost eliminat.`)
      await refreshAdminAccess()
    } catch (deleteError) {
      setError(toUserFacingError(deleteError, USER_MESSAGES.delete))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Administratori</h2>
          <p className="text-sm text-muted-foreground">
            Conturile cu aceste emailuri pot accesa panoul de administrare și sunt tratate ca Premium.
            <span className="font-semibold text-slate-600 dark:text-slate-300"> Profesorii</span> văd doar Curriculum, Roadmaps și Variante;
            <span className="font-semibold text-slate-600 dark:text-slate-300"> administratorii tehnici</span> au acces complet (inclusiv Rapoarte, Acces și Platformă).
            Doar administratorul principal poate adăuga, elimina sau schimba rolul administratorilor.
          </p>
        </div>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}
      {success ? <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} /> : null}

      <div className="rounded-3xl border border-slate-300/50 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
        {canManageAdmins ? (
        <form onSubmit={handleAddAdmin} className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-[1fr_minmax(11rem,auto)_auto]">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email administrator</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="profesor@exemplu.ro"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 font-bold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rol</label>
            <Select value={role} onChange={setRole} options={ROLE_OPTIONS} className="h-[50px]" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="h-[50px] w-full rounded-2xl md:w-auto">
              <UserPlus className="size-4" />
              Adaugă administrator
            </Button>
          </div>
        </form>
        ) : null}

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/2">
            <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-3xl border border-slate-300 bg-slate-50 p-10 text-center dark:border-white/5 dark:bg-white/2">
            <p className="text-sm font-medium italic text-slate-500">Nu există administratori configurați în baza de date.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:bg-white/5 dark:text-slate-500">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Adăugat</th>
                  {canManageAdmins ? <th className="px-6 py-4 text-right">Acțiuni</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {admins.map((adminRow) => {
                  const isCurrentUser = user?.email?.toLowerCase() === adminRow.email.toLowerCase()
                  const isPrimaryAdminRow = isEmailPrimaryAdmin(adminRow.email, primaryAdminEmail)
                  return (
                    <tr key={adminRow.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary">
                            <Shield className="size-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{adminRow.email}</p>
                            {isPrimaryAdminRow ? (
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Administrator principal</p>
                            ) : isCurrentUser ? (
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Contul tău</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {isPrimaryAdminRow ? (
                          <span className="inline-flex rounded-lg bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            {roleLabel(adminRow.role)}
                          </span>
                        ) : canManageAdmins ? (
                          <div className="inline-flex items-center rounded-xl border border-slate-300 p-0.5 dark:border-white/10">
                            {ROLE_OPTIONS.map((opt) => {
                              const active = adminRow.role === opt.value
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleChangeRole(adminRow, opt.value)}
                                  disabled={saving || active}
                                  aria-pressed={active}
                                  className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors disabled:cursor-default ${
                                    active
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'text-slate-500 hover:text-primary disabled:opacity-50 dark:text-slate-400'
                                  }`}
                                >
                                  {opt.short}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                            {roleLabel(adminRow.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">
                        {new Date(adminRow.created_at).toLocaleDateString('ro-RO')}
                      </td>
                      {canManageAdmins ? (
                        <td className="px-6 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(adminRow)}
                            disabled={saving || isPrimaryAdminRow}
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
