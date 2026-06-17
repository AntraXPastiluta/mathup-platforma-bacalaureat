import { useEffect, useState } from 'react'
import { getSignedMaterialsUrl, SIGNED_URL_TTL_IMAGE } from '../../services/storageUrlService'

/**
 * Rezolvă o cale/URL din bucket-ul privat `materials` într-un URL semnat, pentru a fi
 * folosit ca `src`/`href`. Întoarce null cât timp se semnează sau dacă semnarea eșuează
 * (apelantul afișează un fallback). Re-semnează când `value` se schimbă.
 */
export function useSignedStorageUrl(value, { expiresIn = SIGNED_URL_TTL_IMAGE } = {}) {
  const [signedUrl, setSignedUrl] = useState(null)

  useEffect(() => {
    let active = true
    // `getSignedMaterialsUrl` întoarce null pentru valori lipsă/invalide; tot setState-ul
    // se face în callback-ul async (nu sincron în effect) ca să nu declanșeze re-randări
    // în cascadă. URL-ul vechi rămâne afișat până se re-semnează — fără flicker.
    getSignedMaterialsUrl(value, { expiresIn }).then((url) => {
      if (active) setSignedUrl(url)
    })
    return () => {
      active = false
    }
  }, [value, expiresIn])

  return signedUrl
}
