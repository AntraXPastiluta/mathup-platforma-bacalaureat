import { motion } from 'framer-motion'
import { PlusCircle, Check, BarChart3, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { PROFILES, SUBJECT_PARTS } from '../../lessons/profiles'
import { normalizeProfilesList } from '../../../services/profileService'

// Antet de pas numerotat, pentru a împărți formularul în secțiuni clare.
function StepHeader({ index, title, hint }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-black text-primary">
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{title}</p>
        {hint ? <p className="text-[11px] font-medium text-slate-400">{hint}</p> : null}
      </div>
    </div>
  )
}

export function LessonCreateForm({
  error,
  setError,
  newLessonData,
  setNewLessonData,
  toggleNewLessonProfile,
  setIsCreating,
  handleCreateLesson,
}) {
  const selectedProfiles = normalizeProfilesList(newLessonData.profiles)

  return (
    <motion.div
      key="creating"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 rounded-3xl border border-slate-300 bg-white p-6 shadow-md sm:p-8 dark:border-white/10 dark:bg-[#0a0f1c]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/20 text-primary">
            <PlusCircle className="size-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-slate-800 sm:text-2xl dark:text-white">Creează lecție nouă</h2>
            <p className="text-sm font-medium text-slate-500">Completează pașii de mai jos.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(false)}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-400 transition-all hover:text-primary dark:border-white/10 dark:hover:text-white"
          aria-label="Închide"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}

      {/* Pasul 1 — titlul */}
      <div className="space-y-3">
        <StepHeader index={1} title="Titlul lecției" />
        <input
          type="text"
          className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg font-bold text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
          value={newLessonData.title}
          onChange={(e) => setNewLessonData({ ...newLessonData, title: e.target.value })}
          placeholder="Ex: Teorema lui Thales"
        />
      </div>

      {/* Pasul 2 — programele */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <StepHeader
            index={2}
            title="Specializare"
            hint="Bifează unul sau mai multe programe. Conținutul și fișierele sunt comune; părțile și quiz-ul se adaugă separat per program."
          />
          {selectedProfiles.length > 0 ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {selectedProfiles.length} selectate
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROFILES.map((p) => {
            const active = selectedProfiles.includes(p.key)
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => toggleNewLessonProfile(p.key)}
                className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-primary bg-primary/10 shadow-md shadow-primary/10' : 'border-slate-300 bg-slate-50 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20'}`}
              >
                {active && (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                )}
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10'}`}>
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

      {/* Pasul 3 — detalii */}
      <div className="space-y-3">
        <StepHeader index={3} title="Detalii" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Subiect BAC</label>
            <select
              className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 font-bold text-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              value={newLessonData.subject_part}
              onChange={(e) => setNewLessonData({ ...newLessonData, subject_part: parseInt(e.target.value) })}
            >
              {SUBJECT_PARTS.map((s) => <option key={s.value} value={s.value} className="bg-white dark:bg-[#020617]">{s.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Dificultate</label>
            <div className="flex gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
              {['usor', 'mediu', 'greu'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setNewLessonData({ ...newLessonData, difficulty: lvl })}
                  className={`flex-1 rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-tighter transition-all ${newLessonData.difficulty === lvl ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <Button variant="outline" onClick={() => setIsCreating(false)} className="h-14 flex-1 rounded-2xl border-slate-300 text-slate-700 shadow-sm dark:border-white/10 dark:text-slate-300">Anulează</Button>
        <Button onClick={handleCreateLesson} className="h-14 flex-1 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xl shadow-primary/20">
          Creează lecția
        </Button>
      </div>
    </motion.div>
  )
}
