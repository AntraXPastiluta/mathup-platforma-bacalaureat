import { Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { resolvePostAuthRedirect } from '../services/lastLocationService'

export function PublicOnlyRoute({ children }) {
  const { user, authLoading, isAdmin } = useAuth()

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (user) {
    return <Navigate to={resolvePostAuthRedirect({ user, isAdmin, fallback: '/dashboard' })} replace />
  }

  return children
}
