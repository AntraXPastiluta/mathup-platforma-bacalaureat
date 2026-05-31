const EXPORT_VERSION = '1'

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
]

export function sanitizeProfileMetadata(metadata = {}) {
  const profile = {}
  for (const key of PROFILE_METADATA_KEYS) {
    if (key in metadata) profile[key] = metadata[key]
  }
  if (typeof metadata.avatar_photo_url === 'string' && metadata.avatar_photo_url) {
    profile.profile_photo_note =
      'Fotografia de profil este stocată în Supabase Storage; URL-ul de mai sus permite accesul public la fișier.'
  }
  return profile
}

export function buildAccountSection(user) {
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
  }
}

export function mapStudyRoadmaps(rows) {
  return (rows ?? []).map((row) => {
    const { user_study_roadmap_subjects: subjects, ...roadmap } = row
    return {
      ...roadmap,
      subjects: Array.isArray(subjects) ? subjects : [],
    }
  })
}

export function assembleExportPayload(user, sections) {
  const metadata = user.user_metadata ?? {}
  return {
    export_version: EXPORT_VERSION,
    meta: {
      exported_at: new Date().toISOString(),
      platform: 'MathUP',
      legal_docs_version:
        typeof metadata.legal_docs_version === 'string' ? metadata.legal_docs_version : null,
      source: sections.source ?? 'edge',
    },
    account: buildAccountSection(user),
    profile: sanitizeProfileMetadata(metadata),
    progress: sections.progress ?? [],
    quiz_attempts: sections.quiz_attempts ?? [],
    study_roadmaps: sections.study_roadmaps ?? [],
    premium: {
      entitlement: sections.entitlement ?? null,
      orders: sections.orders ?? [],
    },
  }
}
