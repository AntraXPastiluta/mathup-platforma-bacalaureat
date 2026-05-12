import { Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'

export function AdminRoute({ children }) {
  const { user, isAdmin, authLoading } = useAuth()

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
