function isMaintenanceEnabled(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function isAllowedDuringMaintenance(pathname) {
  return (
    pathname === '/maintenance.html' ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/assets/')
  )
}

export default function middleware(request) {
  if (!isMaintenanceEnabled(process.env.MAINTENANCE_MODE)) {
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
  matcher: ['/((?!_vercel|_next/static|_next/image|favicon.ico|assets|maintenance.html).*)'],
}
