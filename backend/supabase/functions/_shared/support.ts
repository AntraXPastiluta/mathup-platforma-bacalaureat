import { jsonResponse } from './http.ts'

export const ALLOWED_CATEGORIES = new Set(['billing', 'technical', 'content', 'other'])
export const MAX_SUBJECT_LENGTH = 120
export const MAX_MESSAGE_LENGTH = 2000
export const RATE_LIMIT_COUNT = 5
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

export const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Facturare',
  technical: 'Problemă tehnică',
  content: 'Conținut lecții',
  other: 'Altele',
}

export type SupportPayload = {
  category?: string
  subject?: string
  message?: string
}

export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

export function validatePayload(payload: SupportPayload) {
  const category = normalizeText(payload.category, 32)
  const subject = normalizeText(payload.subject, MAX_SUBJECT_LENGTH)
  const message = normalizeText(payload.message, MAX_MESSAGE_LENGTH)

  if (!ALLOWED_CATEGORIES.has(category)) {
    return { error: 'Categoria selectată nu este validă.' as const }
  }
  if (!subject) {
    return { error: 'Introdu un subiect pentru mesaj.' as const }
  }
  if (!message) {
    return { error: 'Introdu mesajul către suport.' as const }
  }

  return { data: { category, subject, message } }
}

export async function sendEmailJsNotification(options: {
  serviceId: string
  templateId: string
  publicKey: string
  privateKey: string
  templateParams: Record<string, string>
  fetchImpl?: typeof fetch
}) {
  const fetcher = options.fetchImpl ?? fetch
  const response = await fetcher('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: options.serviceId,
      template_id: options.templateId,
      user_id: options.publicKey,
      accessToken: options.privateKey,
      template_params: options.templateParams,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[submit-support-request] EmailJS failed:', response.status, detail)
    if (response.status === 403 && detail.includes('non-browser')) {
      throw new Error('EMAILJS_NON_BROWSER_DISABLED')
    }
    throw new Error(`EMAILJS_FAILED:${response.status}`)
  }
}

export function supportErrorResponse(message: string, status: number, corsHeaders: Record<string, string>) {
  return jsonResponse({ error: message }, status, corsHeaders)
}
