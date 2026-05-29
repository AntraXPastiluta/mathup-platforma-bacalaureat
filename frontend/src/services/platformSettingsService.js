/**
 * Setări globale ale platformei: modul de mentenanță și data examenului BAC.
 * Fiecare valoare se citește preferabil printr-o funcție RPC, cu fallback pe
 * interogarea directă a tabelei `platform_settings` atunci când backend-ul
 * (RPC/coloană) nu e încă migrat.
 */
import { parseMaintenanceFlag } from '../app/config/maintenance'
import {
  formatBacExamDateInput,
  getDefaultBacExamDate,
  parseBacExamDate,
} from '../shared/utils/bacExamDate'
import { supabase } from '../supabaseClient'
import { requirePrimaryAdmin } from './curriculumAdminService'

export const MAINTENANCE_CONTACT_EMAIL = 'mathupbacalaureat@gmail.com'

const BAC_EXAM_MIGRATION_HINT =
  'Rulează migrarea Supabase: din folderul backend, `npx supabase db push` (sau SQL din supabase/migrations/20260628120000_bac_exam_date.sql în Dashboard).'

// Detectează cazurile în care suportul de backend pentru data BAC lipsește
// (funcție/coloană/tabel inexistent, sau 404/400), ca să putem cădea elegant pe fallback.
function isBacExamBackendMissing(error) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '')
  return (
    code === 'PGRST202'
    || code === '42883'
    || code === '42703'
    || code === 'PGRST205'
    || code === '42P01'
    || Number(error.status) === 404
    || Number(error.status) === 400
    || message.includes('get_bac_exam_date')
    || message.includes('set_bac_exam_date')
    || message.includes('bac_exam_date')
  )
}

/** Citește starea modului de mentenanță (cu fallback pe tabelă dacă RPC lipsește). */
export async function fetchMaintenanceMode() {
  const { data, error } = await supabase.rpc('get_maintenance_mode')
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      return fetchMaintenanceModeFromTable()
    }
    throw error
  }
  return parseMaintenanceFlag(data)
}

/** Activează/dezactivează modul de mentenanță (doar administratorul principal). */
export async function setMaintenanceMode(enabled) {
  await requirePrimaryAdmin()

  const { data, error } = await supabase.rpc('set_maintenance_mode', {
    p_enabled: Boolean(enabled),
  })
  if (error) throw error
  return Boolean(data)
}

export async function fetchMaintenanceModeFromTable() {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('maintenance_enabled')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return false
    throw error
  }
  return Boolean(data?.maintenance_enabled)
}

/** Citește data examenului BAC (cu fallback pe tabelă, apoi pe valoarea implicită). */
export async function fetchBacExamDate() {
  const { data, error } = await supabase.rpc('get_bac_exam_date')
  if (!error) return parseBacExamDate(data)

  if (isBacExamBackendMissing(error)) {
    return fetchBacExamDateFromTable()
  }
  throw error
}

async function fetchBacExamDateFromTable() {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('bac_exam_date')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    if (isBacExamBackendMissing(error)) return getDefaultBacExamDate()
    throw error
  }
  return parseBacExamDate(data?.bac_exam_date)
}

/** Setează data examenului BAC (doar admin principal); fără backend, indică migrarea necesară. */
export async function setBacExamDate(date) {
  await requirePrimaryAdmin()

  const normalized = parseBacExamDate(date)
  const { data, error } = await supabase.rpc('set_bac_exam_date', {
    p_date: formatBacExamDateInput(normalized),
  })
  if (!error) return parseBacExamDate(data)

  if (isBacExamBackendMissing(error)) {
    throw new Error(BAC_EXAM_MIGRATION_HINT)
  }
  throw error
}
