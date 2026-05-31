import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Sun,
  Moon,
  LayoutDashboard,
  LogOut,
  Crown,
} from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { Button } from './Button'
import { UserAvatar } from './UserAvatar'
import { BrandLogo } from './BrandLogo'

export function Navbar() {
  const navigate = useNavigate()
  const { user, signOut, isAdmin, theme, toggleTheme, isPremium, openPremiumModal } = useAuth()

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-white/95 dark:bg-slate-950/95 transition-all duration-500">
      <div className="container flex h-20 items-center justify-between">
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white shadow-xl shadow-primary/20 group-hover:rotate-3 transition-transform duration-500">
            <BrandLogo className="size-6" />
          </div>
          <div className="hidden sm:block">
            <strong className="block text-lg leading-tight font-black tracking-tighter uppercase text-slate-900 dark:text-white">MathUP</strong>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80">Excelență la Bacalaureat</span>
          </div>
        </motion.div>

        <div className="flex items-center gap-4 sm:gap-8">
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {user && (
              <motion.div
                className="hidden items-center gap-2.5 rounded-lg bg-orange-500/10 px-4 py-2 sm:flex border border-orange-500/20"
                whileHover={{ scale: 1.05 }}
              >
                <Flame className="size-4 text-orange-500 fill-orange-500" />
                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                  {(user?.user_metadata?.streak == null ? 0 : Number(user.user_metadata.streak)) || 0} Zile Foc
                </span>
              </motion.div>
            )}

            <div className="flex items-center gap-1.5 border-l-2 border-border pl-4 sm:pl-8 sm:ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-lg text-slate-600 dark:text-slate-400"
                title={theme === 'dark' ? 'Mod Luminos' : 'Mod Întunecat'}
              >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>

              {user && (
                <>
                  {!isPremium && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openPremiumModal}
                      className="hidden md:flex bg-primary/5 border-primary/20 text-primary hover:bg-primary hover:text-white"
                    >
                      <Crown className="size-4" />
                      Trece la Premium
                    </Button>
                  )}

                  <div className="mx-2 h-8 w-px bg-border hidden sm:block" />

                  <button
                    onClick={() => navigate('/profile')}
                    className="group/avatar relative rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-all p-0.5"
                    title="Profil Academic"
                  >
                    <UserAvatar metadata={user.user_metadata} size="sm" />
                  </button>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin')}
                      className="relative hidden md:flex border-primary/40 text-primary rounded-lg font-black"
                    >
                      <LayoutDashboard className="size-4" />
                      Admin
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="rounded-lg hover:bg-red-500/10 hover:text-red-600 text-slate-600 dark:text-slate-400"
                    title="Deconectare"
                  >
                    <LogOut className="size-5" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </nav>
  )
}
