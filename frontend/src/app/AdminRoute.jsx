import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { savePendingPostAuthRedirect } from '../services/lastLocationService'
import { ForbiddenPage } from '../features/forbidden/pages/ForbiddenPage'

export function AdminRoute({ children }) {
  const { user, session, isAdmin, authLoading, adminLoading } = useAuth()
  const location = useLocation()

  if (authLoading || adminLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user || !session?.access_token) {
    savePendingPostAuthRedirect(location, { allowAdmin: true })
    return <Navigate to="/login" replace />
  }

  // Utilizator autentificat, dar fără rol de admin: zona îi este interzisă (403),
  // nu inexistentă — îi arătăm pagina dedicată în loc de un redirect tăcut.
  if (!isAdmin) {
    return <ForbiddenPage />
  }

  return children
}
