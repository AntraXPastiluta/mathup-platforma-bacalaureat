/**
 * Setări globale ale platformei: modul de mentenanță și data examenului BAC.
 * Valorile publice se citesc prin RPC `get_public_platform_flags` (fără email admin).
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
  'Rulează migrarea Supabase: din folderul backend, `npx supabase db push` (sau SQL din supabase/migrations/20260701000000_security_consolidation.sql în Dashboard).'

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
    || message.includes('get_public_platform_flags')
    || message.includes('bac_exam_date')
  )
}

async function fetchPublicPlatformFlags() {
  const { data, error } = await supabase.rpc('get_public_platform_flags')
  if (error) throw error
  return data && typeof data === 'object' ? data : {}
}

/** Citește starea modului de mentenanță. */
export async function fetchMaintenanceMode() {
  const { data, error } = await supabase.rpc('get_maintenance_mode')
  if (!error) return parseMaintenanceFlag(data)

  if (error.code === 'PGRST202' || error.code === '42883') {
    try {
      const flags = await fetchPublicPlatformFlags()
      return parseMaintenanceFlag(flags.maintenance_enabled)
    } catch {
      return false
    }
  }
  throw error
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

/** Citește data examenului BAC. */
export async function fetchBacExamDate() {
  const { data, error } = await supabase.rpc('get_bac_exam_date')
  if (!error) return parseBacExamDate(data)

  if (isBacExamBackendMissing(error)) {
    try {
      const flags = await fetchPublicPlatformFlags()
      return parseBacExamDate(flags.bac_exam_date)
    } catch {
      return getDefaultBacExamDate()
    }
  }
  throw error
}

/** Setează data examenului BAC (doar admin principal). */
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
