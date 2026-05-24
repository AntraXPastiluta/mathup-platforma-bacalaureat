function isMaintenanceEnabled(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function isAllowedDuringMaintenance(pathname) {
  return (
    pathname === '/maintenance.html' ||
    pathname === '/favicon.ico' ||
    pathname === '/mathup.svg' ||
    pathname.startsWith('/assets/')
  )
}

function getSupabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url: url.replace(/\/$/, ''), anonKey }
}

async function fetchMaintenanceFromSupabase() {
  const config = getSupabaseConfig()
  if (!config) return false

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/get_maintenance_mode`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
    })

    if (!response.ok) return false

    const data = await response.json()
    return Boolean(data)
  } catch {
    return false
  }
}

async function isMaintenanceActive() {
  if (isMaintenanceEnabled(process.env.MAINTENANCE_MODE)) return true
  return fetchMaintenanceFromSupabase()
}

export default async function middleware(request) {
  if (!(await isMaintenanceActive())) {
    return
  }

  const { pathname } = new URL(request.url)
  if (isAllowedDuringMaintenance(pathname)) {
    return
  }

  const maintenanceUrl = new URL('/maintenance.html', request.url)
  return Response.redirect(maintenanceUrl, 307)
}

export const config = {
  matcher: ['/((?!_vercel|_next/static|_next/image|favicon.ico|assets|maintenance.html|mathup.svg).*)'],
}
