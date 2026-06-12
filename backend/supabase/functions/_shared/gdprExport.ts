export const EXPORT_VERSION = '2'
export const EXPORT_RATE_LIMIT_COUNT = 3
export const EXPORT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

const PROFILE_METADATA_KEYS = [
  'full_name',
  'profile',
  'profiles',
  'bio',
  'avatar_id',
  'avatar_photo_url',
  'target_grade',
  'streak',
  'last_streak_activity_date',
  'last_lesson_activity_date',
  'last_login_at',
  'terms_accepted_at',
  'privacy_accepted_at',
  'legal_docs_version',
] as const

type AuthUser = {
  id: string
  email?: string | null
  created_at?: string
  last_sign_in_at?: string | null
  user_metadata?: Record<string, unknown>
}

import type { SupabaseClient } from '@supabase/supabase-js'

type AdminClient = SupabaseClient

export function sanitizeProfileMetadata(metadata: Record<string, unknown> | undefined) {
  const source = metadata ?? {}
  const profile: Record<string, unknown> = {}
  for (const key of PROFILE_METADATA_KEYS) {
    if (key in source) profile[key] = source[key]
  }
  if (typeof source.avatar_photo_url === 'string' && source.avatar_photo_url) {
    profile.profile_photo_note =
      'Fotografia de profil este stocată în Supabase Storage; URL-ul de mai sus permite accesul public la fișier.'
  }
  return profile
}

export function buildAccountSection(user: AuthUser) {
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
  }
}

export async function countRecentExportRequests(
  admin: AdminClient,
  userId: string,
  windowStartIso: string,
) {
  const { count, error } = await admin
    .from('gdpr_export_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStartIso)

  if (error) throw error
  return count ?? 0
}

/** Atomic rate-limit reservation (insert + count in one DB transaction). */
export async function reserveGdprExportSlot(admin: AdminClient, userId: string): Promise<boolean> {
  const { data, error } = await (
    admin as AdminClient & {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: Error | null }>
    }
  ).rpc('reserve_gdpr_export_slot', { p_user_id: userId })
  if (error) throw error
  return Boolean(data)
}

export async function logExportRequest(admin: AdminClient, userId: string) {
  const { error } = await admin.from('gdpr_export_logs').insert({ user_id: userId })
  if (error) throw error
}

export async function buildUserDataExport(admin: AdminClient, user: AuthUser) {
  const userId = user.id
  const exportedAt = new Date().toISOString()
  const metadata = user.user_metadata ?? {}

  const [
    progressResult,
    quizResult,
    entitlementResult,
    ordersResult,
  ] = await Promise.all([
    admin
      .from('user_progress')
      .select('lesson_id,completed,score,last_accessed')
      .eq('user_id', userId),
    admin
      .from('user_quiz_attempts')
      .select('question_id,lesson_id,is_correct')
      .eq('user_id', userId),
    admin
      .from('premium_entitlements')
      .select(
        'status,expires_at,purchased_at,amount_paid,currency,cancel_at_period_end,updated_at,stripe_checkout_session_id,stripe_payment_intent_id,stripe_subscription_id,stripe_customer_id',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    admin
      .from('premium_orders')
      .select(
        'stripe_checkout_session_id,stripe_payment_intent_id,status,amount_paid,currency',
      )
      .eq('user_id', userId),
  ])

  const errors = [
    progressResult.error,
    quizResult.error,
    entitlementResult.error,
    ordersResult.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    throw errors[0]
  }

  return {
    export_version: EXPORT_VERSION,
    meta: {
      exported_at: exportedAt,
      platform: 'MathUP',
      source: 'edge',
      legal_docs_version:
        typeof metadata.legal_docs_version === 'string' ? metadata.legal_docs_version : null,
    },
    account: buildAccountSection(user),
    profile: sanitizeProfileMetadata(metadata),
    progress: progressResult.data ?? [],
    quiz_attempts: quizResult.data ?? [],
    premium: {
      entitlement: entitlementResult.data ?? null,
      orders: ordersResult.data ?? [],
    },
  }
}
