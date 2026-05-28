import { supabase } from '../supabaseClient'

export async function requireAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user?.id) {
    throw new Error('Trebuie să fii autentificat.')
  }
  return user
}

/** Ensures the caller is authenticated and may only act on their own user id. */
export async function requireSelfUserId(userId) {
  const user = await requireAuthenticatedUser()
  if (userId && userId !== user.id) {
    throw new Error('Acces neautorizat.')
  }
  return user
}
