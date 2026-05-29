/**
 * Variantele rezolvate disponibile elevului. Sursele sunt două: tabela nouă
 * `program_solved_variants` (per program) și fișierele „legacy” atașate lecțiilor
 * marcate ca material rezolvat. Rezultatele sunt unificate și sortate descrescător.
 */
import { supabase } from '../supabaseClient'
import { normalizeProfilesList } from './profileService'

// Normalizează un rând din tabela nouă (per program) la forma comună de variantă.
function mapProgramVariant(row) {
  return {
    id: row.id,
    file_name: row.file_name,
    file_url: row.file_url,
    file_type: row.file_type,
    created_at: row.created_at,
    profile: row.profile,
    source: 'program',
  }
}

// Normalizează un fișier de lecție „legacy” (rezolvat) la aceeași formă de variantă.
function mapLegacyLessonVariant(row) {
  return {
    id: row.id,
    file_name: row.file_name,
    file_url: row.file_url,
    file_type: row.file_type,
    created_at: row.created_at,
    profile: row.lessons?.profile ?? null,
    source: 'lesson',
  }
}

/** Returnează variantele rezolvate pentru programele date, combinând ambele surse. */
export async function getSolvedVariantsForProfiles(profileKeys) {
  const keys = normalizeProfilesList(profileKeys)
  if (keys.length === 0) return []

  const [programResult, legacyResult] = await Promise.all([
    supabase
      .from('program_solved_variants')
      .select('id, profile, file_name, file_url, file_type, created_at')
      .in('profile', keys)
      .order('created_at', { ascending: false }),
    supabase
      .from('lesson_files')
      .select(`
        id,
        file_name,
        file_url,
        file_type,
        created_at,
        lessons!inner (
          profile
        )
      `)
      .eq('is_solved_content', true)
      .in('lessons.profile', keys)
      .order('created_at', { ascending: false }),
  ])

  // PGRST205 = tabela `program_solved_variants` nu există încă (migrare neaplicată);
  // în acest caz ignorăm sursa nouă și ne bazăm doar pe fișierele legacy.
  if (programResult.error && programResult.error.code !== 'PGRST205') {
    throw programResult.error
  }

  if (legacyResult.error) {
    throw legacyResult.error
  }

  const variants = [
    ...(programResult.data ?? []).map(mapProgramVariant),
    ...(legacyResult.data ?? []).map(mapLegacyLessonVariant),
  ]

  variants.sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
  return variants
}
