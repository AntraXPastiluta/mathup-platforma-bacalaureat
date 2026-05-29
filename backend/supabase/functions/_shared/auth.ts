import { jsonResponse } from './http.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

type AuthUser = {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

type CreateClient = (
  supabaseUrl: string,
  supabaseAnonKey: string,
  options: {
    global?: { headers?: Record<string, string> }
  },
) => SupabaseClient

export async function requireAuthenticatedUser(options: {
  req: Request
  corsHeaders: Record<string, string>
  supabaseUrl?: string | null
  supabaseAnonKey?: string | null
  createClient: CreateClient
  missingMessage?: string
  unauthorizedMessage?: string
}) {
  const {
    req,
    corsHeaders,
    supabaseUrl,
    supabaseAnonKey,
    createClient,
    missingMessage = 'Missing Supabase environment configuration.',
    unauthorizedMessage = 'Unauthorized.',
  } = options

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: missingMessage }, 500, corsHeaders)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header.' }, 401, corsHeaders)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return jsonResponse({ error: unauthorizedMessage }, 401, corsHeaders)
  }

  return { supabase, user: user as AuthUser }
}
