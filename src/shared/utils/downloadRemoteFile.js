export async function downloadRemoteFile(url, fileName) {
  if (!url) {
    throw new Error('Fișierul nu are o adresă validă.')
  }

  const response = await fetch(url)
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
