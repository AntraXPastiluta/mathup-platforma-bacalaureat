/**
 * Wrapper subțire peste Recharts pentru graficele din panoul de Rapoarte.
 * Tipuri suportate: 'area' | 'bar' | 'line'. Importuri specifice (tree-shaking).
 * La perioadă fără date afișează un placeholder RO în loc de grafic gol.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { isSeriesEmpty } from '../../../../services/adminReportsService'

function ChartTooltip({ active, payload, label, name }) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-0.5 font-bold text-slate-800 dark:text-white">
        {name}: <span className="text-primary">{new Intl.NumberFormat('ro-RO').format(value)}</span>
      </p>
    </div>
  )
}

export function ReportChart({ title, subtitle, data = [], dataKey, name, color = '#6366f1', type = 'area' }) {
  const empty = isSeriesEmpty(data, dataKey)
  const gradientId = `grad-${dataKey}`

  const axisProps = {
    stroke: 'currentColor',
    tick: { fontSize: 11, fontWeight: 700 },
    tickLine: false,
    axisLine: false,
  }

  function renderChart() {
    if (type === 'bar') {
      return (
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-slate-200 dark:text-white/10" stroke="currentColor" />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} content={<ChartTooltip name={name} />} />
          <Bar dataKey={dataKey} name={name} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      )
    }
    if (type === 'line') {
      return (
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-slate-200 dark:text-white/10" stroke="currentColor" />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip content={<ChartTooltip name={name} />} />
          <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      )
    }
    return (
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="text-slate-200 dark:text-white/10" stroke="currentColor" />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip content={<ChartTooltip name={name} />} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.5} fill={`url(#${gradientId})`} />
      </AreaChart>
    )
  }

  return (
    <div className="rounded-3xl border border-slate-300/50 bg-white p-6 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">{title}</h3>
        {subtitle ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{subtitle}</span>
        ) : null}
      </div>

      {empty ? (
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm font-semibold text-muted-foreground dark:border-white/10">
          Nu există date pentru această perioadă.
        </div>
      ) : (
        <div className="text-slate-400 dark:text-slate-500">
          <ResponsiveContainer width="100%" height={240}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
