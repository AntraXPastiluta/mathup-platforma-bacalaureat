import { assertTrustedDownloadUrl } from './safeUrl'

export async function downloadRemoteFile(url, fileName) {
  // Validăm întâi originea (anti-SSRF/phishing) înainte de orice cerere de rețea.
  const safeUrl = assertTrustedDownloadUrl(url)

  const response = await fetch(safeUrl)
  if (!response.ok) {
    throw new Error('Nu am putut descărca fișierul.')
  }

  // Descărcăm prin blob + object URL ca să putem impune un nume de fișier și să forțăm
  // salvarea, în loc ca browserul să navigheze către resursă (ex. PDF deschis în tab).
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName || 'document'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
