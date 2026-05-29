/**
 * Încărcarea fotografiei de profil în storage. Validează tipul (doar imagini) și
 * dimensiunea, și nu permite încărcarea pentru alt cont decât cel autentificat.
 */
import { supabase } from '../supabaseClient'
import { getProfilePhotoExtension } from '../shared/utils/safeUrl'

const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024

/**
 * Încarcă fotografia de profil și returnează URL-ul public al imaginii.
 *
 * @param {File} file - Imaginea selectată.
 * @param {string} [userId] - Verificat opțional contra contului logat.
 */
export async function uploadProfilePhoto(file, userId) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Poți încărca doar imagini pentru fotografia de profil.')
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error('Fotografia de profil trebuie să fie de cel mult 5 MB.')
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user?.id) {
    throw new Error('Trebuie să fii autentificat pentru a încărca o fotografie.')
  }
  if (userId && userId !== user.id) {
    throw new Error('Nu poți încărca o fotografie pentru alt cont.')
  }

  // Stocăm fișierul sub un folder per utilizator, cu nume aleator, ca să evităm
  // coliziunile și să simplificăm regulile de acces din storage.
  const fileExt = getProfilePhotoExtension(file.name)
  const filePath = `profile-photos/${user.id}/${crypto.randomUUID()}.${fileExt}`

  const { error } = await supabase.storage
    .from('materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data } = supabase.storage.from('materials').getPublicUrl(filePath)
  return data.publicUrl
}
