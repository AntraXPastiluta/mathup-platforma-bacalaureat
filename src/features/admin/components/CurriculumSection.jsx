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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-[75vh] items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#0a0f1c] text-slate-400 gap-4 shadow-sm"
            >
              <div className="size-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-300 dark:border-white/10">
                <BookOpen className="size-10 opacity-20" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Nicio lecție selectată</p>
                <p className="text-sm">Alege un program în stânga, apoi o lecție din listă, sau creează o lecție nouă.</p>
              </div>
              <Button variant="outline" onClick={() => c.setIsCreating(true)} className="mt-2 rounded-full border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm text-slate-600 dark:text-slate-300">
                + Creează prima lecție
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
