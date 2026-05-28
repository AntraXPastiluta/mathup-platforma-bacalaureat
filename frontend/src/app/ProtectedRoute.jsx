import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { needsProfileSetup } from '../services/profileService'

export function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (
    needsProfileSetup(user)
    && location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
