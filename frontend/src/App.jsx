import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'
import { AuthProvider } from './app/providers/AuthProvider'
import { MaintenanceModeProvider, useMaintenanceMode } from './app/providers/MaintenanceModeProvider'
import { ProtectedRoute } from './app/ProtectedRoute'
import { AdminRoute } from './app/AdminRoute'
import { WelcomePage } from './features/auth/pages/WelcomePage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { OAuthOnboardingPage } from './features/auth/pages/OAuthOnboardingPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ProfilePage } from './features/profile/pages/ProfilePage'
import { LessonPage } from './features/lessons/pages/LessonPage'
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage'
import { RoadmapWorkspacePage } from './features/roadmap/pages/RoadmapWorkspacePage'
import { SolvedVariantsPage } from './features/variants/pages/SolvedVariantsPage'
import { MaintenancePage } from './features/maintenance/pages/MaintenancePage'
import { SupportPage } from './features/support/pages/SupportPage'
import { TermsPage } from './features/legal/pages/TermsPage'
import { PrivacyPage } from './features/legal/pages/PrivacyPage'
import { MathPaperBackground } from './shared/ui/MathPaperBackground'
import { PremiumUpgradeModal } from './shared/ui/PremiumUpgradeModal'

function MaintenanceRoutes() {
  return (
    <Routes>
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={(
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/maintenance" replace />} />
    </Routes>
  )
}

function NormalRoutes() {
  const location = useLocation()

  return (
    <div className="app-shell">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <Routes location={location}>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/termeni-si-conditii" element={<TermsPage />} />
            <Route path="/politica-de-confidentialitate" element={<PrivacyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/complete-profile"
              element={(
                <ProtectedRoute>
                  <OAuthOnboardingPage />
                </ProtectedRoute>
              )}
            />
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
            <Route path="/maintenance" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function AppRoutes() {
  const { ready, enabled } = useMaintenanceMode()

  // Fail-open: show normal app until we know maintenance is on (avoids blank screen).
  if (ready && enabled) {
    return <MaintenanceRoutes />
  }

  return <NormalRoutes />
}

export default function App() {
  return (
    <MaintenanceModeProvider>
      <AuthProvider>
        <MathPaperBackground />
        <PremiumUpgradeModal />
        <AppRoutes />
      </AuthProvider>
    </MaintenanceModeProvider>
  )
}
