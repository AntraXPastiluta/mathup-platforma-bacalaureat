import { motion } from 'framer-motion'
import {
  Layers,
  Trash2,
  Edit3,
  Save,
  FileText,
  HelpCircle,
  UploadCloud,
  Check,
  BarChart3,
} from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { PROFILES, SUBJECT_PARTS } from '../../lessons/profiles'
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
  handleAddQuestion,
  handleDeleteQuestion,
  getQuestionOptions,
  getQuestionPlacementLabel,
  regularFiles,
  handleFileUpload,
  handleDeleteFile,
}) {
  return (
    <motion.div
      key={selectedLesson.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white dark:bg-[#0a0f1c] border border-slate-300/50 dark:border-white/10 rounded-3xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/10 shadow-sm">
              <Layers className="size-7 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{selectedLesson.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/10">{selectedLesson.profile}</span>
                <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Subiect {selectedLesson.subject_part}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm active:scale-95 ${isEditingMetadata ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-primary'}`}
            >
              {isEditingMetadata ? <Save className="size-4" /> : <Edit3 className="size-4" />}
              {isEditingMetadata ? 'Salvează Metadate' : 'Modifică Metadate'}
            </button>
            <button
              onClick={() => handleDeleteLesson(selectedLesson.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all shadow-sm active:scale-95"
            >
              <Trash2 className="size-4" />
              Elimină Lecția
            </button>
          </div>
        </div>

        {!isEditingMetadata && (
          <div className="flex items-center gap-1 mt-8 p-1.5 bg-slate-200 dark:bg-black/20 rounded-2xl border border-slate-300 dark:border-white/5 w-fit shadow-inner">
            {LESSON_EDITOR_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.id]
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${activeTab === tab.id ? 'bg-white dark:bg-white/10 text-primary dark:text-white shadow-lg ring-1 ring-black/5' : 'text-slate-700 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'}`}
                >
                  <Icon className={`size-3.5 ${activeTab === tab.id ? 'text-primary' : 'text-slate-500 dark:text-slate-600'}`} />
                  {tab.label}
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
                  Primul program din selecția ta devine programul lecției curente; pentru fiecare program suplimentar se creează o copie cu aceleași părți, quiz și fișiere.
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

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Index Ordine</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                  value={editLessonData?.order_index || 0}
                  onChange={(e) => setEditLessonData({ ...editLessonData, order_index: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <input
                    type="checkbox"
                    checked={Boolean(editLessonData?.is_premium)}
                    onChange={(e) => setEditLessonData({ ...editLessonData, is_premium: e.target.checked })}
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Lecție Premium</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Părți preview (gratuit)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold text-slate-800 dark:text-white shadow-sm"
                  value={editLessonData?.preview_part_count ?? 1}
                  onChange={(e) => setEditLessonData({ ...editLessonData, preview_part_count: parseInt(e.target.value, 10) || 1 })}
                />
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
            )}
            {activeTab === 'quiz' && (
              <LessonQuizTab
                parts={parts}
                questions={questions}
                newQuestion={newQuestion}
                setNewQuestion={setNewQuestion}
                handleAddQuestion={handleAddQuestion}
                handleDeleteQuestion={handleDeleteQuestion}
                getQuestionOptions={getQuestionOptions}
                getQuestionPlacementLabel={getQuestionPlacementLabel}
              />
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
