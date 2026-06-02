import { MessageCircle } from 'lucide-react'

import { motion, useReducedMotion } from 'framer-motion'



export function SupportWidgetLauncher({ open, unreadCount, onToggle }) {

  const reduceMotion = useReducedMotion()



  return (

    <motion.button

      type="button"

      aria-expanded={open}

      aria-label={open ? 'Închide suportul' : 'Deschide suportul'}

      onClick={onToggle}

      className="fixed bottom-5 right-5 z-[110] flex size-[3.25rem] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"

      whileTap={reduceMotion ? undefined : { scale: 0.92 }}

      animate={

        reduceMotion || open || unreadCount === 0

          ? undefined

          : { scale: [1, 1.04, 1] }

      }

      transition={

        reduceMotion

          ? undefined

          : { scale: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }

      }

    >

      <MessageCircle className="size-6" strokeWidth={2} />

      {!open && unreadCount > 0 && (

        <span className="support-chat-launcher-badge absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-background">

          {unreadCount > 9 ? '9+' : unreadCount}

        </span>

      )}

    </motion.button>

  )

}


