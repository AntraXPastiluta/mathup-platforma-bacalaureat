import { readEnv } from './env.ts'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

export function isAllowedAppOrigin(origin: string) {
  const normalized = normalizeOrigin(origin)
  if (normalized === 'http://localhost:5173') return true
  if (normalized === 'http://127.0.0.1:5173') return true
  if (/^https:\/\/mathup-platforma-bacalaureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-platforma-bacalaureat-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-bacalureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-bacalureat-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true

  const configured = readEnv('APP_URL')
  if (configured && normalized === normalizeOrigin(configured)) return true

  return false
}

export function buildCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const requestedHeaders = req.headers.get('Access-Control-Request-Headers')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': requestedHeaders ?? 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin, Access-Control-Request-Headers',
  }

  if (origin && isAllowedAppOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = normalizeOrigin(origin)
  }

  return headers
}
