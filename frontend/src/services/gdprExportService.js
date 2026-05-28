import { supabase } from '../supabaseClient'
import { assembleExportPayload, mapStudyRoadmaps } from '../utils/gdprExportBuilder'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const EXPORT_UNAVAILABLE = 'Nu am putut genera exportul datelor. Încearcă din nou.'

function logExportError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[gdpr-export:${context}]`, error)
  }
}

function parseExportPayload(payload) {
  if (!payload || typeof payload !== 'object' || !payload.export_version) {
    throw new Error(EXPORT_UNAVAILABLE)
  }
  if (payload.error) {
    const message = typeof payload.error === 'string' ? payload.error : EXPORT_UNAVAILABLE
    throw new Error(message)
  }
  return payload
}

function triggerJsonDownload(data) {
  const date = new Date().toISOString().slice(0, 10)
  const filename = `mathup-export-${date}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function isEdgeFunctionUnavailable(error, contextStatus) {
  const message = error?.message || ''
  return (
    contextStatus === 404 ||
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('CORS')
  )
}

async function queryOptional(builder) {
  const { data, error } = await builder
  if (error) {
    logExportError('client-query', error)
    return []
  }
  return data
}

async function queryOptionalSingle(builder) {
  const { data, error } = await builder
  if (error) {
    logExportError('client-query', error)
    return null
  }
  return data
}

async function buildClientSideExport(user) {
  const userId = user.id

  const [
    progress,
    quizAttempts,
    roadmapsRaw,
    entitlement,
    orders,
    supportRequests,
  ] = await Promise.all([
    queryOptional(
      supabase
        .from('user_progress')
        .select('lesson_id,completed,score,last_accessed')
        .eq('user_id', userId),
    ),
    queryOptional(
      supabase
        .from('user_quiz_attempts')
        .select('question_id,lesson_id,is_correct')
        .eq('user_id', userId),
    ),
    queryOptional(
      supabase
        .from('user_study_roadmaps')
        .select(
          'id,title,created_at,updated_at,user_study_roadmap_subjects(subject_part,importance_grade,position_x,position_y)',
        )
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }),
    ),
    queryOptionalSingle(
      supabase
        .from('premium_entitlements')
        .select(
          'status,expires_at,purchased_at,amount_paid,currency,cancel_at_period_end,updated_at,stripe_checkout_session_id,stripe_payment_intent_id,stripe_subscription_id,stripe_customer_id',
        )
        .eq('user_id', userId)
        .maybeSingle(),
    ),
    queryOptional(
      supabase
        .from('premium_orders')
        .select('stripe_checkout_session_id,stripe_payment_intent_id,status,amount_paid,currency')
        .eq('user_id', userId),
    ),
    queryOptional(
      supabase
        .from('support_requests')
        .select('id,category,subject,message,status,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ),
  ])

  return assembleExportPayload(user, {
    source: 'client',
    progress,
    quiz_attempts: quizAttempts,
    study_roadmaps: mapStudyRoadmaps(roadmapsRaw),
    entitlement,
    orders,
    support_requests: supportRequests,
  })
}

async function invokeExportUserData(accessToken) {
  const { data, error } = await supabase.functions.invoke('export-user-data', {
    body: {},
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!error) return parseExportPayload(data)

  const message = error.message || ''
  const contextStatus = error?.context?.status

  if (contextStatus === 429) {
    throw new Error(
      'Ai atins limita de 3 exporturi în ultimele 24 de ore. Încearcă din nou mâine sau contactează DPO.',
    )
  }

  if (contextStatus === 401) {
    throw new Error('Trebuie să fii autentificat pentru a exporta datele.')
  }

  if (contextStatus === 400 && data?.error) {
    throw new Error(data.error)
  }

  const edgeUnavailable = isEdgeFunctionUnavailable(error, contextStatus)

  if (contextStatus === 404) {
    logExportError('not-deployed', error)
  }

  const shouldRetryWithFetch =
    edgeUnavailable ||
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError')

  if (!shouldRetryWithFetch || !supabaseUrl || !supabaseAnonKey) {
    logExportError('invoke', error)
    throw new Error(EXPORT_UNAVAILABLE)
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/export-user-data`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const payload = await response.json().catch(() => null)
    if (response.status === 429) {
      throw new Error(
        'Ai atins limita de 3 exporturi în ultimele 24 de ore. Încearcă din nou mâine sau contactează DPO.',
      )
    }
    if (response.status === 401) {
      throw new Error('Trebuie să fii autentificat pentru a exporta datele.')
    }
    if (response.status === 400 && payload?.error) {
      throw new Error(payload.error)
    }
    if (!response.ok) {
      throw new Error(EXPORT_UNAVAILABLE)
    }

    return parseExportPayload(payload)
  } catch (fetchError) {
    logExportError('fetch', fetchError)
    throw fetchError
  }
}

export async function exportAndDownloadUserData() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a exporta datele.')
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Trebuie să fii autentificat pentru a exporta datele.')
  }

  let payload
  try {
    payload = await invokeExportUserData(session.access_token)
  } catch (edgeError) {
    const message = edgeError?.message || ''
    if (message.includes('3 exporturi') || message.includes('autentificat')) {
      throw edgeError
    }

    if (import.meta.env.DEV) {
      console.warn('[gdpr-export] Edge Function indisponibilă — export direct din cont.')
    }
    payload = await buildClientSideExport(user)
  }

  triggerJsonDownload(payload)
  return payload
}
