import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { savePendingPostAuthRedirect } from '../services/lastLocationService'

export function AdminRoute({ children }) {
  const { user, isAdmin, authLoading, adminLoading } = useAuth()
  const location = useLocation()

  if (authLoading || adminLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user) {
    savePendingPostAuthRedirect(location, { allowAdmin: true })
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
