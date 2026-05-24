import { parseMaintenanceFlag } from '../app/config/maintenance'
import { supabase } from '../supabaseClient'
import { isPrimaryAdminEmail } from './curriculumAdminService'

export const MAINTENANCE_CONTACT_EMAIL = 'mathupbacalaureat@gmail.com'

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
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  if (!isPrimaryAdminEmail(user?.email)) {
    throw new Error('Doar administratorul principal poate modifica modul de mentenanță.')
  }

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
