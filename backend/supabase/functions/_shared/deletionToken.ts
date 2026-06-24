/**
 * Hash-uire pentru token-ul (OTP) de confirmare a ștergerii contului.
 *
 * Stocăm la rest doar SHA-256 (hex) al codului legat de `userId` (salt implicit per user),
 * niciodată codul în clar. Codul în clar e trimis o singură dată pe email. La confirmare
 * se compară hash-urile (lungime egală → comparație în timp constant păstrată).
 */
export async function hashDeletionToken(code: string, userId: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${userId}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
