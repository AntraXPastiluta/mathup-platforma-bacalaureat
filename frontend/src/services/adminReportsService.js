/**
 * Date pentru secțiunea de Rapoarte (admin). Apelează un singur RPC agregat
 * (`get_admin_reports`) și normalizează jsonb-ul în structuri gata de grafice.
 * Toată agregarea se face în Postgres; aici doar normalizăm pentru UI.
 */
import { supabase } from '../supabaseClient'
import { requireCurriculumAdmin } from './curriculumAdminService'

const MONTHS_RO_SHORT = [
  'ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.',
  'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.',
]

/** Opțiuni de perioadă expuse în UI. */
export const REPORT_PERIODS = [
  { value: '12m', label: 'Ultimele 12 luni (lunar)' },
  { value: '30d', label: 'Ultimele 30 de zile (zilnic)' },
]

/** Construiește intervalul {from, to, granularity} pentru o perioadă predefinită. */
export function buildRange(period) {
  const to = new Date()
  const from = new Date(to)
  if (period === '30d') {
    from.setDate(from.getDate() - 30)
    return { from, to, granularity: 'day' }
  }
  // implicit: ultimele 12 luni, lunar
  from.setMonth(from.getMonth() - 12)
  return { from, to, granularity: 'month' }
}

/** Etichetă RO pentru o cheie de bucket 'YYYY-MM-DD' în funcție de granularitate. */
export function formatBucketLabel(bucket, granularity) {
  if (typeof bucket !== 'string') return ''
  const [y, m, d] = bucket.split('-').map(Number)
  if (!m) return bucket
  if (granularity === 'day') return `${d} ${MONTHS_RO_SHORT[m - 1]}`
  return `${MONTHS_RO_SHORT[m - 1]} ${String(y).slice(2)}`
}

/** Transformă seria brută în puncte gata de Recharts (cu etichetă RO). */
export function normalizeSeries(series, granularity) {
  return (series ?? []).map((row) => ({
    label: formatBucketLabel(row.bucket, granularity),
    bucket: row.bucket,
    registrations: row.registrations ?? 0,
    premium_purchases: row.premium_purchases ?? 0,
    lessons_completed: row.lessons_completed ?? 0,
    gdpr_exports: row.gdpr_exports ?? 0,
  }))
}

/** Formatare RON pentru carduri (Intl, fără dependențe). */
export function formatRON(value) {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

/** True dacă toată seria e zero (folosit pentru starea „fără date"). */
export function isSeriesEmpty(series, key) {
  if (!series || series.length === 0) return true
  return series.every((row) => !(row?.[key]))
}

/**
 * Apel principal: returnează raportul agregat normalizat.
 * Pasăm mereu from/to ISO explicite (UI are mereu o perioadă selectată), ca să
 * nu suprascriem default-urile SQL cu null.
 */
export async function getAdminReports({ from, to, granularity } = {}) {
  await requireCurriculumAdmin()

  const { data, error } = await supabase.rpc('get_admin_reports', {
    p_from: from ? from.toISOString() : undefined,
    p_to: to ? to.toISOString() : undefined,
    p_granularity: granularity ?? 'month',
  })

  if (error) {
    // PGRST202/42883 = funcția RPC lipsește (ex. migrare neaplicată); mesaj prietenos.
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('Rapoartele nu sunt disponibile momentan.')
    }
    throw error
  }

  const payload = data ?? {}
  const g = payload.granularity ?? granularity ?? 'month'
  return {
    granularity: g,
    summary: payload.summary ?? {},
    series: normalizeSeries(payload.series, g),
    breakdown: payload.breakdown ?? {},
  }
}
