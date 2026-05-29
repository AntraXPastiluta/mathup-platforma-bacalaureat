const EMBED_VIDEO_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
])

const PROFILE_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export function resolveLessonVideoEmbedSrc(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return null

  let url
  try {
    url = new URL(videoUrl.trim())
  } catch {
    return null
  }

  if (!['http:', 'https:'].includes(url.protocol)) return null
  if (!EMBED_VIDEO_HOSTS.has(url.hostname.toLowerCase())) return null

  // Acceptăm doar host-uri YouTube cunoscute și extragem ID-ul video (din ?v= sau din
  // ultimul segment de cale), pentru a evita injectarea unui iframe arbitrar.
  const videoId = url.searchParams.get('v')
    || url.pathname.split('/').filter(Boolean).pop()

  if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null

  // Folosim domeniul -nocookie pentru a reduce urmărirea (tracking) utilizatorului.
  return `https://www.youtube-nocookie.com/embed/${videoId}`
}

/** Returns a validated storage URL, or null if the value is missing or untrusted. */
export function getTrustedStorageUrl(url) {
  try {
    return assertTrustedDownloadUrl(url)
  } catch {
    return null
  }
}

export function assertTrustedDownloadUrl(url) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!url || typeof url !== 'string') {
    throw new Error('Fișierul nu are o adresă validă.')
  }
  if (!supabaseUrl) {
    throw new Error('Configurația de descărcare nu este disponibilă.')
  }

  let target
  let origin
  try {
    target = new URL(url.trim())
    origin = new URL(supabaseUrl)
  } catch {
    throw new Error('Fișierul nu are o adresă validă.')
  }

  // Triplă verificare anti-SSRF/phishing: forțăm HTTPS, același origin ca Supabase și
  // calea publică de storage. Astfel butoanele de descărcare nu pot fi deturnate spre
  // adrese externe controlate de atacator.
  if (target.protocol !== 'https:') {
    throw new Error('Descărcarea este permisă doar prin HTTPS.')
  }
  if (target.origin !== origin.origin) {
    throw new Error('Descărcarea este permisă doar din spațiul de stocare al platformei.')
  }
  if (!target.pathname.includes('/storage/v1/object/public/')) {
    throw new Error('Descărcarea este permisă doar pentru fișiere publice din stocare.')
  }

  return target.toString()
}

export function getProfilePhotoExtension(fileName) {
  const extension = String(fileName || '').split('.').pop()?.toLowerCase()
  if (!extension || !PROFILE_PHOTO_EXTENSIONS.has(extension)) {
    throw new Error('Poți încărca doar imagini JPG, PNG, WEBP sau GIF.')
  }
  return extension
}
