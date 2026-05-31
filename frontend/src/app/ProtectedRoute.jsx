import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './providers/AuthProvider'
import { needsProfileSetup } from '../services/profileService'
import { savePendingPostAuthRedirect } from '../services/lastLocationService'

export function ProtectedRoute({ children }) {
  const { user, session, authLoading } = useAuth()
  const location = useLocation()

  if (authLoading) {
    return <div className="page-message">Se incarca sesiunea...</div>
  }

  if (!user || !session?.access_token) {
    // Reținem ruta cerută ca, după autentificare, să-l ducem pe utilizator direct acolo
    // în loc de pagina implicită.
    savePendingPostAuthRedirect(location)
    return <Navigate to="/login" replace />
  }

  // Conturile noi (ex. OAuth) trebuie să-și completeze profilul înainte de a accesa
  // restul aplicației; permitem totuși ruta de completare ca să nu intrăm în buclă.

  if (
    needsProfileSetup(user)
    && location.pathname !== '/complete-profile'
  ) {
    return <Navigate to="/complete-profile" replace />
  }

  return children
}
