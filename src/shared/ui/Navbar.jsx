import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  Flame, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  LogOut, 
  Crown,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '../../app/providers/AuthProvider'
import { Button } from './Button'
import { UserAvatar } from './UserAvatar'
import { BrandLogo } from './BrandLogo'

export function Navbar() {
  const navigate = useNavigate()
  const { user, signOut, isAdmin, theme, toggleTheme, isPremium, openPremiumModal } = useAuth()

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-colors duration-500">
      <div className="container flex h-18 items-center justify-between">
        <motion.div 
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => navigate('/dashboard')}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/25 text-white transform group-hover:rotate-6 transition-transform">
            <BrandLogo className="size-6" />
          </div>
          <div>
            <strong className="block text-base leading-tight font-black tracking-tight uppercase text-slate-800 dark:text-white">MathUP</strong>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Performanță construită pas cu pas.</span>
          </div>
        </motion.div>
        
        <div className="flex items-center gap-3 sm:gap-6">
           {user && (
             <motion.div 
               className="hidden items-center gap-2 rounded-full bg-orange-500/10 dark:bg-orange-500/20 px-4 py-1.5 sm:flex border border-orange-500/20"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
             >
                <Flame className="size-4 text-orange-500 fill-orange-500 animate-pulse" />
                <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                  {(user?.user_metadata?.streak == null ? 0 : Number(user.user_metadata.streak)) || 0} ZILE FOC
                </span>
             </motion.div>
           )}
           
           <div className="flex items-center gap-2">
             <Button
               variant="ghost"
               size="icon"
               onClick={toggleTheme}
               className="rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
               title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
             >
               {theme === 'dark' ? <Sun className="size-5 text-yellow-400" /> : <Moon className="size-5 text-slate-600" />}
             </Button>

             {user && !isPremium && (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={openPremiumModal}
                 className="hidden gap-2 rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 md:flex"
               >
                 <Crown className="size-4" />
                 Premium
               </Button>
             )}

             {user && (
               <>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => navigate('/support')}
                   className="rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                   title="Suport"
                 >
                   <MessageCircle className="size-5" />
                 </Button>

                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => navigate('/profile')}
                   className="rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                   title="Profile Settings"
                 >
                   <UserAvatar metadata={user.user_metadata} size="sm" />
                 </Button>

                 {isAdmin && (
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => navigate('/admin')}
                     className="hidden md:flex gap-2 rounded-full border-primary/40 text-primary hover:bg-primary/10 transition-all shadow-sm active:scale-95"
                   >
                     <LayoutDashboard className="size-4" />
                     Admin
                   </Button>
                 )}
                 
                 <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={signOut}
                   className="rounded-full hover:bg-destructive/10 hover:text-destructive group"
                   title="Sign Out"
                 >
                   <LogOut className="size-5 transition-transform group-hover:translate-x-1" />
                 </Button>
               </>
             )}
           </div>
        </div>
      </div>
    </nav>
  )
}
