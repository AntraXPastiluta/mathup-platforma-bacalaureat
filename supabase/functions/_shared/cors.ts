function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

export function isAllowedAppOrigin(origin: string) {
  const normalized = normalizeOrigin(origin)
  if (normalized === 'http://localhost:5173') return true
  if (/^https:\/\/scholar-bac\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true

  const configured = Deno.env.get('APP_URL')
  if (configured && normalized === normalizeOrigin(configured)) return true

  return false
}

export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }

  if (origin && isAllowedAppOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = normalizeOrigin(origin)
  }

  return headers
}
