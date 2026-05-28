import { readEnv, type EnvSource } from './env.ts'

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

export function isAllowedReturnOrigin(origin: string, envSource?: EnvSource) {
  const normalized = normalizeOrigin(origin)
  if (normalized === 'http://localhost:5173') return true
  if (/^https:\/\/scholar-bac\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-bacalureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-platforma-bacalaureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true

  const configured = readEnv('APP_URL', envSource)
  if (configured && normalized === normalizeOrigin(configured)) return true

  return false
}

export function resolveAppUrl(req: Request, returnOrigin: unknown, envSource?: EnvSource) {
  const configured = normalizeOrigin(readEnv('APP_URL', envSource) ?? 'http://localhost:5173')
  const candidates = [
    typeof returnOrigin === 'string' ? returnOrigin : null,
    req.headers.get('Origin'),
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    const normalized = normalizeOrigin(candidate)
    if (isAllowedReturnOrigin(normalized, envSource)) return normalized
  }

  return configured
}
