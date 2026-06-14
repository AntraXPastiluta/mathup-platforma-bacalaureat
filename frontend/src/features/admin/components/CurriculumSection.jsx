import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, PlusCircle } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { useAdminCurriculum } from '../hooks/useAdminCurriculum'
import { LessonSidebar } from './LessonSidebar'
import { LessonCreateForm } from './LessonCreateForm'
import { LessonEditor } from './LessonEditor'

export function CurriculumSection() {
  const c = useAdminCurriculum()

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
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
              className="flex min-h-[calc(100vh-18rem)] flex-col items-center justify-center gap-7 rounded-[2.5rem] border-2 border-dashed border-border bg-white/70 text-slate-400 shadow-inner dark:bg-slate-900/40"
            >
              <div className="flex size-20 items-center justify-center rounded-3xl border border-primary/10 bg-primary/5 shadow-sm">
                <BookOpen className="size-9 text-primary/40" />
              </div>
              <div className="space-y-2 text-center">
                <p className="font-heading text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Nicio lecție selectată</p>
                <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-muted-foreground">
                  Alege un program din panoul din stânga pentru a-i vedea lecțiile, sau creează o lecție nouă.
                </p>
              </div>
              <Button onClick={() => c.setIsCreating(true)} className="h-12 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-8 text-white shadow-lg shadow-primary/20">
                <PlusCircle className="size-4" />
                Lecție nouă
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
              selectedProgramKey={c.selectedProgramKey}
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
              editingQuestionId={c.editingQuestionId}
              handleAddQuestion={c.handleAddQuestion}
              startEditingQuestion={c.startEditingQuestion}
              handleUpdateQuestion={c.handleUpdateQuestion}
              cancelQuestionEdit={c.cancelQuestionEdit}
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
