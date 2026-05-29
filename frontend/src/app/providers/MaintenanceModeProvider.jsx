import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isEnvMaintenanceOverride, parseMaintenanceFlag } from '../config/maintenance'
import { fetchMaintenanceMode } from '../../services/platformSettingsService'

const MaintenanceModeContext = createContext(null)

export function MaintenanceModeProvider({ children }) {
  // Override din variabilă de mediu: dacă e setat, mentenanța e forțată activă și nu mai
  // interogăm baza de date (folosit pentru deploy-uri de urgență când backend-ul e jos).
  const envOverride = isEnvMaintenanceOverride()
  const [ready, setReady] = useState(envOverride)
  const [enabled, setEnabled] = useState(envOverride)

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (envOverride) {
        setEnabled(true)
        setReady(true)
        return
      }

      if (!silent) {
        setReady(false)
      }

      try {
        const fromDb = await fetchMaintenanceMode()
        setEnabled(parseMaintenanceFlag(fromDb))
      } catch {
        setEnabled(false)
      } finally {
        setReady(true)
      }
    },
    [envOverride],
  )

  useEffect(() => {
    if (envOverride) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const fromDb = await fetchMaintenanceMode()
        if (!cancelled) setEnabled(parseMaintenanceFlag(fromDb))
      } catch {
        if (!cancelled) setEnabled(false)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [envOverride])

  const refresh = useCallback(async () => {
    await load({ silent: true })
  }, [load])

  const value = useMemo(
    () => ({
      ready,
      enabled: envOverride || enabled,
      refresh,
    }),
    [ready, envOverride, enabled, refresh],
  )

  return (
    <MaintenanceModeContext.Provider value={value}>{children}</MaintenanceModeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMaintenanceMode() {
  const context = useContext(MaintenanceModeContext)
  if (!context) {
    throw new Error('useMaintenanceMode must be used inside MaintenanceModeProvider')
  }
  return context
}
