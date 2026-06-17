import { useSignedStorageUrl } from '../hooks/useSignedStorageUrl'
import { SIGNED_URL_TTL_DOWNLOAD } from '../../services/storageUrlService'

/**
 * Link „deschide într-un tab nou" către un fișier din bucket-ul privat `materials`.
 * Semnează `value` la randare; cât timp nu e gata link-ul e inactiv (opacitate redusă).
 */
export function SignedFileLink({ value, className = '', title, children }) {
  const href = useSignedStorageUrl(value, { expiresIn: SIGNED_URL_TTL_DOWNLOAD })
  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-disabled={!href}
      className={`${className} ${href ? '' : 'pointer-events-none opacity-60'}`.trim()}
    >
      {children}
    </a>
  )
}
