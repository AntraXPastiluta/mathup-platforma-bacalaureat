import { motion } from 'framer-motion'
import { PlusCircle, Check, BarChart3 } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { PROFILES, SUBJECT_PARTS } from '../../lessons/profiles'
import { normalizeProfilesList } from '../../../services/profileService'

export function LessonCreateForm({
  error,
  setError,
  newLessonData,
  setNewLessonData,
  toggleNewLessonProfile,
  setIsCreating,
  handleCreateLesson,
}) {
  return (
    <motion.div
      key="creating"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-[#0a0f1c] border border-slate-300 dark:border-white/10 rounded-3xl p-8 shadow-md space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
          <PlusCircle className="size-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Creează Lecție Nouă</h2>
          <p className="text-sm text-slate-500 font-medium">Definește parametrii de bază ai noii lecții.</p>
        </div>
      </div>

      {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Titlu Lecție</label>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm"
            value={newLessonData.title}
            onChange={(e) => setNewLessonData({ ...newLessonData, title: e.target.value })}
            placeholder="Ex: Teorema lui Thales"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Specializare (programe liceale)</label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Bifează unul sau mai multe programe — se creează câte o lecție pentru fiecare (același titlu și parametri).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROFILES.map((p) => {
              const active = normalizeProfilesList(newLessonData.profiles).includes(p.key)
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => toggleNewLessonProfile(p.key)}
                  className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'}`}
                >
                  {active && (
                    <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  )}
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                    <BarChart3 className="size-4" />
                  </div>
                  <div className="min-w-0 pr-7">
                    <p className={`text-xs font-black ${active ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{p.label}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground opacity-70">Programă {p.shortLabel}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Subiect BAC</label>
          <select
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white shadow-sm"
            value={newLessonData.subject_part}
            onChange={(e) => setNewLessonData({ ...newLessonData, subject_part: parseInt(e.target.value) })}
          >
            {SUBJECT_PARTS.map((s) => <option key={s.value} value={s.value} className="bg-white dark:bg-[#020617]">{s.label}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Dificultate</label>
          <div className="flex gap-2 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/10 shadow-sm">
            {['usor', 'mediu', 'greu'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setNewLessonData({ ...newLessonData, difficulty: lvl })}
                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${newLessonData.difficulty === lvl ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Index Ordine</label>
          <input
            type="number"
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            value={newLessonData.order_index}
            onChange={(e) => setNewLessonData({ ...newLessonData, order_index: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
            <input
              type="checkbox"
              checked={Boolean(newLessonData.is_premium)}
              onChange={(e) => setNewLessonData({ ...newLessonData, is_premium: e.target.checked })}
            />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Lecție Premium</span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Părți preview (gratuit)</label>
          <input
            type="number"
            min={1}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            value={newLessonData.preview_part_count}
            onChange={(e) => setNewLessonData({ ...newLessonData, preview_part_count: parseInt(e.target.value, 10) || 1 })}
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="outline" onClick={() => setIsCreating(false)} className="flex-1 rounded-2xl border-slate-300 dark:border-white/10 h-14 shadow-sm text-slate-700 dark:text-slate-300">Anulează</Button>
        <Button onClick={handleCreateLesson} className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 text-white">
          Creează Lecția
        </Button>
      </div>
    </motion.div>
  )
}
