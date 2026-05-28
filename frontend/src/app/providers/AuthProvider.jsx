import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo,
  useCallback,
} from 'react'
import { supabase } from '../../supabaseClient'
import { requestPasswordReset as sendPasswordResetEmail, updatePassword as applyPasswordUpdate, signInWithGoogle } from '../../services/authService'
import { getPremiumEntitlement, isEntitlementActive, startPremiumCheckout as createCheckout, cancelPremiumSubscription as cancelSubscription } from '../../services/billingService'
import {
  checkCurrentUserIsAdmin,
  checkCurrentUserIsPrimaryAdmin,
  fetchPrimaryAdminEmail,
} from '../../services/curriculumAdminService'
import { normalizeProfile, normalizeProfilesList } from '../../services/profileService'
import {
  streakDecayPatch,
  hasStreakUpdates,
  persistLoginStreakFromSession,
} from '../../services/streakService'
import {
  toAuthLoginError,
  toAuthRegisterError,
  toAuthOAuthError,
  toAuthResetPasswordError,
  toAuthResetRequestError,
  toCheckoutError,
  toCancelPremiumError,
  toUserFacingError,
  USER_MESSAGES,
} from '../../shared/utils/userFacingError'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [entitlement, setEntitlement] = useState(null)
  const [entitlementLoading, setEntitlementLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cancelPremiumLoading, setCancelPremiumLoading] = useState(false)
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false)
  const [primaryAdminEmail, setPrimaryAdminEmail] = useState(null)
  const [adminLoading, setAdminLoading] = useState(true)

  const applySessionLoginStreak = useCallback(async (sessionUser) => {
    if (!sessionUser?.id) return sessionUser
    try {
      const updated = await persistLoginStreakFromSession()
      return updated ?? sessionUser
    } catch (streakError) {
      console.warn('Streak update on session:', streakError)
      return sessionUser
    }
  }, [])

  /** Deferred to avoid Supabase auth deadlocks when called from onAuthStateChange. */
  const scheduleLoginStreakUpdate = useCallback((sessionUser) => {
    if (!sessionUser?.id) return
    setTimeout(() => {
      void (async () => {
        const updated = await applySessionLoginStreak(sessionUser)
        if (updated?.id) setUser(updated)
      })()
    }, 0)
  }, [applySessionLoginStreak])

  const syncAdminForUser = useCallback(async (nextUser) => {
    if (!nextUser?.email) {
      setIsAdmin(false)
      setIsPrimaryAdmin(false)
      setPrimaryAdminEmail(null)
      setAdminLoading(false)
      return false
    }

    setAdminLoading(true)
    try {
      const isAdminUser = await checkCurrentUserIsAdmin()
      setIsAdmin(isAdminUser)

      if (!isAdminUser) {
        setIsPrimaryAdmin(false)
        setPrimaryAdminEmail(null)
        return false
      }

      const [isPrimaryUser, primaryEmail] = await Promise.all([
        checkCurrentUserIsPrimaryAdmin(),
        fetchPrimaryAdminEmail().catch(() => null),
      ])
      setIsPrimaryAdmin(isPrimaryUser)
      setPrimaryAdminEmail(primaryEmail)
      return isAdminUser
    } catch (error) {
      console.warn('Admin access refresh failed:', error)
      setIsAdmin(false)
      setIsPrimaryAdmin(false)
      setPrimaryAdminEmail(null)
      return false
    } finally {
      setAdminLoading(false)
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const syncEntitlementForUser = useCallback(async (nextUser) => {
    const userId = nextUser?.id
    if (!userId) {
      setEntitlement(null)
      setEntitlementLoading(false)
      return null
    }

    setEntitlementLoading(true)
    try {
      const row = await getPremiumEntitlement(userId)
      setEntitlement(row)
      return row
    } catch (error) {
      console.warn('Premium entitlement refresh failed:', error)
      setEntitlement(null)
      return null
    } finally {
      setEntitlementLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const syncSessionState = async () => {
      const { data: { user: verifiedUser }, error } = await supabase.auth.getUser()
      if (!mounted) return

      if (error || !verifiedUser) {
        setUser(null)
        setSession(null)
        setAuthLoading(false)
        setEntitlement(null)
        setEntitlementLoading(false)
        setIsAdmin(false)
        setIsPrimaryAdmin(false)
        setPrimaryAdminEmail(null)
        setAdminLoading(false)
        return
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(currentSession)
      setUser(verifiedUser)
      setAuthLoading(false)
      scheduleLoginStreakUpdate(verifiedUser)
      void syncEntitlementForUser(verifiedUser)
      void syncAdminForUser(verifiedUser)
    }

    void syncSessionState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return
      const nextUser = currentSession?.user ?? null
      setSession(currentSession)
      setUser(nextUser)
      setAuthLoading(false)
      if (
        nextUser
        && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')
      ) {
        scheduleLoginStreakUpdate(nextUser)
      }
      if (nextUser) {
        void syncEntitlementForUser(nextUser)
        void syncAdminForUser(nextUser)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncEntitlementForUser, syncAdminForUser, scheduleLoginStreakUpdate])

  // Reset streak to 0 when a full UTC calendar day passes with no login and no lesson activity
  useEffect(() => {
    if (!user?.id || authLoading) return
    const decay = streakDecayPatch(user.user_metadata || {})
    if (!decay || !hasStreakUpdates(decay)) return
    let cancelled = false
    const timer = setTimeout(() => {
      void (async () => {
        const { data, error } = await supabase.auth.updateUser({ data: decay })
        if (cancelled || error) return
        if (data?.user) setUser(data.user)
      })()
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [user?.id, authLoading, user?.user_metadata?.streak, user?.user_metadata?.last_streak_activity_date])

  const refreshEntitlement = useCallback(async () => {
    return syncEntitlementForUser(user)
  }, [syncEntitlementForUser, user])

  const refreshAdminAccess = useCallback(async () => {
    return syncAdminForUser(user)
  }, [syncAdminForUser, user])

  const openPremiumModal = useCallback(() => {
    setPremiumModalOpen(true)
  }, [])

  const closePremiumModal = useCallback(() => {
    setPremiumModalOpen(false)
  }, [])

  const isPremium = isEntitlementActive(entitlement) || isAdmin
  const premiumExpiresAt = entitlement?.expires_at ?? null

  const requirePremium = useCallback((action) => {
    if (isPremium) {
      return action?.()
    }
    setPremiumModalOpen(true)
    return false
  }, [isPremium])

  const startPremiumCheckout = useCallback(async () => {
    setCheckoutLoading(true)
    setErrorMessage('')
    try {
      await createCheckout()
      // Keep loading true until Stripe redirect — avoids a flash re-render before navigation.
    } catch (error) {
      setCheckoutLoading(false)
      setErrorMessage(toCheckoutError(error))
      setPremiumModalOpen(true)
      throw error
    }
  }, [])

  const cancelPremiumSubscription = useCallback(async () => {
    setCancelPremiumLoading(true)
    setErrorMessage('')
    try {
      const result = await cancelSubscription()
      await syncEntitlementForUser(user)
      setSuccessMessage(
        result?.message || 'Abonamentul Premium se anulează la sfârșitul perioadei curente.',
      )
      return result
    } catch (error) {
      setErrorMessage(toCancelPremiumError(error))
      throw error
    } finally {
      setCancelPremiumLoading(false)
    }
  }, [syncEntitlementForUser, user])

  const register = async ({ email, password, fullName, profile, profiles, legalConsent }) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const list = Array.isArray(profiles) && profiles.length > 0
        ? normalizeProfilesList(profiles)
        : [normalizeProfile(profile)]
      const metadata = {
        full_name: fullName,
        profile: list[0],
        profiles: list,
      }
      if (legalConsent?.acceptedAt && legalConsent?.version) {
        metadata.terms_accepted_at = legalConsent.acceptedAt
        metadata.privacy_accepted_at = legalConsent.acceptedAt
        metadata.legal_docs_version = legalConsent.version
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      })
      if (error) throw error
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setAuthLoading(false)
      }
      return data
    } catch (error) {
      setErrorMessage(toAuthRegisterError(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const login = async ({ email, password }) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setAuthLoading(false)
      }
      return data
    } catch (error) {
      setErrorMessage(toAuthLoginError(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setErrorMessage(toAuthOAuthError(error))
      setLoading(false)
      throw error
    }
  }

  const completeOAuthProfile = async ({ fullName, profile, profiles, legalConsent }) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const list = Array.isArray(profiles) && profiles.length > 0
        ? normalizeProfilesList(profiles)
        : [normalizeProfile(profile)]
      const metadata = {
        profile: list[0],
        profiles: list,
      }
      if (fullName?.trim()) {
        metadata.full_name = fullName.trim()
      }
      if (legalConsent?.acceptedAt && legalConsent?.version) {
        metadata.terms_accepted_at = legalConsent.acceptedAt
        metadata.privacy_accepted_at = legalConsent.acceptedAt
        metadata.legal_docs_version = legalConsent.version
      }
      const { data, error } = await supabase.auth.updateUser({ data: metadata })
      if (error) throw error
      if (data.user) {
        setUser(data.user)
      }
      return data
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.save))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const requestPasswordReset = async ({ email }) => {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await sendPasswordResetEmail(email)
      setSuccessMessage('Dacă există un cont asociat acestui email, vei primi un link de resetare în câteva minute.')
    } catch (error) {
      setErrorMessage(toAuthResetRequestError(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async ({ password }) => {
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const data = await applyPasswordUpdate(password)
      setSuccessMessage('Parola a fost actualizată cu succes.')
      return data
    } catch (error) {
      setErrorMessage(toAuthResetPasswordError(error))
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.generic))
    } finally {
      setLoading(false)
    }
  }

  const setProfile = async (profileKey) => {
    if (!user) return
    setProfileSaving(true)
    setErrorMessage('')
    try {
      const safe = normalizeProfile(profileKey)
      const { data, error } = await supabase.auth.updateUser({
        data: { profile: safe, profiles: [safe] },
      })
      if (error) throw error
      setUser(data.user)
      setSuccessMessage('Profilul a fost actualizat cu succes!')
      return data.user
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.save))
      throw error
    } finally {
      setProfileSaving(false)
    }
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const refreshSessionUser = useCallback(async () => {
    const { data: { user: nextUser }, error } = await supabase.auth.getUser()
    if (error || !nextUser) return null
    setUser(nextUser)
    return nextUser
  }, [])

  const updateUserMetadata = async (updates) => {
    if (!user) return
    setProfileSaving(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      })
      if (error) throw error
      setUser(data.user)
      setSuccessMessage('Datele au fost actualizate!')
      return data.user
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.save))
      throw error
    } finally {
      setProfileSaving(false)
    }
  }

  const contextValue = useMemo(() => ({
    user,
    session,
    authLoading,
    loading,
    errorMessage,
    successMessage,
    profileSaving,
    theme,
    toggleTheme,
    setErrorMessage,
    setSuccessMessage,
    register,
    login,
    loginWithGoogle,
    completeOAuthProfile,
    requestPasswordReset,
    resetPassword,
    signOut,
    setProfile,
    updateUserMetadata,
    refreshSessionUser,
    isAdmin,
    isPrimaryAdmin,
    primaryAdminEmail,
    adminLoading,
    refreshAdminAccess,
    entitlement,
    entitlementLoading,
    isPremium,
    premiumExpiresAt,
    refreshEntitlement,
    checkoutLoading,
    cancelPremiumLoading,
    premiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    requirePremium,
    startPremiumCheckout,
    cancelPremiumSubscription,
  }), [
    user,
    session,
    authLoading,
    loading,
    errorMessage,
    successMessage,
    profileSaving,
    theme,
    register,
    login,
    loginWithGoogle,
    completeOAuthProfile,
    requestPasswordReset,
    resetPassword,
    signOut,
    setProfile,
    updateUserMetadata,
    refreshSessionUser,
    isAdmin,
    isPrimaryAdmin,
    primaryAdminEmail,
    adminLoading,
    refreshAdminAccess,
    entitlement,
    entitlementLoading,
    isPremium,
    premiumExpiresAt,
    refreshEntitlement,
    checkoutLoading,
    cancelPremiumLoading,
    premiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    requirePremium,
    startPremiumCheckout,
    cancelPremiumSubscription,
  ])

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
