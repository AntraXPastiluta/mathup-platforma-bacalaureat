import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useAdminCurriculum } from '../hooks/useAdminCurriculum'
import { LessonSidebar } from './LessonSidebar'
import { LessonCreateForm } from './LessonCreateForm'
import { LessonEditor } from './LessonEditor'

export function CurriculumSection() {
  const c = useAdminCurriculum()

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <LessonSidebar
        lessons={c.lessons}
        loading={c.loading}
        selectedProgramKey={c.selectedProgramKey}
        sidebarQuery={c.sidebarQuery}
        setSidebarQuery={c.setSidebarQuery}
        programsSidebarList={c.programsSidebarList}
        sidebarLessonsOrdered={c.sidebarLessonsOrdered}
        selectedLesson={c.selectedLesson}
        clearProgramSelection={c.clearProgramSelection}
        selectProgram={c.selectProgram}
        startCreatingLesson={c.startCreatingLesson}
        startEditingLesson={c.startEditingLesson}
        startAddingPart={c.startAddingPart}
        handleSelectLesson={c.handleSelectLesson}
        handleDeleteLesson={c.handleDeleteLesson}
      />

      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {!c.selectedLesson && !c.isCreating ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col h-[75vh] items-center justify-center rounded-[2.5rem] border-2 border-dashed border-border bg-white dark:bg-slate-900/50 text-slate-400 gap-8 shadow-inner"
            >
              <div className="size-24 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border-2 border-border shadow-sm">
                <BookOpen className="size-10 opacity-20" />
              </div>
              <div className="text-center space-y-3">
                <p className="font-black text-xl uppercase tracking-tighter text-slate-900 dark:text-white">Arhivă Inactivă</p>
                <p className="text-sm font-medium max-w-xs leading-relaxed uppercase tracking-widest opacity-60">Alege un program din registrul stâng sau inițiază un nou capitol academic.</p>
              </div>
              <Button variant="outline" onClick={() => c.setIsCreating(true)} className="rounded-xl px-10 h-14 border-primary/30 text-primary">
                + Lansează Lecție Nouă
              </Button>
            </motion.div>
          ) : c.isCreating ? (
            <LessonCreateForm
              error={c.error}
              setError={c.setError}
              newLessonData={c.newLessonData}
              setNewLessonData={c.setNewLessonData}
              toggleNewLessonProfile={c.toggleNewLessonProfile}
              setIsCreating={c.setIsCreating}
              handleCreateLesson={c.handleCreateLesson}
            />
          ) : (
            <LessonEditor
              selectedLesson={c.selectedLesson}
              error={c.error}
              setError={c.setError}
              success={c.success}
              setSuccess={c.setSuccess}
              activeTab={c.activeTab}
              setActiveTab={c.setActiveTab}
              isEditingMetadata={c.isEditingMetadata}
              setIsEditingMetadata={c.setIsEditingMetadata}
              editLessonData={c.editLessonData}
              setEditLessonData={c.setEditLessonData}
              toggleEditLessonProfile={c.toggleEditLessonProfile}
              handleUpdateMetadata={c.handleUpdateMetadata}
              handleDeleteLesson={c.handleDeleteLesson}
              lessonContent={c.lessonContent}
              setLessonContent={c.setLessonContent}
              videoUrl={c.videoUrl}
              setVideoUrl={c.setVideoUrl}
              handleUpdateLesson={c.handleUpdateLesson}
              parts={c.parts}
              newPart={c.newPart}
              setNewPart={c.setNewPart}
              newPartPreviewSrc={c.newPartPreviewSrc}
              uploading={c.uploading}
              editingPartId={c.editingPartId}
              setEditingPartId={c.setEditingPartId}
              handlePartImageUpload={c.handlePartImageUpload}
              handleAddPart={c.handleAddPart}
              handleUpdatePart={c.handleUpdatePart}
              handleDeletePart={c.handleDeletePart}
              updatePartField={c.updatePartField}
              questions={c.questions}
              newQuestion={c.newQuestion}
              setNewQuestion={c.setNewQuestion}
              handleAddQuestion={c.handleAddQuestion}
              handleDeleteQuestion={c.handleDeleteQuestion}
              getQuestionOptions={c.getQuestionOptions}
              getQuestionPlacementLabel={c.getQuestionPlacementLabel}
              regularFiles={c.regularFiles}
              handleFileUpload={c.handleFileUpload}
              handleDeleteFile={c.handleDeleteFile}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
