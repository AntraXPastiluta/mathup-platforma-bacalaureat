import {
  PlusCircle,
  Trash2,
  Edit3,
  ChevronRight,
  ChevronLeft,
  Search,
  Layers,
  FolderOpen,
} from 'lucide-react'
import { getProfileMeta } from '../../lessons/profiles'

// Grupează lista (deja sortată subject_part → order_index în hook) pe subiecte, pentru
// subtitluri „Subiectul I/II/III" în registru. Randare pură, fără date noi.
function groupLessonsBySubject(lessons) {
  const groups = []
  let current = null
  for (const lesson of lessons) {
    if (!current || current.part !== lesson.subject_part) {
      current = { part: lesson.subject_part, items: [] }
      groups.push(current)
    }
    current.items.push(lesson)
  }
  return groups
}

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
  const programMeta = selectedProgramKey ? getProfileMeta(selectedProgramKey) : null
  const lessonGroups = groupLessonsBySubject(sidebarLessonsOrdered)

  return (
    <aside className="space-y-4 lg:col-span-4 lg:sticky lg:top-6 lg:self-start">
      {/* Breadcrumb + acțiune principală */}
      <div className="flex items-center justify-between gap-3 px-1">
        <nav className="flex min-w-0 items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em]" aria-label="Navigare curriculum">
          <button
            type="button"
            onClick={clearProgramSelection}
            disabled={!selectedProgramKey}
            className={`shrink-0 transition-colors ${selectedProgramKey ? 'text-muted-foreground hover:text-primary' : 'text-primary'}`}
          >
            Programe
          </button>
          {programMeta ? (
            <>
              <ChevronRight className="size-3.5 shrink-0 text-slate-400" strokeWidth={3} />
              <span className="truncate text-primary" title={programMeta.label}>{programMeta.shortLabel}</span>
            </>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={() => startCreatingLesson(selectedProgramKey || undefined)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-95"
        >
          <PlusCircle className="size-3.5" />
          Lecție nouă
        </button>
      </div>

      <div className="relative">
        <div className="relative flex max-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-3xl border border-slate-300/60 bg-white shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
          {/* Bară de căutare + sumar program */}
          <div className="space-y-3 border-b border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/5 dark:bg-white/5">
            {selectedProgramKey ? (
              <button
                type="button"
                onClick={clearProgramSelection}
                className="flex w-fit items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary transition-all hover:-translate-x-0.5"
              >
                <ChevronLeft className="size-3.5" strokeWidth={3} />
                Toate programele
              </button>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={sidebarQuery}
                onChange={(e) => setSidebarQuery(e.target.value)}
                placeholder={selectedProgramKey ? 'Caută lecție...' : 'Caută program...'}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            {programMeta ? (
              <p className="flex items-center justify-between gap-2 px-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span className="truncate" title={programMeta.label}>{programMeta.label}</span>
                <span className="shrink-0 font-black text-primary">{sidebarLessonsOrdered.length} lecții</span>
              </p>
            ) : null}
            {selectedProgramKey && selectedLesson ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => startEditingLesson(selectedLesson)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:border-primary/30 hover:text-primary active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:text-white"
                >
                  <Edit3 className="size-3.5" />
                  Metadate
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLesson(selectedLesson.id)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 px-2 py-2 text-[10px] font-black uppercase tracking-widest text-destructive transition-all hover:bg-destructive/15 active:scale-95"
                >
                  <Trash2 className="size-3.5" />
                  Șterge
                </button>
              </div>
            ) : null}
          </div>

          {/* Listă: programe → lecții grupate pe subiect */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
            {loading && lessons.length === 0 ? (
              <div className="space-y-4 p-10 text-center">
                <div className="mx-auto size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <p className="text-sm font-medium italic text-slate-400">Se încarcă materia...</p>
              </div>
            ) : !selectedProgramKey ? (
              programsSidebarList.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-400">Niciun program nu se potrivește căutării.</p>
              ) : (
                <div className="space-y-1">
                  {programsSidebarList.map((p) => {
                    const count = lessons.filter((l) => l.profile === p.key).length
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className="group/item flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-all hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5"
                        onClick={() => selectProgram(p.key)}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary transition-colors group-hover/item:bg-primary/10">
                          <FolderOpen className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="mb-0.5 flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter text-primary">
                              {p.shortLabel}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{count} lecții</span>
                          </span>
                          <span className="block truncate text-sm font-bold text-slate-700 transition-colors group-hover/item:text-primary dark:text-slate-200 dark:group-hover/item:text-white">
                            {p.label}
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-400 opacity-0 transition-all group-hover/item:translate-x-1 group-hover/item:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              )
            ) : sidebarLessonsOrdered.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">
                {lessons.some((l) => l.profile === selectedProgramKey)
                  ? 'Nicio lecție nu se potrivește căutării.'
                  : 'Nu există lecții pentru acest program.'}
              </p>
            ) : (
              <div className="space-y-3">
                {lessonGroups.map((group) => (
                  <div key={group.part} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 pt-1">
                      <Layers className="size-3 text-slate-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Subiectul {group.part}
                      </span>
                      <span className="h-px flex-1 bg-slate-200/70 dark:bg-white/5" />
                    </div>
                    {group.items.map((lesson) => {
                      const active = selectedLesson?.id === lesson.id
                      return (
                        <div
                          key={lesson.id}
                          className={`group/item flex items-center gap-2 rounded-2xl border p-2.5 transition-all ${active ? 'border-primary/40 bg-primary/10 shadow-sm ring-1 ring-primary/10' : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            onClick={() => handleSelectLesson(lesson)}
                          >
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black tabular-nums ${active ? 'bg-primary text-white' : 'bg-slate-200/70 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                              {lesson.order_index ?? 0}
                            </span>
                            <span className={`block truncate text-sm font-bold transition-colors ${active ? 'text-primary dark:text-white' : 'text-slate-700 group-hover/item:text-primary dark:text-slate-300 dark:group-hover/item:text-white'}`}>
                              {lesson.title}
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover/item:opacity-100">
                            <button
                              type="button"
                              title="Adaugă parte"
                              onClick={() => startAddingPart(lesson)}
                              className="rounded-lg border border-primary/15 bg-primary/10 p-1.5 text-primary transition-all hover:bg-primary/20"
                            >
                              <PlusCircle className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Editează lecția"
                              onClick={() => startEditingLesson(lesson)}
                              className="rounded-lg border border-slate-300 bg-white/70 p-1.5 text-slate-500 transition-all hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Șterge lecția"
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="rounded-lg border border-destructive/10 bg-destructive/10 p-1.5 text-destructive transition-all hover:bg-destructive/20"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
