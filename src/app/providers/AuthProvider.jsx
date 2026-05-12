import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useMemo,
  useCallback,
} from 'react'
import { supabase } from '../../supabaseClient'
import { requestPasswordReset as sendPasswordResetEmail, updatePassword as applyPasswordUpdate } from '../../services/authService'
import { getPremiumEntitlement, isEntitlementActive, startPremiumCheckout as createCheckout } from '../../services/billingService'
import { normalizeProfile, normalizeProfilesList } from '../../services/profileService'
import {
  streakDecayPatch,
  hasStreakUpdates,
  mergeStreakMetadataForLogin,
} from '../../services/streakService'

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
  const [premiumModalOpen, setPremiumModalOpen] = useState(false)

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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      const nextUser = currentSession?.user ?? null
      setSession(currentSession)
      setUser(nextUser)
      setAuthLoading(false)
      void syncEntitlementForUser(nextUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const nextUser = currentSession?.user ?? null
      setSession(currentSession)
      setUser(nextUser)
      setAuthLoading(false)
      void syncEntitlementForUser(nextUser)
    })

    return () => subscription.unsubscribe()
  }, [syncEntitlementForUser])

  // Reset streak to 0 when a full UTC calendar day passes with no login and no lesson activity
  useEffect(() => {
    if (!user?.id || authLoading) return
    const decay = streakDecayPatch(user.user_metadata || {})
    if (!decay || !hasStreakUpdates(decay)) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.auth.updateUser({ data: decay })
      if (cancelled || error) return
      if (data?.user) setUser(data.user)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, authLoading, user?.user_metadata?.streak, user?.user_metadata?.last_streak_activity_date])

  const refreshEntitlement = useCallback(async () => {
    return syncEntitlementForUser(user)
  }, [syncEntitlementForUser, user])

  const openPremiumModal = useCallback(() => {
    setPremiumModalOpen(true)
  }, [])

  const closePremiumModal = useCallback(() => {
    setPremiumModalOpen(false)
  }, [])

  const isAdmin = user?.email === 'cruceanu.cristian3004@gmail.com'
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
    } catch (error) {
      setErrorMessage(error.message)
      throw error
    } finally {
      setCheckoutLoading(false)
    }
  }, [])

  const register = async ({ email, password, fullName, profile, profiles }) => {
    setLoading(true)
    setErrorMessage('')
    try {
      const list = Array.isArray(profiles) && profiles.length > 0
        ? normalizeProfilesList(profiles)
        : [normalizeProfile(profile)]
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            profile: list[0],
            profiles: list,
          },
        },
      })
      if (error) throw error
      const registeredUser = data.session?.user ?? data.user
      if (registeredUser) {
        const patch = mergeStreakMetadataForLogin(registeredUser.user_metadata || {})
        if (hasStreakUpdates(patch)) {
          const { data: u2, error: streakErr } = await supabase.auth.updateUser({ data: patch })
          if (streakErr) console.warn('Streak update after register:', streakErr)
          else if (u2?.user) setUser(u2.user)
        }
      }
      return data
    } catch (error) {
      setErrorMessage(error.message)
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
      const sessionUser = data.user ?? data.session?.user
      if (sessionUser) {
        const patch = mergeStreakMetadataForLogin(sessionUser.user_metadata || {})
        if (hasStreakUpdates(patch)) {
          const { data: u2, error: streakErr } = await supabase.auth.updateUser({ data: patch })
          if (streakErr) console.warn('Streak update after login:', streakErr)
          else if (u2?.user) setUser(u2.user)
        }
      }
      return data
    } catch (error) {
      setErrorMessage(error.message)
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
      setErrorMessage(error.message)
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
      setErrorMessage(error.message)
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
      setErrorMessage(error.message)
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
      setErrorMessage(error.message)
      throw error
    } finally {
      setProfileSaving(false)
    }
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

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
      setErrorMessage(error.message)
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
    requestPasswordReset,
    resetPassword,
    signOut,
    setProfile,
    updateUserMetadata,
    isAdmin,
    entitlement,
    entitlementLoading,
    isPremium,
    premiumExpiresAt,
    refreshEntitlement,
    checkoutLoading,
    premiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    requirePremium,
    startPremiumCheckout,
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
    requestPasswordReset,
    resetPassword,
    signOut,
    setProfile,
    updateUserMetadata,
    isAdmin,
    entitlement,
    entitlementLoading,
    isPremium,
    premiumExpiresAt,
    refreshEntitlement,
    checkoutLoading,
    premiumModalOpen,
    openPremiumModal,
    closePremiumModal,
    requirePremium,
    startPremiumCheckout,
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
