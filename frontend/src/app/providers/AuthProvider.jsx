import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo,
  useCallback,
} from 'react'
import {
  supabase,
  ensureAuthBootstrap,
  resetAuthBootstrap,
  startSessionAutoRefresh,
  stopSessionAutoRefresh,
} from '../../supabaseClient'
import {
  requestPasswordReset as sendPasswordResetEmail,
  updatePassword as applyPasswordUpdate,
  signInWithGoogle,
} from '../../services/authService'
import { getPremiumEntitlement, isEntitlementActive, startPremiumCheckout as createCheckout, cancelPremiumSubscription as cancelSubscription } from '../../services/billingService'
import {
  checkCurrentUserIsAdmin,
  checkCurrentUserIsPrimaryAdmin,
  fetchPrimaryAdminEmail,
} from '../../services/curriculumAdminService'
import { normalizeProfile, normalizeProfilesList, syncEnrolledProfiles } from '../../services/profileService'
import {
  streakDecayPatch,
  hasStreakUpdates,
  persistLoginStreakFromSession,
} from '../../services/streakService'
import { clearPendingPostAuthRedirect } from '../../services/lastLocationService'
import { clearPendingAccountDeletionSession } from '../../services/accountDeletionService'
import { readAuthCache, writeAuthCache, clearAuthCache } from '../../services/authSessionCache'
import { setSessionCookie, clearSessionCookie, hasSessionCookie } from '../../shared/utils/sessionCookie'
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

  /** Amânat cu setTimeout pentru a evita blocajele (deadlock) din clientul Supabase
   *  atunci când apelăm metode auth direct din callback-ul onAuthStateChange. */
  const scheduleLoginStreakUpdate = useCallback((sessionUser) => {
    if (!sessionUser?.id) return
    setTimeout(() => {
      void (async () => {
        const updated = await applySessionLoginStreak(sessionUser)
        if (updated?.id) setUser(updated)
      })()
    }, 0)
  }, [applySessionLoginStreak])

  // Afișează imediat starea premium/admin din cache (localStorage), astfel încât UI-ul
  // să nu „pâlpâie” cât timp se reconfirmă datele cu serverul în fundal.
  const applyCachedAuthState = useCallback((userId) => {
    const cached = readAuthCache(userId)
    if (!cached) return false

    if (cached.entitlement !== undefined) {
      setEntitlement(cached.entitlement)
      setEntitlementLoading(false)
    }
    if (cached.admin) {
      setIsAdmin(cached.admin.isAdmin)
      setIsPrimaryAdmin(cached.admin.isPrimaryAdmin)
      setPrimaryAdminEmail(cached.admin.primaryAdminEmail)
      setAdminLoading(false)
    }
    return cached.entitlement !== undefined || cached.admin !== null
  }, [])

  const clearAuthSessionArtifacts = useCallback(() => {
    clearAuthCache()
    clearSessionCookie()
    setEntitlement(null)
    setEntitlementLoading(false)
    setIsAdmin(false)
    setIsPrimaryAdmin(false)
    setPrimaryAdminEmail(null)
    setAdminLoading(false)
  }, [])

  // `silent: true` reîmprospătează statutul de admin în fundal fără a aprinde spinnerul
  // de încărcare, atunci când avem deja o valoare validă în cache.
  const syncAdminForUser = useCallback(async (nextUser, options = {}) => {
    const silent = Boolean(options.silent)
    if (!nextUser?.email) {
      setIsAdmin(false)
      setIsPrimaryAdmin(false)
      setPrimaryAdminEmail(null)
      setAdminLoading(false)
      if (nextUser?.id) {
        writeAuthCache(nextUser.id, {
          admin: { isAdmin: false, isPrimaryAdmin: false, primaryAdminEmail: null },
        })
      }
      return false
    }

    const cachedAdmin = silent ? readAuthCache(nextUser.id)?.admin : null
    if (!silent || !cachedAdmin) {
      setAdminLoading(true)
    }

    try {
      const isAdminUser = await checkCurrentUserIsAdmin()
      setIsAdmin(isAdminUser)

      if (!isAdminUser) {
        setIsPrimaryAdmin(false)
        setPrimaryAdminEmail(null)
        writeAuthCache(nextUser.id, {
          admin: { isAdmin: false, isPrimaryAdmin: false, primaryAdminEmail: null },
        })
        return false
      }

      const [isPrimaryUser, primaryEmail] = await Promise.all([
        checkCurrentUserIsPrimaryAdmin(),
        fetchPrimaryAdminEmail().catch(() => null),
      ])
      setIsPrimaryAdmin(isPrimaryUser)
      setPrimaryAdminEmail(primaryEmail)
      writeAuthCache(nextUser.id, {
        admin: {
          isAdmin: isAdminUser,
          isPrimaryAdmin: isPrimaryUser,
          primaryAdminEmail: primaryEmail,
        },
      })
      return isAdminUser
    } catch (error) {
      console.warn('Admin access refresh failed:', error)
      if (!cachedAdmin) {
        setIsAdmin(false)
        setIsPrimaryAdmin(false)
        setPrimaryAdminEmail(null)
      }
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

  // Realtime subscriptions respect Row Level Security only when the socket knows
  // the user's JWT. Keep it in sync with the current session (and clear it on
  // sign-out) so postgres_changes deliver exactly the rows the user may read.
  useEffect(() => {
    const token = session?.access_token ?? null
    try {
      supabase.realtime.setAuth(token)
    } catch (realtimeAuthError) {
      console.warn('Realtime auth sync failed:', realtimeAuthError)
    }
  }, [session?.access_token])

  const syncEntitlementForUser = useCallback(async (nextUser, options = {}) => {
    const userId = nextUser?.id
    const silent = Boolean(options.silent)
    if (!userId) {
      setEntitlement(null)
      setEntitlementLoading(false)
      return null
    }

    const cachedEntitlement = silent ? readAuthCache(userId)?.entitlement : undefined
    const hasCachedEntitlement = silent && cachedEntitlement !== undefined
    if (!hasCachedEntitlement) {
      setEntitlementLoading(true)
    }

    try {
      const row = await getPremiumEntitlement(userId)
      setEntitlement(row)
      writeAuthCache(userId, { entitlement: row })
      return row
    } catch (error) {
      console.warn('Premium entitlement refresh failed:', error)
      if (!hasCachedEntitlement) {
        setEntitlement(null)
      }
      return null
    } finally {
      setEntitlementLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Bootstrap-ul validează JWT-ul înainte de auto-refresh și înainte de fetch-uri protejate RLS.
    const syncSessionState = async () => {
      const { user: verifiedUser, session: currentSession } = await ensureAuthBootstrap()
      if (!mounted) return

      if (!verifiedUser || !currentSession) {
        stopSessionAutoRefresh()
        setUser(null)
        setSession(null)
        setAuthLoading(false)
        clearAuthSessionArtifacts()
        return
      }

      setSession(currentSession)
      setUser(verifiedUser)
      applyCachedAuthState(verifiedUser.id)
      setAuthLoading(false)

      if (!hasSessionCookie()) {
        setSessionCookie()
      }

      scheduleLoginStreakUpdate(verifiedUser)
      void syncEntitlementForUser(verifiedUser, { silent: true })
      void syncAdminForUser(verifiedUser, { silent: true })
    }

    void syncSessionState()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return
      const nextUser = currentSession?.user ?? null

      // Bootstrap-ul inițial e gestionat de syncSessionState (cu getUser înainte de side-effects).
      if (event === 'INITIAL_SESSION') {
        return
      }

      // La reîmprospătarea token-ului doar actualizăm sesiunea; utilizatorul nu s-a
      // schimbat, deci evităm reîncărcarea inutilă a datelor de premium/admin.
      if (event === 'TOKEN_REFRESHED') {
        if (!currentSession?.access_token) {
          stopSessionAutoRefresh()
          resetAuthBootstrap()
          setSession(null)
          setUser(null)
          setAuthLoading(false)
          clearAuthSessionArtifacts()
          return
        }
        setSession(currentSession)
        setAuthLoading(false)
        return
      }

      if (event === 'SIGNED_OUT' || !nextUser) {
        stopSessionAutoRefresh()
        resetAuthBootstrap()
        setSession(null)
        setUser(null)
        setAuthLoading(false)
        clearAuthSessionArtifacts()
        return
      }

      startSessionAutoRefresh()
      setSession(currentSession)
      setUser(nextUser)
      setAuthLoading(false)

      if (!hasSessionCookie()) {
        setSessionCookie()
      }

      if (event === 'USER_UPDATED') {
        return
      }

      if (event === 'SIGNED_IN') {
        applyCachedAuthState(nextUser.id)
        scheduleLoginStreakUpdate(nextUser)
        void syncEntitlementForUser(nextUser, { silent: true })
        void syncAdminForUser(nextUser, { silent: true })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [
    syncEntitlementForUser,
    syncAdminForUser,
    scheduleLoginStreakUpdate,
    applyCachedAuthState,
    clearAuthSessionArtifacts,
  ])

  // Resetează seria (streak) la 0 când trece o zi calendaristică UTC completă fără
  // autentificare și fără activitate la lecții.
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
  }, [user?.id, authLoading, user?.user_metadata])

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
      // Lăsăm intenționat loading=true până la redirect-ul către Stripe, ca să nu apară
      // o re-randare scurtă a butonului chiar înainte de navigare.
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

  const register = useCallback(async ({ email, password, fullName, profile, profiles, legalConsent }) => {
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
        startSessionAutoRefresh()
        resetAuthBootstrap()
        setSession(data.session)
        setUser(data.session.user)
        setAuthLoading(false)
        await syncEnrolledProfiles(list)
      }
      return data
    } catch (error) {
      setErrorMessage(toAuthRegisterError(error))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      if (data.session) {
        startSessionAutoRefresh()
        resetAuthBootstrap()
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
  }, [])

  const loginWithGoogle = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setErrorMessage(toAuthOAuthError(error))
      setLoading(false)
      throw error
    }
  }, [])

  const completeOAuthProfile = useCallback(async ({ fullName, profile, profiles, legalConsent }) => {
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
      await syncEnrolledProfiles(list)
      return data
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.save))
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const requestPasswordReset = useCallback(async ({ email }) => {
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
  }, [])

  const resetPassword = useCallback(async ({ password }) => {
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
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      stopSessionAutoRefresh()
      resetAuthBootstrap()
    } catch (error) {
      setErrorMessage(toUserFacingError(error, USER_MESSAGES.generic))
    } finally {
      setLoading(false)
    }
  }, [])

  const signOutAfterAccountDeletion = useCallback(async () => {
    clearPendingAccountDeletionSession()
    clearPendingPostAuthRedirect()
    localStorage.removeItem('remember_email')

    setUser(null)
    setSession(null)
    clearAuthSessionArtifacts()
    setPremiumModalOpen(false)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (error) {
      console.warn('Sign out after account deletion:', error)
    }
  }, [clearAuthSessionArtifacts])

  const setProfile = useCallback(async (profileKey) => {
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
  }, [user])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const refreshSessionUser = useCallback(async () => {
    const { data: { user: nextUser }, error } = await supabase.auth.getUser()
    if (error || !nextUser) return null
    setUser(nextUser)
    return nextUser
  }, [])

  const updateUserMetadata = useCallback(async (updates, options = {}) => {
    if (!user) return
    // Salvarea ultimei locații se face „silentios” (fără spinner / mesaj de succes),
    // pentru că e o actualizare automată de fundal, nu o acțiune cerută de utilizator.
    const updateKeys = Object.keys(updates || {})
    const onlyLastLocation = updateKeys.length === 1 && updateKeys[0] === 'last_location'
    const silent = Boolean(options.silent) || onlyLastLocation
    if (!silent) {
      setProfileSaving(true)
      setErrorMessage('')
    }
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      })
      if (error) throw error
      setUser(data.user)

      const profileKeys = updates?.profiles ?? (updates?.profile ? [updates.profile] : null)
      if (profileKeys) {
        await syncEnrolledProfiles(profileKeys)
      }

      if (!silent) {
        setSuccessMessage('Datele au fost actualizate!')
      }
      return data.user
    } catch (error) {
      if (!silent) {
        setErrorMessage(toUserFacingError(error, USER_MESSAGES.save))
      }
      throw error
    } finally {
      if (!silent) {
        setProfileSaving(false)
      }
    }
  }, [user])

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
    signOutAfterAccountDeletion,
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
    signOutAfterAccountDeletion,
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
