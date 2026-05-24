import { motion } from 'framer-motion'
import { useAuth } from '../../../app/providers/AuthProvider'
import { getAdminSectionsForUser } from '../constants'

export function SectionNav({ activeSection, onSelectSection }) {
  const { user } = useAuth()
  const sections = getAdminSectionsForUser(user?.email)
  const gridCols =
    sections.length >= 6
      ? 'lg:grid-cols-6'
      : sections.length >= 5
        ? 'lg:grid-cols-5'
        : 'lg:grid-cols-4'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-12 grid grid-cols-2 md:grid-cols-3 ${gridCols} gap-4`}
    >
      {sections.map((section) => {
        const isActive = activeSection === section.id
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelectSection(section.id)}
            className={`group relative overflow-hidden rounded-3xl p-5 text-left transition-all duration-300 ${
              isActive
                ? 'bg-primary text-white shadow-xl shadow-primary/30 ring-2 ring-primary/40 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
                : 'bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/[0.08] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`p-2.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-white/20 shadow-inner'
                    : 'bg-slate-200/60 dark:bg-white/5 group-hover:bg-primary/10 group-hover:scale-110'
                }`}
              >
                <section.icon
                  className={`size-6 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-700 dark:text-slate-400 group-hover:text-primary'
                  }`}
                />
              </div>
              {isActive ? (
                <div className="size-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
              ) : null}
            </div>
            <div className="space-y-1">
              <h3
                className={`text-sm font-black uppercase tracking-widest leading-none ${
                  isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {section.label}
              </h3>
              <p
                className={`text-[10px] font-bold leading-tight ${
                  isActive ? 'text-white/90' : 'text-slate-500'
                }`}
              >
                {section.description}
              </p>
            </div>
            {isActive ? (
              <div className="absolute -top-12 -right-12 size-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            ) : null}
          </button>
        )
      })}
    </motion.div>
  )
}
