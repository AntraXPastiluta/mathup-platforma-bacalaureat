import {
  LayoutDashboard,
  PlusCircle,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'
import { getProfileMeta } from '../../lessons/profiles'

export function LessonSidebar({
  lessons,
  loading,
  selectedProgramKey,
  sidebarQuery,
  setSidebarQuery,
  programsSidebarList,
  sidebarLessonsOrdered,
  selectedLesson,
  clearProgramSelection,
  selectProgram,
  startCreatingLesson,
  startEditingLesson,
  startAddingPart,
  handleSelectLesson,
  handleDeleteLesson,
}) {
  return (
    <div className="lg:col-span-4 space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-primary" />
          <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Curriculum</h2>
        </div>
        <button
          type="button"
          onClick={() => startCreatingLesson()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 active:scale-95"
        >
          <PlusCircle className="size-4" />
          Lecție Nouă
        </button>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-transparent rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
        <div className="relative bg-white dark:bg-[#0a0f1c] border border-slate-300/50 dark:border-white/10 rounded-3xl overflow-hidden max-h-[75vh] flex flex-col shadow-md dark:shadow-none">
          <div className="p-4 border-b border-slate-300/50 dark:border-white/5 bg-slate-50 dark:bg-white/5 space-y-3">
            {selectedProgramKey ? (
              <button
                type="button"
                onClick={clearProgramSelection}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-primary hover:translate-x-[-2px] transition-all bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10 w-fit"
              >
                <ChevronLeft className="size-4" strokeWidth={3} />
                Înapoi la Programe
              </button>
            ) : null}
            <div className="relative">
              <input
                type="text"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder={selectedProgramKey ? 'Caută lecție...' : 'Caută program...'}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm text-slate-800 dark:text-white placeholder:text-slate-400"
              />
            </div>
            {selectedProgramKey ? (
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                {getProfileMeta(selectedProgramKey).label}
                <span className="ml-2 font-black text-primary">{sidebarLessonsOrdered.length} lecții</span>
              </p>
            ) : null}
            {selectedProgramKey ? (
              <div className="grid grid-cols-3 gap-2 px-1">
                <button
                  type="button"
                  onClick={() => startCreatingLesson(selectedProgramKey)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 py-3 text-[9px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/5 active:scale-95"
                >
                  <div className="size-7 rounded-xl bg-primary/20 flex items-center justify-center">
                    <PlusCircle className="size-4" />
                  </div>
                  Adaugă
                </button>
                <button
                  type="button"
                  disabled={!selectedLesson}
                  onClick={() => selectedLesson && startEditingLesson(selectedLesson)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white py-3 text-[9px] font-black uppercase tracking-widest text-slate-700 transition-all hover:text-primary hover:border-primary/30 hover:shadow-lg hover:shadow-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white dark:hover:border-white/20 active:scale-95"
                >
                  <div className="size-7 rounded-xl bg-slate-200/50 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Edit3 className="size-4" />
                  </div>
                  Editează
                </button>
                <button
                  type="button"
                  disabled={!selectedLesson}
                  onClick={() => selectedLesson && handleDeleteLesson(selectedLesson.id)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-destructive/20 bg-destructive/10 py-3 text-[9px] font-black uppercase tracking-widest text-destructive transition-all hover:bg-destructive/15 hover:shadow-lg hover:shadow-destructive/5 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                >
                  <div className="size-7 rounded-xl bg-destructive/15 flex items-center justify-center">
                    <Trash2 className="size-4" />
                  </div>
                  Șterge
                </button>
              </div>
            ) : null}
          </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {loading && lessons.length === 0 ? (
              <div className="p-10 text-center space-y-4">
                <div className="size-8 border-2 border-primary/30 border-t-primary animate-spin rounded-full mx-auto" />
                <p className="text-sm text-slate-400 font-medium italic">Se încarcă materia...</p>
              </div>
            ) : !selectedProgramKey ? (
              <div className="p-2 space-y-1">
                {programsSidebarList.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">Niciun program nu se potrivește căutării.</p>
                ) : (
                  programsSidebarList.map((p) => {
                    const count = lessons.filter((l) => l.profile === p.key).length
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className="w-full text-left p-4 rounded-2xl transition-all group/item border border-transparent hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300/80 dark:hover:border-white/10"
                        onClick={() => selectProgram(p.key)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary uppercase tracking-tighter border border-primary/20">
                                {p.shortLabel}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {count} lecții
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover/item:text-primary dark:group-hover/item:text-white transition-colors">
                              {p.label}
                            </div>
                          </div>
                          <ChevronRight className="size-4 mt-1 text-slate-400 opacity-0 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-1" />
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sidebarLessonsOrdered.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">
                    {lessons.some((l) => l.profile === selectedProgramKey)
                      ? 'Nicio lecție nu se potrivește căutării.'
                      : 'Nu există lecții pentru acest program.'}
                  </p>
                ) : (
                  sidebarLessonsOrdered.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`w-full text-left p-4 rounded-2xl transition-all group/item ${selectedLesson?.id === lesson.id ? 'bg-primary/10 border-primary/40 shadow-md ring-1 ring-primary/10' : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              Subiect {lesson.subject_part}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 tabular-nums">
                              #{lesson.order_index ?? 0}
                            </span>
                          </div>
                          <div className={`text-sm font-bold truncate transition-colors ${selectedLesson?.id === lesson.id ? 'text-primary dark:text-white' : 'text-slate-700 dark:text-slate-300 group-hover/item:text-primary dark:group-hover/item:text-white'}`}>
                            {lesson.title}
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            title="Adaugă parte"
                            onClick={() => startAddingPart(lesson)}
                            className="rounded-lg border border-primary/15 bg-primary/10 p-2 text-primary opacity-80 transition-all hover:bg-primary/20 hover:opacity-100"
                          >
                            <PlusCircle className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Editează lecția"
                            onClick={() => startEditingLesson(lesson)}
                            className="rounded-lg border border-slate-300 bg-white/70 p-2 text-slate-500 opacity-80 transition-all hover:text-primary hover:opacity-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Șterge lecția"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            className="rounded-lg border border-destructive/10 bg-destructive/10 p-2 text-destructive opacity-80 transition-all hover:bg-destructive/20 hover:opacity-100"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
