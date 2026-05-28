import { assertTrustedDownloadUrl } from './safeUrl'

export async function downloadRemoteFile(url, fileName) {
  const safeUrl = assertTrustedDownloadUrl(url)

  const response = await fetch(safeUrl)
  if (!response.ok) {
    throw new Error('Nu am putut descărca fișierul.')
  }

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
