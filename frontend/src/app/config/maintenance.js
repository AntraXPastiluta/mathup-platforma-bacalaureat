export function isTruthy(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

/** Local / emergency override via .env.local or `npm run dev:maintenance`. */
export function isEnvMaintenanceOverride() {
  return isTruthy(import.meta.env.VITE_MAINTENANCE_MODE)
}

export function parseMaintenanceFlag(data) {
  if (data === null || data === undefined) return false
  if (typeof data === 'boolean') return data
  if (typeof data === 'number') return data !== 0
  if (typeof data === 'string') return isTruthy(data)
  if (Array.isArray(data)) {
    if (data.length === 0) return false
    return parseMaintenanceFlag(data[0])
  }
  if (typeof data === 'object') {
    if ('maintenance_enabled' in data) return Boolean(data.maintenance_enabled)
    if ('get_maintenance_mode' in data) return parseMaintenanceFlag(data.get_maintenance_mode)
  }
  return false
}
