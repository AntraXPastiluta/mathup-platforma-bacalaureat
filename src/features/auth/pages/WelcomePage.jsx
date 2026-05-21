import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useAuth } from '../../../app/providers/AuthProvider'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

const benefits = [
  { 
    title: 'Planuri de studiu ghidate', 
    description: 'Calendar academic structurat cu obiective clare pentru fiecare săptămână de pregătire.',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    title: 'Simulări cu analiză', 
    description: 'Teste în format oficial BAC, însoțite de recomandări punctuale bazate pe performanța ta.',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  { 
    title: 'Lecții concise', 
    description: 'Conținut optimizat și structurat pe competențe cheie, facilitând o învățare rapidă și logică.',
    icon: (
      <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  },
]

export function WelcomePage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useAuth()

  return (
    <div className="flex-1 transition-colors duration-500 overflow-x-hidden">
      {/* Premium Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
        <div className="container flex h-18 items-center justify-between">
          <motion.div 
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/25 text-white transform group-hover:rotate-6 transition-transform">
              <BrandLogo className="size-6" />
            </div>
            <div>
              <strong className="block text-base leading-tight font-black tracking-tight uppercase">MathUP</strong>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Performanță construită pas cu pas.</span>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-4">
             <Button
               variant="ghost"
               size="icon"
               onClick={toggleTheme}
               className="rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
             >
               {theme === 'dark' ? <Sun className="size-5 text-yellow-400" /> : <Moon className="size-5 text-slate-600" />}
             </Button>
             <div className="hidden sm:flex h-8 w-px bg-slate-200 dark:bg-white/10 mx-2" />
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => navigate('/login')}
               className="rounded-full font-bold uppercase tracking-wider text-[10px]"
             >
               Login
             </Button>
             <Button 
               size="sm" 
               onClick={() => navigate('/register')}
               className="rounded-full bg-primary font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20"
             >
               Înregistrare
             </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-28">
        <div className="container relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold tracking-wide text-primary border border-primary/20">
                Platforma academică pentru succes la BAC
              </span>
            </motion.div>
            
            <motion.h1
              className="mt-8 max-w-4xl text-5xl font-black tracking-tight sm:text-8xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Excelența în Matematică <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 via-indigo-700 to-indigo-600 dark:from-primary dark:via-indigo-400 dark:to-indigo-300">
                Începe Aici
              </span>
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Învață disciplinat, urmărește-ți progresul în timp real și construiește o rutină 
              constantă pentru rezultate solide la examenul de Bacalaureat.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button size="lg" className="rounded-2xl px-10 h-16 text-lg font-bold shadow-2xl shadow-primary/25 bg-gradient-to-r from-primary to-indigo-600" onClick={() => navigate('/register')}>
                Creează cont gratuit
              </Button>
              <Button variant="outline" size="lg" className="rounded-2xl px-10 h-16 text-lg font-bold border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => navigate('/login')}>
                Intră în cont
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 -z-10 h-full w-full pointer-events-none">
           <div className="absolute -top-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
           <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-indigo-400/10 blur-[100px]" />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-50/50 dark:bg-black/20 py-24 border-y border-slate-100 dark:border-white/5">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="group relative flex flex-col rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-8 shadow-sm hover:shadow-2xl transition-all duration-500"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                whileHover={{ y: -10 }}
              >
                <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-white shadow-lg shadow-primary/10">
                  {benefit.icon}
                </div>
                <h3 className="mb-3 text-2xl font-black tracking-tight">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-white/5 py-20 opacity-60">
        <div className="container flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10">
               <BrandLogo className="size-6" />
            </div>
            <div>
               <span className="block text-xl font-black tracking-tight uppercase">MathUP</span>
               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Platformă Educațională</span>
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            &copy; {new Date().getFullYear()} MathUP. Toate drepturile rezervate. <br />
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Construit cu pasiune pentru educație.</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
