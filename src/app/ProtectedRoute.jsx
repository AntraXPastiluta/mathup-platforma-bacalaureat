import { Navigate } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'

export function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth()

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
