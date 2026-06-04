/**
 * Secțiunea „Rapoarte" din consola de administrare. Afișează metrici agregate
 * (înscrieri, achiziții Premium, lecții finalizate, exporturi GDPR) sub formă de
 * carduri sumar, grafice (Recharts) și tabele de defalcare, cu selector de perioadă
 * și buton de tipărire / salvare ca PDF (window.print() + CSS de print).
 */
import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Download,
  GraduationCap,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Button } from '../../../shared/ui/Button'
import { Select } from '../../../shared/ui/Select'
import {
  buildRange,
  formatRON,
  getAdminReports,
  REPORT_PERIODS,
} from '../../../services/adminReportsService'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { StatCard } from './reports/StatCard'
import { ReportChart } from './reports/ReportChart'
import { ReportTable } from './reports/ReportTable'

const STATUS_LABELS = {
  active: 'Activ',
  expired: 'Expirat',
  refunded: 'Rambursat',
}

const PROFILE_LABELS = {
  mate_info: 'Matematică-Informatică',
  tehnologic: 'Tehnologic',
  stiintele_naturii: 'Științele naturii',
  pedagogic: 'Pedagogic',
}

export function ReportsSection() {
  const [period, setPeriod] = useState('12m')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const range = buildRange(period)
        const data = await getAdminReports(range)
        if (mounted) setReport(data)
      } catch (loadError) {
        if (mounted) setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [period])

  const summary = report?.summary ?? {}
  const range = summary.range ?? {}
  const series = report?.series ?? []
  const breakdown = report?.breakdown ?? {}

  const periodLabel = useMemo(
    () => REPORT_PERIODS.find((option) => option.value === period)?.label ?? '',
    [period],
  )
  const generatedAt = useMemo(() => new Date().toLocaleDateString('ro-RO'), [])

  return (
    <div className="space-y-6 report-print-root">
      {/* ── Antet secțiune ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BarChart3 className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Rapoarte</h2>
          <p className="text-sm text-muted-foreground">
            Statistici despre înscrieri, abonamente Premium, lecții finalizate și exporturi de date GDPR.
          </p>
        </div>
      </div>

      {/* ── Controale (nu se tipăresc) ─────────────────────────── */}
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:w-72">
          <Select value={period} onChange={setPeriod} options={REPORT_PERIODS} />
        </div>
        <Button
          type="button"
          variant="primary"
          motionless
          onClick={() => window.print()}
          disabled={loading}
          className="rounded-2xl h-11 px-6 font-black uppercase tracking-widest text-xs"
        >
          <Printer className="size-4" />
          Printează / Salvează PDF
        </Button>
      </div>

      {error ? <AlertMessage message={error} variant="error" onClose={() => setError('')} /> : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 dark:border-white/5 dark:bg-white/2">
          <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <>
          {/* Antet vizibil doar la tipărire */}
          <div className="print-only mb-6 border-b border-slate-300 pb-4">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">MathUP · Raport platformă</h1>
            <p className="mt-1 text-sm text-slate-600">
              {periodLabel} · Generat: {generatedAt}
            </p>
          </div>

          {/* ── Carduri sumar ───────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Utilizatori înregistrați"
              value={summary.total_users}
              hint={range.registrations != null ? `+${range.registrations} în perioadă` : undefined}
              icon={Users}
              accent="primary"
            />
            <StatCard
              label="Achiziții Premium"
              value={summary.total_premium_purchases}
              hint={range.premium_purchases != null ? `+${range.premium_purchases} în perioadă` : undefined}
              icon={Sparkles}
              accent="emerald"
            />
            <StatCard
              label="Premium activ acum"
              value={summary.active_premium_now}
              hint="Abonamente valide"
              icon={ShieldCheck}
              accent="emerald"
            />
            <StatCard
              label="Lecții finalizate"
              value={summary.total_lessons_completed}
              hint={range.lessons_completed != null ? `+${range.lessons_completed} în perioadă` : undefined}
              icon={GraduationCap}
              accent="amber"
            />
            <StatCard
              label="Exporturi GDPR"
              value={summary.total_gdpr_exports}
              hint={range.gdpr_exports != null ? `+${range.gdpr_exports} în perioadă` : undefined}
              icon={Download}
              accent="sky"
            />
            <StatCard
              label="Venit Premium (activ)"
              value={formatRON(summary.premium_revenue_total)}
              hint="Doar abonamente active"
              icon={Sparkles}
              accent="violet"
            />
          </div>

          {/* ── Grafice ──────────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportChart
              title="Înscrieri în timp"
              subtitle={periodLabel}
              data={series}
              dataKey="registrations"
              name="Înscrieri"
              color="#6366f1"
              type="area"
            />
            <ReportChart
              title="Achiziții Premium"
              subtitle={periodLabel}
              data={series}
              dataKey="premium_purchases"
              name="Achiziții Premium"
              color="#10b981"
              type="bar"
            />
            <ReportChart
              title="Lecții finalizate"
              subtitle={periodLabel}
              data={series}
              dataKey="lessons_completed"
              name="Lecții finalizate"
              color="#f59e0b"
              type="line"
            />
            <ReportChart
              title="Exporturi de date (GDPR)"
              subtitle={periodLabel}
              data={series}
              dataKey="gdpr_exports"
              name="Exporturi GDPR"
              color="#0ea5e9"
              type="bar"
            />
          </div>

          {/* ── Tabele de defalcare ──────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportTable
              title="Premium după status"
              columns={[
                { key: 'status', label: 'Status', render: (value) => STATUS_LABELS[value] ?? value },
                { key: 'count', label: 'Număr' },
              ]}
              rows={breakdown.premium_by_status}
            />
            <ReportTable
              title="Lecții finalizate după profil"
              columns={[
                { key: 'profile', label: 'Profil', render: (value) => PROFILE_LABELS[value] ?? value },
                { key: 'count', label: 'Număr' },
              ]}
              rows={breakdown.completions_by_profile}
              emptyLabel="Nicio lecție finalizată încă."
            />
            <ReportTable
              title="Top utilizatori după exporturi GDPR"
              columns={[
                { key: 'email', label: 'Email' },
                { key: 'count', label: 'Exporturi' },
              ]}
              rows={breakdown.top_gdpr_users}
              emptyLabel="Niciun export de date încă."
            />
          </div>

          {/* Notă metodologică */}
          <p className="px-2 text-xs leading-relaxed text-muted-foreground">
            Notă: o lecție este considerată „finalizată" când progresul utilizatorului este marcat ca
            finalizat; perioada este dată de ultima actualizare a progresului. „Venit Premium" însumează
            doar abonamentele active (fără cele expirate sau rambursate). Datele sunt grupate pe fusul orar
            al României.
          </p>
        </>
      )}
    </div>
  )
}
