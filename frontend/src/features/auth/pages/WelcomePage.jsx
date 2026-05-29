import { motion } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { Moon, Sun, BookOpen, GraduationCap, Trophy } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useAuth } from '../../../app/providers/AuthProvider'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { DashboardAmbient } from '../../dashboard/components/DashboardAmbient'

const benefits = [
  { 
    title: 'Planuri de studiu ghidate', 
    description: 'Calendar academic structurat cu obiective clare pentru fiecare săptămână de pregătire.',
    icon: <BookOpen className="size-6" />
  },
  { 
    title: 'Variante deja rezolvate', 
    description: 'Acces la variante de examen BAC cu rezolvări complete, publicate de profesori pentru programul tău liceal.',
    icon: <Trophy className="size-6" />
  },
  { 
    title: 'Lecții concise', 
    description: 'Conținut optimizat și structurat pe competențe cheie, facilitând o învățare rapidă și logică.',
    icon: <GraduationCap className="size-6" />
  },
]

export function WelcomePage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAuth()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground transition-colors duration-500">
      <MathRainCurtain />
      <div className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
        <div className="relative h-full w-full">
          <DashboardAmbient />
          <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
        </div>
      </div>

      <div className="page-ambient-content">
      {/* Scholar Navbar */}
      <nav className="sticky top-0 z-50 border-b-2 border-border bg-background/95">
        <div className="container flex h-20 items-center justify-between">
          <motion.div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white shadow-xl shadow-primary/20 transform group-hover:rotate-3 transition-transform duration-500">
              <BrandLogo className="size-6" />
            </div>
            <div>
              <strong className="block text-lg leading-tight font-black tracking-tighter uppercase">MathUP</strong>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-80">Excelență Academică</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-4 sm:gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
             <Button
               variant="ghost"
               size="icon"
               onClick={toggleTheme}
               className="rounded-lg text-slate-800 dark:text-slate-100"
             >
               {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
             </Button>
             <div className="hidden sm:block h-8 w-px bg-border" />
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => navigate('/login')}
               className="text-slate-800 dark:text-slate-100"
             >
               Autentificare
             </Button>
             <Button 
               size="sm" 
               onClick={() => navigate('/register')}
               className="shadow-lg shadow-primary/20"
             >
               Înregistrare
             </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 lg:pt-40 lg:pb-36">
        <div className="container relative z-10">
          <motion.div 
            className="flex flex-col items-center text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-3 rounded-full bg-primary/5 px-6 py-2 border-2 border-primary/20 mb-10"
            >
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
                Portal Academic pentru Matematică
              </span>
            </motion.div>
            
            <motion.h1
              variants={itemVariants}
              className="max-w-5xl text-6xl font-black tracking-tighter sm:text-9xl leading-[0.9]"
            >
              Excelența <br />
              <span className="text-primary">Construită</span> Pas cu Pas.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-10 max-w-2xl text-lg text-slate-500 dark:text-slate-400 sm:text-xl font-medium leading-relaxed uppercase tracking-wide"
            >
              O experiență de învățare disciplinată, structurată pe competențe academice 
              pentru succes garantat la examenul de Bacalaureat.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-14 flex flex-col gap-6 sm:flex-row"
            >
              <Button size="lg" className="rounded-xl px-12 h-14 text-sm shadow-2xl shadow-primary/30" onClick={() => navigate('/register')}>
                Începe Pregătirea
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl px-12 h-14 text-sm" onClick={() => navigate('/login')}>
                Portal Elev
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-32 border-y-2 border-border">
        <div className="container">
          <motion.div 
            className="grid gap-12 md:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {benefits.map((benefit) => (
              <motion.div
                key={benefit.title}
                className="group relative flex flex-col rounded-2xl border-2 border-border bg-white dark:bg-slate-900 p-10 hover:border-primary transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5"
                variants={itemVariants}
              >
                <div className="mb-8 inline-flex size-16 items-center justify-center rounded-xl bg-primary text-white shadow-xl shadow-primary/20 transform group-hover:scale-110 transition-transform duration-500">
                  {benefit.icon}
                </div>
                <h3 className="mb-4 text-2xl font-black tracking-tighter uppercase leading-tight">{benefit.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24">
        <div className="container">
          <motion.div 
            className="flex flex-col items-center justify-between gap-12 md:flex-row border-t-2 border-border pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xl">
                 <BrandLogo className="size-6" />
              </div>
              <div>
                 <span className="block text-2xl font-black tracking-tighter uppercase">MathUP</span>
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Fundament Academic</span>
              </div>
            </div>
            <div className="text-center md:text-right space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-end">
                <Link
                  to="/termeni-si-conditii"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
                >
                  Termeni și Condiții
                </Link>
                <Link
                  to="/politica-de-confidentialitate"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-primary"
                >
                  Politica de Confidențialitate
                </Link>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                &copy; {new Date().getFullYear()} MathUP. Toate drepturile rezervate.
              </p>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary">
                Rigoare științifică și excelență pedagogică.
              </p>
            </div>
          </motion.div>
        </div>
      </footer>
      </div>
    </div>
  )
}