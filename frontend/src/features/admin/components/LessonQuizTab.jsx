import { motion } from 'framer-motion'
import { HelpCircle, Trash2 } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'

export function LessonQuizTab({
  parts,
  questions,
  newQuestion,
  setNewQuestion,
  handleAddQuestion,
  handleDeleteQuestion,
  getQuestionOptions,
  getQuestionPlacementLabel,
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="bg-indigo-600/5 border border-indigo-600/10 dark:border-indigo-600/20 rounded-3xl p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <HelpCircle className="size-5 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Creează Întrebare</h3>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Textul Întrebării</label>
          <input
            type="text"
            className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            placeholder="Ex: Care este derivata funcției f(x)=x^2?..."
            value={newQuestion.text}
            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
          />
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Unde apare chestionarul?</label>
          <select
            className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            value={newQuestion.placement.type === 'after_part' ? newQuestion.placement.partId : 'end'}
            onChange={(e) => {
              const value = e.target.value
              setNewQuestion({
                ...newQuestion,
                placement: value === 'end'
                  ? { type: 'end', partId: '' }
                  : { type: 'after_part', partId: value },
              })
            }}
          >
            <option value="end" className="bg-white dark:bg-[#020617]">La finalul lecției</option>
            {parts.map((part, idx) => (
              <option key={part.id} value={part.id} className="bg-white dark:bg-[#020617]">
                După secțiunea {idx + 1}: {part.title}
              </option>
            ))}
          </select>
          {parts.length === 0 && (
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Adaugă părți lecției ca să poți pune întrebări între secțiuni.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {newQuestion.options.map((opt, idx) => (
            <div key={idx} className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all ${newQuestion.correct === idx ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 shadow-sm'}`}>
              <div className="flex items-center justify-center size-6 rounded-lg bg-slate-100 dark:bg-black/20">
                <input
                  type="radio"
                  name="correct"
                  className="accent-emerald-500"
                  checked={newQuestion.correct === idx}
                  onChange={() => setNewQuestion({ ...newQuestion, correct: idx })}
                />
              </div>
              <input
                type="text"
                className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-white"
                placeholder={`Opțiunea ${idx + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...newQuestion.options]
                  next[idx] = e.target.value
                  setNewQuestion({ ...newQuestion, options: next })
                }}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleAddQuestion} className="w-full rounded-2xl h-12 bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20">
          Adaugă în Chestionar
        </Button>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2">Întrebări înregistrate ({questions.length})</h3>
        {questions.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-300 dark:border-white/5 rounded-3xl bg-slate-50 dark:bg-transparent">
            <p className="text-sm text-slate-500 font-medium italic">Nu ai adăugat încă nicio întrebare.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {questions.map((q, idx) => (
              <li key={q.id} className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-3xl p-6 flex justify-between items-start gap-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Întrebarea {idx + 1}</span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-base mb-4 leading-snug">{q.question_text}</p>
                  <p className="mb-4 w-fit rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 border border-indigo-500/10">
                    {getQuestionPlacementLabel(q)}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                    {getQuestionOptions(q).map((opt, oIdx) => (
                      <div key={oIdx} className={`flex items-center gap-2 text-xs font-bold ${oIdx === q.correct_option_index ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        <div className={`size-1.5 rounded-full ${oIdx === q.correct_option_index ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDeleteQuestion(q.id)} className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/10 hover:bg-destructive/20 transition-all mt-1 shadow-sm">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
