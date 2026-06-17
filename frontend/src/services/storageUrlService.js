/**
 * Semnarea URL-urilor din bucket-ul privat `materials`.
 *
 * Bucket-ul `materials` este PRIVAT: fișierele nu mai sunt accesibile prin URL public.
 * Conținutul premium (PDF-uri de lecție, variante rezolvate) trebuie servit prin
 * URL-uri semnate, de scurtă durată, generate la momentul citirii.
 *
 * `extractMaterialsPath` acceptă atât o cale brută (`lesson-materials/uuid.pdf`), cât și
 * un URL Supabase deja salvat (public `/object/public/materials/...` SAU semnat
 * `/object/sign/materials/...`). Astfel funcționează fără migrare de date: rândurile
 * vechi care păstrează URL-uri publice rămân valide — extragem calea și o re-semnăm.
 */
import { supabase } from '../supabaseClient'

const BUCKET = 'materials'
const ALLOWED_PREFIXES = ['lesson-materials/', 'profile-photos/']

// TTL implicit pentru imagini randate ca <img> (avatar, imagini de lecție): 1 oră.
export const SIGNED_URL_TTL_IMAGE = 60 * 60
// TTL scurt pentru link-uri/descărcări deschise imediat la click.
export const SIGNED_URL_TTL_DOWNLOAD = 5 * 60

/**
 * Întoarce calea relativă în bucket (`lesson-materials/...` sau `profile-photos/...`)
 * dintr-o cale brută sau dintr-un URL Supabase (public sau semnat), sau null.
 */
export function extractMaterialsPath(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Cale brută, restrânsă la folderele cunoscute (nu semnăm input arbitrar).
  if (!trimmed.includes('://')) {
    return ALLOWED_PREFIXES.some((p) => trimmed.startsWith(p)) ? trimmed : null
  }

  // URL complet Supabase: /storage/v1/object/(public|sign|authenticated)/materials/<path>
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }
  const segments = parsed.pathname.split('/').filter(Boolean)
  const bucketIdx = segments.indexOf(BUCKET)
  if (bucketIdx === -1 || bucketIdx >= segments.length - 1) return null
  const path = decodeURIComponent(segments.slice(bucketIdx + 1).join('/'))
  return ALLOWED_PREFIXES.some((p) => path.startsWith(p)) ? path : null
}

/**
 * Generează un URL semnat pentru o cale/URL din `materials`, sau null dacă nu se poate.
 * Nu aruncă: apelantul tratează `null` ca „indisponibil".
 */
export async function getSignedMaterialsUrl(value, { expiresIn = SIGNED_URL_TTL_IMAGE } = {}) {
  const path = extractMaterialsPath(value)
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
