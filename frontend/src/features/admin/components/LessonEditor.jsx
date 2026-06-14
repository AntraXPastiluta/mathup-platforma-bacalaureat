import { motion } from 'framer-motion'
import {
  Layers,
  Trash2,
  Edit3,
  X,
  FileText,
  HelpCircle,
  UploadCloud,
  Check,
  BarChart3,
} from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { PROFILES, SUBJECT_PARTS, getProfileMeta } from '../../lessons/profiles'
import { normalizeProfilesList } from '../../../services/profileService'
import { LESSON_EDITOR_TABS } from '../constants'
import { LessonContentTab } from './LessonContentTab'
import { LessonPartsTab } from './LessonPartsTab'
import { LessonQuizTab } from './LessonQuizTab'
import { LessonFilesTab } from './LessonFilesTab'

const TAB_ICONS = {
  content: FileText,
  parts: Layers,
  quiz: HelpCircle,
  files: UploadCloud,
}

export function LessonEditor({
  selectedLesson,
  selectedProgramKey,
  error,
  setError,
  success,
  setSuccess,
  activeTab,
  setActiveTab,
  isEditingMetadata,
  setIsEditingMetadata,
  editLessonData,
  setEditLessonData,
  toggleEditLessonProfile,
  handleUpdateMetadata,
  handleDeleteLesson,
  lessonContent,
  setLessonContent,
  videoUrl,
  setVideoUrl,
  handleUpdateLesson,
  parts,
  newPart,
  setNewPart,
  newPartPreviewSrc,
  uploading,
  editingPartId,
  setEditingPartId,
  handlePartImageUpload,
  handleAddPart,
  handleUpdatePart,
  handleDeletePart,
  updatePartField,
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
  regularFiles,
  handleFileUpload,
  handleDeleteFile,
}) {
  const lessonPrograms = (selectedLesson.profiles ?? []).map(getProfileMeta)
  // Părțile și quiz-ul sunt separate per program; arătăm pentru ce program se editează.
  const editingProgram = getProfileMeta(selectedProgramKey ?? selectedLesson.profiles?.[0])
  // Insigne numerice pe tab-uri, ca administratorul să vadă dintr-o privire ce e completat.
  const TAB_COUNTS = {
    content: 0,
    parts: parts.length,
    quiz: questions.length,
    files: regularFiles.length,
  }

  return (
    <motion.div
      key={selectedLesson.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="rounded-3xl border border-slate-300/50 bg-white p-5 shadow-md sm:p-6 dark:border-white/10 dark:bg-[#0a0f1c]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-sm">
              <Layers className="size-7 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black tracking-tight text-slate-800 sm:text-2xl dark:text-white">{selectedLesson.title}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {lessonPrograms.map((program) => (
                  <span key={program.key} className="rounded border border-primary/10 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">{program.shortLabel}</span>
                ))}
                <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Subiectul {selectedLesson.subject_part}</span>
                {selectedLesson.difficulty ? (
                  <>
                    <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{selectedLesson.difficulty}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 ${isEditingMetadata ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
            >
              {isEditingMetadata ? <X className="size-4" /> : <Edit3 className="size-4" />}
              {isEditingMetadata ? 'Renunță' : 'Modifică metadate'}
            </button>
            <button
              onClick={() => handleDeleteLesson(selectedLesson.id)}
              className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-destructive shadow-sm transition-all hover:bg-destructive/20 active:scale-95"
            >
              <Trash2 className="size-4" />
              Elimină
            </button>
          </div>
        </div>

        {!isEditingMetadata && (
          <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-300 bg-slate-100 p-1.5 shadow-inner sm:flex sm:items-center dark:border-white/5 dark:bg-black/20">
            {LESSON_EDITOR_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id]
              const count = TAB_COUNTS[tab.id]
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-tighter transition-all ${isActive ? 'bg-white text-primary shadow-lg ring-1 ring-black/5 dark:bg-white/10 dark:text-white' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200'}`}
                >
                  <Icon className={`size-3.5 ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-600'}`} />
                  {tab.label}
                  {count > 0 ? (
                    <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[9px] tabular-nums ${isActive ? 'bg-primary/15 text-primary' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <AlertMessage message={error} variant="error" onClose={() => setError('')} />}
      {success && <AlertMessage message={success} variant="success" onClose={() => setSuccess('')} />}

      <div className="bg-white dark:bg-[#0a0f1c] border border-slate-300/50 dark:border-white/10 rounded-3xl p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl pointer-events-none -mr-32 -mt-32 rounded-full" />

        {isEditingMetadata ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-4 w-1 bg-primary rounded-full" />
              <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Modifică Metadatele</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Titlu Nou</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-lg text-slate-800 dark:text-white shadow-sm"
                  value={editLessonData?.title || ''}
                  onChange={(e) => setEditLessonData({ ...editLessonData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specializare (programe liceale)</label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Lecția apare în toate programele bifate. Conținutul principal și fișierele sunt comune (le editezi o singură dată). Părțile și quiz-ul se editează separat pentru fiecare program — pe cel selectat în bara laterală.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROFILES.map((p) => {
                    const active = normalizeProfilesList(editLessonData?.profiles || []).includes(p.key)
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggleEditLessonProfile(p.key)}
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Subiect BAC</label>
                <select
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold appearance-none cursor-pointer text-slate-800 dark:text-white shadow-sm"
                  value={editLessonData?.subject_part || 1}
                  onChange={(e) => setEditLessonData({ ...editLessonData, subject_part: parseInt(e.target.value) })}
                >
                  {SUBJECT_PARTS.map((s) => <option key={s.value} value={s.value} className="bg-white dark:bg-[#020617]">{s.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dificultate</label>
                <div className="flex gap-2 p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/10 shadow-sm">
                  {['usor', 'mediu', 'greu'].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setEditLessonData({ ...editLessonData, difficulty: lvl })}
                      className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${editLessonData?.difficulty === lvl ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            <Button onClick={handleUpdateMetadata} className="w-full rounded-2xl h-14 bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 mt-4">
              Salvează Toate Modificările
            </Button>
          </motion.div>
        ) : (
          <div className="relative z-10">
            {activeTab === 'content' && (
              <LessonContentTab
                lessonContent={lessonContent}
                setLessonContent={setLessonContent}
                videoUrl={videoUrl}
                setVideoUrl={setVideoUrl}
                handleUpdateLesson={handleUpdateLesson}
              />
            )}
            {activeTab === 'parts' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Editezi părțile pentru programul <span className="font-black uppercase">{editingProgram.shortLabel}</span>. Fiecare program are propriile părți — schimbă programul din bara laterală pentru altul.
                </div>
                <LessonPartsTab
                parts={parts}
                newPart={newPart}
                setNewPart={setNewPart}
                newPartPreviewSrc={newPartPreviewSrc}
                uploading={uploading}
                editingPartId={editingPartId}
                setEditingPartId={setEditingPartId}
                handlePartImageUpload={handlePartImageUpload}
                handleAddPart={handleAddPart}
                handleUpdatePart={handleUpdatePart}
                handleDeletePart={handleDeletePart}
                updatePartField={updatePartField}
              />
              </div>
            )}
            {activeTab === 'quiz' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  Editezi quiz-ul pentru programul <span className="font-black uppercase">{editingProgram.shortLabel}</span>. Fiecare program are propriul quiz — schimbă programul din bara laterală pentru altul.
                </div>
                <LessonQuizTab
                parts={parts}
                questions={questions}
                newQuestion={newQuestion}
                setNewQuestion={setNewQuestion}
                editingQuestionId={editingQuestionId}
                handleAddQuestion={handleAddQuestion}
                startEditingQuestion={startEditingQuestion}
                handleUpdateQuestion={handleUpdateQuestion}
                cancelQuestionEdit={cancelQuestionEdit}
                handleDeleteQuestion={handleDeleteQuestion}
                getQuestionOptions={getQuestionOptions}
                getQuestionOptionExplanations={getQuestionOptionExplanations}
                getQuestionPlacementLabel={getQuestionPlacementLabel}
              />
              </div>
            )}
            {activeTab === 'files' && (
              <LessonFilesTab
                regularFiles={regularFiles}
                uploading={uploading}
                handleFileUpload={handleFileUpload}
                handleDeleteFile={handleDeleteFile}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}
