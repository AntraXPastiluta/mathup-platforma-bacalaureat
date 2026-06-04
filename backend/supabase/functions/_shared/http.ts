import { Hono, type Context } from 'hono'
import { readEnv, type EnvSource } from './env.ts'

export type CorsHeaders = Record<string, string>

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '')
}

export function isAllowedAppOrigin(origin: string, envSource?: EnvSource) {
  const normalized = normalizeOrigin(origin)
  if (normalized === 'http://localhost:5173') return true
  if (normalized === 'http://127.0.0.1:5173') return true
  if (/^https:\/\/mathup-platforma-bacalaureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-platforma-bacalaureat-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-bacalureat\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/mathup-bacalureat-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac\.vercel\.app$/.test(normalized)) return true
  if (/^https:\/\/scholar-bac-[a-z0-9-]+-[\w-]+\.vercel\.app$/.test(normalized)) return true

  const configured = readEnv('APP_URL', envSource)
  if (configured && normalized === normalizeOrigin(configured)) return true

  return false
}

export function buildCorsHeaders(req: Request, envSource?: EnvSource): CorsHeaders {
  const origin = req.headers.get('Origin')
  const headers: CorsHeaders = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }

  if (origin && isAllowedAppOrigin(origin, envSource)) {
    headers['Access-Control-Allow-Origin'] = normalizeOrigin(origin)
  }

  return headers
}

export function withCorsHeaders(response: Response, corsHeaders: CorsHeaders) {
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: CorsHeaders,
) {
  return withCorsHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
    corsHeaders,
  )
}

export function textResponse(text: string, status: number, corsHeaders: CorsHeaders) {
  return withCorsHeaders(new Response(text, { status }), corsHeaders)
}

type AppContext = Context<{ Variables: { corsHeaders: CorsHeaders } }>

export function createCorsMiddleware() {
  return async (c: AppContext, next: () => Promise<void>) => {
    c.set('corsHeaders', buildCorsHeaders(c.req.raw))
    await next()
    const corsHeaders = c.get('corsHeaders') as CorsHeaders | undefined
    if (!corsHeaders) return
    for (const [key, value] of Object.entries(corsHeaders)) {
      c.header(key, value)
    }
  }
}

export function getCorsHeaders(c: AppContext) {
  return (c.get('corsHeaders') as CorsHeaders | undefined) ?? {}
}

export function createBaseApp() {
  const app = new Hono<{ Variables: { corsHeaders: CorsHeaders } }>()
  app.use('*', createCorsMiddleware())
  return app
}
