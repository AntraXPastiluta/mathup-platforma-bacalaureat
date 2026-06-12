/**
 * Gărzi de sesiune reutilizabile, folosite de celelalte servicii pentru a impune
 * autentificarea și a împiedica un utilizator să acceseze datele altui cont.
 */
import { supabase } from '../supabaseClient'

/** Returnează utilizatorul autentificat sau aruncă eroare dacă nu există sesiune. */
export async function requireAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user?.id) {
    throw new Error('Trebuie să fii autentificat.')
  }
  return user
}

/** Cere ca apelantul să fie autentificat și să acționeze doar asupra propriului id. */
export async function requireSelfUserId(userId) {
  const user = await requireAuthenticatedUser()
  if (userId && userId !== user.id) {
    throw new Error('Acces neautorizat.')
  }
  return user
}
