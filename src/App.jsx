import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { isMaintenanceMode } from './app/config/maintenance'
import { AuthProvider } from './app/providers/AuthProvider'
import { ProtectedRoute } from './app/ProtectedRoute'
import { AdminRoute } from './app/AdminRoute'
import { WelcomePage } from './features/auth/pages/WelcomePage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ProfilePage } from './features/profile/pages/ProfilePage'
import { LessonPage } from './features/lessons/pages/LessonPage'
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage'
import { RoadmapWorkspacePage } from './features/roadmap/pages/RoadmapWorkspacePage'
import { SolvedVariantsPage } from './features/variants/pages/SolvedVariantsPage'
import { MaintenancePage } from './features/maintenance/pages/MaintenancePage'
import { SupportPage } from './features/support/pages/SupportPage'
import { MathPaperBackground } from './shared/ui/MathPaperBackground'
import { PremiumUpgradeModal } from './shared/ui/PremiumUpgradeModal'

export default function App() {
  if (isMaintenanceMode) {
    return (
      <>
        <MathPaperBackground />
        <Routes>
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="*" element={<Navigate to="/maintenance" replace />} />
        </Routes>
      </>
    )
  }

  return (
    <AuthProvider>
      <MathPaperBackground />
      <PremiumUpgradeModal />
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={(
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/profile"
            element={(
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/support"
            element={(
              <ProtectedRoute>
                <SupportPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/lessons/:lessonId"
            element={(
              <ProtectedRoute>
                <LessonPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/roadmap"
            element={(
              <ProtectedRoute>
                <RoadmapWorkspacePage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/variante-rezolvate"
            element={(
              <ProtectedRoute>
                <SolvedVariantsPage />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin"
            element={(
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}