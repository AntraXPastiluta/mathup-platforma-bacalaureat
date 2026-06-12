/**
 * Export GDPR al datelor utilizatorului — exclusiv prin edge function
 * (service role + limită de rată în baza de date). Nu există fallback pe client.
 */
import { supabase } from '../supabaseClient'

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

/**
 * Generează exportul datelor utilizatorului curent și declanșează descărcarea JSON.
 */
export async function exportAndDownloadUserData() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.access_token) {
    throw new Error('Trebuie să fii autentificat pentru a exporta datele.')
  }

  const payload = await invokeExportUserData(session.access_token)
  triggerJsonDownload(payload)
  return payload
}
