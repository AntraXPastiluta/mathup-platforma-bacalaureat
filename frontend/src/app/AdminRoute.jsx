import { Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'

export function AdminRoute({ children }) {
  const { user, isAdmin, authLoading, adminLoading } = useAuth()

  if (authLoading || adminLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
