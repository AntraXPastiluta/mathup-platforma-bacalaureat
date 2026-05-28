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
