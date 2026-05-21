import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'
import { buildCorsHeaders } from '../_shared/cors.ts'

const ALLOWED_CATEGORIES = new Set(['billing', 'technical', 'content', 'other'])
const MAX_SUBJECT_LENGTH = 120
const MAX_MESSAGE_LENGTH = 2000
const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Facturare',
  technical: 'Problemă tehnică',
  content: 'Conținut lecții',
  other: 'Altele',
}

type SupportPayload = {
  category?: string
  subject?: string
  message?: string
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function validatePayload(payload: SupportPayload) {
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

async function sendEmailJsNotification(options: {
  serviceId: string
  templateId: string
  publicKey: string
  privateKey: string
  templateParams: Record<string, string>
}) {
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
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

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, corsHeaders)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const emailJsServiceId = Deno.env.get('EMAILJS_SERVICE_ID')
    const emailJsTemplateId = Deno.env.get('EMAILJS_TEMPLATE_ID')
    const emailJsPublicKey = Deno.env.get('EMAILJS_PUBLIC_KEY')
    const emailJsPrivateKey = Deno.env.get('EMAILJS_PRIVATE_KEY')
    const supportNotifyEmail = Deno.env.get('SUPPORT_NOTIFY_EMAIL') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment configuration.')
    }
    if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey || !emailJsPrivateKey) {
      throw new Error('Missing EmailJS environment configuration.')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized.' }, 401, corsHeaders)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user?.id) {
      return jsonResponse({ error: 'Unauthorized.' }, 401, corsHeaders)
    }

    const requestBody = await req.json().catch(() => ({})) as SupportPayload
    const validated = validatePayload(requestBody)
    if ('error' in validated) {
      return jsonResponse({ error: validated.error }, 400, corsHeaders)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()

    const { count, error: rateError } = await adminClient
      .from('support_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart)

    if (rateError) {
      console.error('[submit-support-request] rate limit check failed:', rateError)
      throw rateError
    }

    if ((count ?? 0) >= RATE_LIMIT_COUNT) {
      return jsonResponse(
        { error: 'Ai trimis prea multe mesaje. Încearcă din nou peste o oră.' },
        429,
        corsHeaders,
      )
    }

    const userEmail = user.email?.trim() || ''
    if (!userEmail) {
      return jsonResponse({ error: 'Contul tău nu are un email valid.' }, 400, corsHeaders)
    }

    const userName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name.trim()
        : ''

    const { data: inserted, error: insertError } = await adminClient
      .from('support_requests')
      .insert({
        user_id: user.id,
        user_email: userEmail,
        user_name: userName || null,
        category: validated.data.category,
        subject: validated.data.subject,
        message: validated.data.message,
        status: 'open',
      })
      .select('id, created_at')
      .single()

    if (insertError || !inserted?.id) {
      console.error('[submit-support-request] insert failed:', insertError)
      throw insertError ?? new Error('Insert failed')
    }

    const categoryLabel = CATEGORY_LABELS[validated.data.category] ?? validated.data.category
    const emailSubject = `[MathUP Suport] ${validated.data.subject}`
    const emailBody = [
      'Mesaj nou de suport MathUP',
      '',
      `ID cerere: ${inserted.id}`,
      `Data: ${inserted.created_at}`,
      `Utilizator: ${userName || '(fără nume)'}`,
      `Email: ${userEmail}`,
      `User ID: ${user.id}`,
      `Categorie: ${categoryLabel}`,
      `Subiect: ${validated.data.subject}`,
      '',
      'Mesaj:',
      validated.data.message,
    ].join('\n')

    const displayName = userName || 'Elev MathUP'
    const createdAt = String(inserted.created_at)
    let emailDelivered = false
    try {
      await sendEmailJsNotification({
        serviceId: emailJsServiceId,
        templateId: emailJsTemplateId,
        publicKey: emailJsPublicKey,
        privateKey: emailJsPrivateKey,
        templateParams: {
          to_email: supportNotifyEmail,
          reply_to: userEmail,
          from_name: displayName,
          from_email: userEmail,
          email_subject: emailSubject,
          email_body: emailBody,
          request_id: inserted.id,
          created_at: createdAt,
          user_name: displayName,
          user_email: userEmail,
          user_id: user.id,
          category: validated.data.category,
          category_label: categoryLabel,
          subject: validated.data.subject,
          message: validated.data.message,
          // Aliasuri pentru șablonul EmailJS „Contact Us”
          name: displayName,
          email: userEmail,
          title: validated.data.subject,
          time: createdAt,
        },
      })
      emailDelivered = true
    } catch (emailError) {
      const emailMessage = emailError instanceof Error ? emailError.message : ''
      console.error('[submit-support-request] email notification failed:', emailMessage)
      if (emailMessage === 'EMAILJS_NON_BROWSER_DISABLED') {
        console.error(
          '[submit-support-request] Enable "Allow API requests from non-browser environments" at https://dashboard.emailjs.com/admin/account/security',
        )
      }
    }

    return jsonResponse({ id: inserted.id, email_delivered: emailDelivered }, 200, corsHeaders)
  } catch (error) {
    console.error('[submit-support-request]', error)
    return jsonResponse({ error: 'Nu am putut trimite mesajul. Încearcă din nou.' }, 500, corsHeaders)
  }
})
