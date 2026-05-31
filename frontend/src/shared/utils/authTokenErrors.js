/** True when Supabase rejected a stored refresh token (revoked session, env switch, cleared DB). */
export function isInvalidRefreshTokenError(error) {
  if (!error) return false
  const message = String(error.message || error).toLowerCase()
  const code = String(error.code || '').toLowerCase()
  return (
    code === 'refresh_token_not_found'
    || message.includes('invalid refresh token')
    || message.includes('refresh token not found')
  )
}
