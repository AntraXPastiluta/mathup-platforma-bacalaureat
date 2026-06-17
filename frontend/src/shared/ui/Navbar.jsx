import { motion, useReducedMotion } from 'framer-motion'
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
import { utcCalendarDateString } from '../../services/streakService'
import { Button } from './Button'
import { UserAvatar } from './UserAvatar'
import { BrandLogo } from './BrandLogo'

export function Navbar() {
  const navigate = useNavigate()
  const { user, signOut, isAdmin, theme, toggleTheme, isPremium, openPremiumModal } = useAuth()
  const reduceMotion = useReducedMotion()

  const streak = (user?.user_metadata?.streak == null ? 0 : Number(user.user_metadata.streak)) || 0
  // Seria se menține DOAR finalizând o lecție azi (vezi streakService). Dacă elevul
  // n-a îndeplinit cerința azi, flacăra rămâne gri („în pericol”) până când
  // studiază din nou (devine portocalie) sau seria se resetează la 0.
  const streakActiveToday = user?.user_metadata?.last_lesson_activity_date === utcCalendarDateString()

  const cluster = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduceMotion ? 0 : 0.06, delayChildren: 0.04 },
    },
  }
  const item = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: -8 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } },
      }

  return (
    <nav className="app-navbar sticky top-0 z-50 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        {/* Brand */}
        <motion.button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          initial={reduceMotion ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <span className="navbar-brand-tile relative flex size-11 items-center justify-center rounded-xl text-white transition-transform duration-500 group-hover:rotate-[6deg] group-hover:scale-105">
            <BrandLogo className="size-6 drop-shadow" />
          </span>
          <span className="hidden text-left sm:block">
            <strong className="block text-lg font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white">
              Math<span className="text-primary">UP</span>
            </strong>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">
              Excelență la Bacalaureat
            </span>
          </span>
        </motion.button>

        {/* Actions */}
        <motion.div
          className="flex items-center gap-2 sm:gap-3"
          variants={cluster}
          initial="hidden"
          animate="show"
        >
          {user && (
            <motion.div
              variants={item}
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              className={`hidden items-center gap-2 rounded-full px-3.5 py-1.5 sm:flex ${
                streakActiveToday ? 'navbar-streak' : 'border border-border bg-muted/40'
              }`}
              title={
                streakActiveToday
                  ? `Serie de studiu: ${streak} ${streak === 1 ? 'zi' : 'zile'}`
                  : `Serie de studiu: ${streak} ${streak === 1 ? 'zi' : 'zile'} — finalizează o lecție azi ca să o menții`
              }
            >
              <Flame
                className={`size-4 ${
                  streakActiveToday
                    ? 'fill-orange-500 text-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.55)]'
                    : 'text-muted-foreground'
                }`}
              />
              <span
                className={`font-heading text-sm font-extrabold leading-none tabular-nums ${
                  streakActiveToday ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
                }`}
              >
                {streak}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${
                  streakActiveToday ? 'text-orange-600/70 dark:text-orange-400/70' : 'text-muted-foreground/70'
                }`}
              >
                Zile
              </span>
            </motion.div>
          )}

          {user && (
            <motion.span
              variants={item}
              className="hidden h-7 w-px bg-gradient-to-b from-transparent via-border to-transparent sm:block"
              aria-hidden="true"
            />
          )}

          <motion.div variants={item}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full text-slate-600 dark:text-slate-400"
              title={theme === 'dark' ? 'Mod Luminos' : 'Mod Întunecat'}
            >
              <motion.span
                key={theme}
                initial={reduceMotion ? false : { rotate: -90, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="flex"
              >
                {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </motion.span>
            </Button>
          </motion.div>

          {user && (
            <>
              {!isPremium && (
                <motion.div variants={item} className="hidden md:block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openPremiumModal}
                    className="navbar-premium gap-2 rounded-full"
                  >
                    <Crown className="size-4" />
                    Trece la Premium
                  </Button>
                </motion.div>
              )}

              <motion.div variants={item}>
                <button
                  onClick={() => navigate('/profile')}
                  className="group/avatar relative block rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/50"
                  title="Profil Academic"
                >
                  <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary to-indigo-400 opacity-0 transition-opacity duration-300 group-hover/avatar:opacity-100" />
                  <span className="relative block rounded-full p-0.5 ring-2 ring-border transition-colors group-hover/avatar:ring-transparent">
                    <UserAvatar metadata={user.user_metadata} size="sm" />
                  </span>
                  {isPremium && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow ring-2 ring-white dark:ring-slate-950">
                      <Crown className="size-2.5 text-white" />
                    </span>
                  )}
                </button>
              </motion.div>

              {isAdmin && (
                <motion.div variants={item} className="hidden md:block">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin')}
                    className="gap-2 rounded-full border-primary/40 bg-primary/5 font-black text-primary"
                  >
                    <LayoutDashboard className="size-4" />
                    Admin
                  </Button>
                </motion.div>
              )}

              <motion.div variants={item}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="rounded-full text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:text-slate-400"
                  title="Deconectare"
                >
                  <LogOut className="size-5" />
                </Button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </nav>
  )
}
