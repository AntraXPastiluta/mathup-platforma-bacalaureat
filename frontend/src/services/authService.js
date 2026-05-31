/**
 * Învelitor peste API-ul de autentificare Supabase: sesiune curentă,
 * înregistrare, login cu parolă, login Google (OAuth), logout și resetarea parolei.
 */
import { supabase } from '../supabaseClient'

export { isInvalidRefreshTokenError } from '../shared/utils/authTokenErrors'

/** Clears local auth storage without requiring a valid refresh token on the server. */
export async function clearStaleAuthSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch (signOutError) {
    console.warn('Local auth cleanup:', signOutError)
  }
}

/** Returnează sesiunea activă (sau null dacă utilizatorul nu este logat). */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Abonează un callback la schimbările de stare ale autentificării (login/logout/refresh). */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}

export async function signUpWithEmail({ name, email, password, emailRedirectTo }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Dacă numele lipsește, folosim „Elev” ca valoare implicită afișată în interfață.
      data: { full_name: name?.trim() || 'Elev' },
      emailRedirectTo,
    },
  })
  if (error) throw error
  return data
}

export async function loginWithPassword({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export function getPasswordResetRedirectUrl() {
  return `${window.location.origin}/reset-password`
}

export async function requestPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getPasswordResetRedirectUrl(),
  })
  if (error) throw error
  return data
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data
}

export function getOAuthRedirectUrl() {
  return `${window.location.origin}/dashboard`
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl(),
      // access_type=offline + prompt=consent forțează Google să emită un refresh
      // token, astfel încât sesiunea să poată fi reînnoită fără re-login.
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw error
  return data
}
