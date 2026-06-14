import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { MathSymbolToolbar } from '../../../shared/ui/MathSymbolToolbar'
import { MathContent } from '../../../shared/ui/MathContent'
import { insertMathSnippet } from '../../../shared/utils/mathInsert'

export function LessonQuizTab({
  parts,
  questions,
  newQuestion,
  setNewQuestion,
  editingQuestionId,
  handleAddQuestion,
  startEditingQuestion,
  handleUpdateQuestion,
  cancelQuestionEdit,
  handleDeleteQuestion,
  getQuestionOptions,
  getQuestionOptionExplanations,
  getQuestionPlacementLabel,
}) {
  const formRef = useRef(null)
  const questionRef = useRef(null)
  const optionRefs = useRef({})
  const explanationRefs = useRef({})
  // Reținem ultima opțiune focalizată ca să știm în care inserăm simbolurile.
  const [activeOption, setActiveOption] = useState(0)
  const isEditing = Boolean(editingQuestionId)

  // La intrarea în editare, aducem formularul în câmpul vizual (lista poate fi lungă).
  useEffect(() => {
    if (isEditing) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [editingQuestionId, isEditing])

  const insertIntoOption = (item, block) => {
    insertMathSnippet(
      optionRefs.current[activeOption],
      item,
      block,
      newQuestion.options[activeOption],
      (value) => {
        const next = [...newQuestion.options]
        next[activeOption] = value
        setNewQuestion({ ...newQuestion, options: next })
      },
    )
  }

  // Fiecare explicație are propria bară de simboluri, care inserează direct în slotul ei.
  const insertIntoExplanation = (idx, item, block) => {
    insertMathSnippet(
      explanationRefs.current[idx],
      item,
      block,
      newQuestion.optionExplanations[idx] ?? '',
      (value) => {
        const next = [...newQuestion.optionExplanations]
        next[idx] = value
        setNewQuestion({ ...newQuestion, optionExplanations: next })
      },
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div
        ref={formRef}
        className={`bg-indigo-600/5 border rounded-3xl p-8 space-y-6 shadow-sm transition-colors ${
          isEditing ? 'border-amber-500/40 ring-2 ring-amber-500/20' : 'border-indigo-600/10 dark:border-indigo-600/20'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <Pencil className="size-5 text-amber-500 dark:text-amber-400" />
            ) : (
              <HelpCircle className="size-5 text-indigo-500 dark:text-indigo-400" />
            )}
            <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
              {isEditing ? 'Editează Întrebarea' : 'Creează Întrebare'}
            </h3>
          </div>
          {isEditing && (
            <button
              onClick={cancelQuestionEdit}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-white transition-all shadow-sm"
            >
              <X className="size-3.5" />
              Renunță
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Textul Întrebării</label>
            <MathSymbolToolbar
              onInsert={(item, block) =>
                insertMathSnippet(questionRef.current, item, block, newQuestion.text, (value) => setNewQuestion({ ...newQuestion, text: value }))
              }
            />
          </div>
          <input
            ref={questionRef}
            type="text"
            className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
            placeholder="Ex: Care este derivata funcției $f(x)=x^2$?..."
            value={newQuestion.text}
            onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
          />
          {newQuestion.text?.trim() ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Previzualizare</p>
              <MathContent content={newQuestion.text} className="text-sm leading-relaxed font-bold text-slate-700 dark:text-slate-200" />
            </div>
          ) : null}
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

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Opțiuni de răspuns</label>
            <MathSymbolToolbar onInsert={insertIntoOption} />
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1">
            Simbolurile din bara de sus se adaugă în textul <span className="font-black text-indigo-500 dark:text-indigo-400">Opțiunii {activeOption + 1}</span> (cea selectată). Fiecare explicație are propria bară de simboluri.
          </p>
          <div className="grid grid-cols-1 gap-4">
            {newQuestion.options.map((opt, idx) => {
              const explanation = newQuestion.optionExplanations[idx] ?? ''
              return (
                <div key={idx} className={`relative rounded-2xl border transition-all ${newQuestion.correct === idx ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 shadow-sm'} ${activeOption === idx ? 'ring-2 ring-indigo-500/40' : ''}`}>
                  <div className="flex items-center gap-3 p-3">
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
                      ref={(el) => { optionRefs.current[idx] = el }}
                      type="text"
                      className="flex-1 bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-slate-400 text-slate-700 dark:text-white"
                      placeholder={`Opțiunea ${idx + 1}`}
                      value={opt}
                      onFocus={() => setActiveOption(idx)}
                      onChange={(e) => {
                        const next = [...newQuestion.options]
                        next[idx] = e.target.value
                        setNewQuestion({ ...newQuestion, options: next })
                      }}
                    />
                    {newQuestion.correct === idx ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Corect
                      </span>
                    ) : null}
                  </div>
                  {opt.includes('$') ? (
                    <div className="border-t border-dashed border-slate-200 dark:border-white/10 px-3 py-2">
                      <MathContent content={opt} className="text-xs font-bold text-slate-600 dark:text-slate-300" />
                    </div>
                  ) : null}
                  <div className="border-t border-dashed border-slate-200 dark:border-white/10 px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Explicație variantă <span className="text-slate-400/70 normal-case tracking-normal">(opțional)</span>
                      </label>
                      <MathSymbolToolbar onInsert={(item, block) => insertIntoExplanation(idx, item, block)} />
                    </div>
                    <textarea
                      ref={(el) => { explanationRefs.current[idx] = el }}
                      rows={2}
                      className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-700 dark:text-white shadow-sm resize-y"
                      placeholder="De ce e corectă/greșită această variantă? Se arată elevului dacă o alege."
                      value={explanation}
                      onChange={(e) => {
                        const next = [...newQuestion.optionExplanations]
                        next[idx] = e.target.value
                        setNewQuestion({ ...newQuestion, optionExplanations: next })
                      }}
                    />
                    {explanation.includes('$') ? (
                      <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 px-3 py-2">
                        <MathContent content={explanation} className="text-[11px] font-bold text-slate-600 dark:text-slate-300" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleUpdateQuestion} className="flex-1 rounded-2xl h-12 bg-amber-500 text-white hover:bg-amber-600 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20">
              Salvează modificările
            </Button>
            <Button onClick={cancelQuestionEdit} variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[10px]">
              Renunță
            </Button>
          </div>
        ) : (
          <Button onClick={handleAddQuestion} className="w-full rounded-2xl h-12 bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20">
            Adaugă în Chestionar
          </Button>
        )}
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
              <li
                key={q.id}
                className={`bg-white dark:bg-white/5 border rounded-3xl p-6 flex justify-between items-start gap-4 shadow-sm transition-colors ${
                  editingQuestionId === q.id ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-slate-300 dark:border-white/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Întrebarea {idx + 1}</span>
                    {editingQuestionId === q.id && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        În editare
                      </span>
                    )}
                  </div>
                  <MathContent content={q.question_text} className="font-bold text-slate-800 dark:text-slate-100 text-base mb-4 leading-snug" />
                  <p className="mb-4 w-fit rounded-full bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 border border-indigo-500/10">
                    {getQuestionPlacementLabel(q)}
                  </p>
                  <div className="space-y-2.5">
                    {getQuestionOptions(q).map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correct_option_index
                      const explanation = getQuestionOptionExplanations(q)[oIdx]
                      return (
                        <div key={oIdx} className="space-y-1">
                          <div className={`flex items-center gap-2 text-xs font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                            <div className={`size-1.5 shrink-0 rounded-full ${isCorrect ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`} />
                            <MathContent content={opt} className="min-w-0" />
                          </div>
                          {explanation ? (
                            <div className="ml-3.5 border-l-2 border-slate-200 dark:border-white/10 pl-3">
                              <MathContent content={explanation} className="text-[11px] font-medium text-slate-500 dark:text-slate-400" />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 mt-1">
                  <button
                    onClick={() => startEditingQuestion(q)}
                    aria-label="Editează întrebarea"
                    className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10 hover:bg-amber-500/20 transition-all shadow-sm"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    aria-label="Șterge întrebarea"
                    className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/10 hover:bg-destructive/20 transition-all shadow-sm"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}
