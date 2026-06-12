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

/** True when persisted auth should be cleared locally (invalid refresh token, missing user, bad JWT). */
export function isStaleStoredAuthError(error) {
  if (!error) return false
  if (isInvalidRefreshTokenError(error)) return true

  const message = String(error.message || error).toLowerCase()
  const status = Number(error.status ?? error.statusCode)

  return (
    message.includes('user from sub claim')
    || (message.includes('jwt') && message.includes('does not exist'))
    || status === 401
    || status === 403
  )
}
