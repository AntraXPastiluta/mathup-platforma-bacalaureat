import { useSignedStorageUrl } from '../hooks/useSignedStorageUrl'

/**
 * <img> pentru o imagine din bucket-ul privat `materials`. Primește calea/URL-ul salvat
 * (`value`), îl semnează la randare și afișează imaginea doar când URL-ul semnat e gata.
 * Cât timp se semnează (sau dacă eșuează) randează `fallback` (implicit nimic).
 */
export function SignedStorageImage({ value, alt = '', className = '', fallback = null, ...rest }) {
  const src = useSignedStorageUrl(value)
  if (!src) return fallback
  return <img src={src} alt={alt} className={className} {...rest} />
}
