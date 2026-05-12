import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  CheckCircle2, 
  XCircle,
  BookOpen, 
  GraduationCap,
  FileText,
  ArrowRight,
  ExternalLink,
  HelpCircle
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { getLessonById } from '../../../services/lessonService'
import { markLessonCompleted } from '../../../services/progressService'
import {
  canAccessLessonFiles,
  canAccessLessonPart,
  canAccessQuiz,
  canDownloadSolvedContent,
  canTrackLessonCompletion,
  getPreviewPartCount,
  isLessonPremium,
} from '../../../services/premiumAccessService'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Navbar } from '../../../shared/ui/Navbar'
import { getProfileMeta, SUBJECT_PARTS } from '../profiles'

export function LessonPage() {
  const { lessonId } = useParams()
  const { user, isPremium, openPremiumModal } = useAuth()
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [quizSelections, setQuizSelections] = useState({})
  const [quizResults, setQuizResults] = useState({})
  const [quizFeedback, setQuizFeedback] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function loadLesson() {
      setLoading(true)
      setError('')
      try {
        const lessonData = await getLessonById(lessonId)
        if (!mounted) return
        setLesson(lessonData)
        setCurrentPartIndex(0)
        setQuizSelections({})
        setQuizResults({})
        setQuizFeedback(null)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadLesson()
    return () => {
      mounted = false
    }
  }, [lessonId])

  useEffect(() => {
    if (!quizFeedback) return
    const timer = setTimeout(() => setQuizFeedback(null), 1800)
    return () => clearTimeout(timer)
  }, [quizFeedback])

  const handleComplete = async () => {
    if (!user?.id || !lesson?.id) return
    if (!canTrackLessonCompletion(lesson, isPremium)) {
      openPremiumModal()
      return
    }
    setSaving(true)
    try {
      const score = quizQuestions.length > 0
        ? Math.round((quizScore / quizQuestions.length) * 100)
        : null
      await markLessonCompleted({ userId: user.id, lessonId: lesson.id, score })
      navigate('/dashboard')
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNextPart = () => {
    if (!lesson?.lesson_parts || currentPartIndex >= lesson.lesson_parts.length - 1) return
    const nextIndex = currentPartIndex + 1
    if (!canAccessLessonPart(lesson, nextIndex, isPremium)) {
      openPremiumModal()
      return
    }
    setCurrentPartIndex(nextIndex)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const subjectMeta = lesson
    ? SUBJECT_PARTS.find((subject) => subject.value === lesson.subject_part)
    : null
  const profileMeta = lesson ? getProfileMeta(lesson.profile) : null

  const parts = lesson?.lesson_parts || []
  const hasParts = parts.length > 0
  const currentPart = hasParts ? parts[currentPartIndex] : null
  const isLastPart = hasParts ? currentPartIndex === parts.length - 1 : true
  const isFirstPart = currentPartIndex === 0
  const quizQuestions = lesson?.quiz_questions || []
  const quizAnsweredCount = quizQuestions.filter((question) => quizResults[question.id] !== undefined).length
  const quizScore = quizQuestions.filter((question) => quizResults[question.id] === question.correct_option_index).length
  const hasCompletedQuiz = quizQuestions.length > 0 && quizAnsweredCount === quizQuestions.length
  const getQuestionOptions = (question) => {
    return Array.isArray(question.options) ? question.options : question.options?.choices || []
  }
  const getQuestionPlacement = (question) => {
    if (Array.isArray(question.options)) return { type: 'end', partId: '' }
    return question.options?.placement || { type: 'end', partId: '' }
  }
  const visibleQuizQuestions = quizQuestions.filter((question) => {
    const placement = getQuestionPlacement(question)
    if (placement.type === 'after_part') return currentPart?.id === placement.partId
    return isLastPart
  })
  const answerQuestion = (question) => {
    const selectedAnswer = quizSelections[question.id]
    if (selectedAnswer === undefined) return
    setQuizResults((prev) => ({ ...prev, [question.id]: selectedAnswer }))
    const isCorrect = selectedAnswer === question.correct_option_index
    setQuizFeedback({
      type: isCorrect ? 'correct' : 'wrong',
      message: isCorrect ? 'Răspuns corect' : 'Răspuns greșit',
    })
  }
  const renderQuizSection = (title = 'Chestionar') => {
    if (!lesson || !canAccessQuiz(lesson, isPremium)) return null
    if (visibleQuizQuestions.length === 0) return null

    return (
      <div className="mt-16 space-y-8 border-t border-slate-200/50 dark:border-white/10 pt-10 relative z-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <HelpCircle className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">{title}</h3>
              <p className="text-xs font-bold text-muted-foreground">
                {quizAnsweredCount} din {quizQuestions.length} întrebări verificate
              </p>
            </div>
          </div>
          {hasCompletedQuiz && (
            <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
              Scor {quizScore}/{quizQuestions.length}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {visibleQuizQuestions.map((question, questionIndex) => {
            const selectedAnswer = quizSelections[question.id]
            const submittedAnswer = quizResults[question.id]
            const answered = submittedAnswer !== undefined
            const options = getQuestionOptions(question)

            return (
              <div key={question.id} className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-6 shadow-sm">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Întrebarea {questionIndex + 1}
                </p>
                <p className="mb-5 text-lg font-black text-slate-800 dark:text-slate-100">{question.question_text}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {options.map((option, optionIndex) => {
                    const selected = selectedAnswer === optionIndex
                    const correct = question.correct_option_index === optionIndex
                    const showCorrect = answered && correct
                    const showWrong = answered && submittedAnswer === optionIndex && !correct

                    return (
                      <button
                        key={`${question.id}-${optionIndex}`}
                        type="button"
                        onClick={() => {
                          setQuizSelections((prev) => ({ ...prev, [question.id]: optionIndex }))
                          setQuizResults((prev) => {
                            const next = { ...prev }
                            delete next[question.id]
                            return next
                          })
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-all ${
                          showCorrect
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 ring-2 ring-emerald-500/20 dark:text-emerald-300'
                            : showWrong
                              ? 'border-red-500 bg-red-500/15 text-red-700 ring-2 ring-red-500/20 dark:text-red-300'
                              : selected
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    onClick={() => answerQuestion(question)}
                    disabled={selectedAnswer === undefined}
                    className="rounded-2xl bg-indigo-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Răspunde
                  </Button>
                  {answered && (
                    <p className={`text-xs font-black uppercase tracking-widest ${submittedAnswer === question.correct_option_index ? 'text-emerald-500' : 'text-destructive'}`}>
                      {submittedAnswer === question.correct_option_index ? 'Răspuns corect' : 'Răspuns greșit'}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 pb-20">
      <Navbar />
      <AnimatePresence>
        {quizFeedback && (
          <motion.div
            key={quizFeedback.type}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.95 }}
            className="fixed left-1/2 top-8 z-[100] -translate-x-1/2"
          >
            <div className={`flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm font-black uppercase tracking-widest shadow-2xl backdrop-blur-xl ${
              quizFeedback.type === 'correct'
                ? 'border-emerald-500/30 bg-emerald-500/95 text-white shadow-emerald-500/20'
                : 'border-red-500/30 bg-red-500/95 text-white shadow-red-500/20'
            }`}>
              {quizFeedback.type === 'correct' ? (
                <CheckCircle2 className="size-6" strokeWidth={3} />
              ) : (
                <XCircle className="size-6" strokeWidth={3} />
              )}
              {quizFeedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container pt-12">
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-6 text-center">
              <div className="relative">
                <div className="size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-8 animate-pulse rounded-full bg-primary/10" />
                </div>
              </div>
              <p className="text-lg font-bold animate-pulse text-muted-foreground">Pregătim materia...</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-8 text-center space-y-4">
               <AlertMessage message={error} variant="error" />
               <Button onClick={() => navigate('/dashboard')}>Înapoi în siguranță</Button>
            </div>
          ) : lesson ? (
            <div className="space-y-10">
              <div className="space-y-6">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-3"
                >
                  {profileMeta && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                      {profileMeta.label}
                    </span>
                  )}
                  {subjectMeta && (
                    <span className="inline-flex items-center rounded-full bg-slate-200 dark:bg-white/5 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10">
                      {subjectMeta.label}
                    </span>
                  )}
                  {hasParts && (
                    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 border border-indigo-500/20">
                      Pasul {currentPartIndex + 1} / {parts.length}
                    </span>
                  )}
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-4xl font-black tracking-tight sm:text-6xl lg:leading-[1.1]"
                >
                  {lesson.title}
                </motion.h1>

                {!isPremium && isLessonPremium(lesson) ? (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-slate-600 dark:text-slate-300">
                    Ai acces preview la primele {getPreviewPartCount(lesson)} {hasParts ? 'părți' : 'secțiuni'}.
                    <Button variant="link" onClick={openPremiumModal} className="ml-2 px-0 text-primary">
                      Deblochează Premium
                    </Button>
                  </div>
                ) : null}
              </div>

              <motion.div
                key={`${lessonId}-${currentPartIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative group"
              >
                {/* Glass Card Effect */}
                <div className="absolute -inset-1 bg-gradient-to-b from-primary/10 to-transparent rounded-[2.5rem] blur-xl opacity-20" />
                
                <div className="relative bg-white/80 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] p-8 md:p-14 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl pointer-events-none -mr-32 -mt-32 rounded-full" />
                  
                  <div className="prose prose-slate max-w-none dark:prose-invert relative z-10">
                    {/* Main Content (if no parts) */}
                    {!hasParts && lesson.content && (
                      <div className="text-xl leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                        {lesson.content}
                      </div>
                    )}

                    {/* Sequential Lesson Part */}
                    {currentPart ? (
                      <div className="space-y-12">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                             <div className="h-6 w-1 bg-primary rounded-full" />
                             <h2 className="text-3xl font-black tracking-tight m-0">{currentPart.title}</h2>
                          </div>
                        </div>
                        
                        {currentPart.video_url && (
                          <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-black shadow-2xl border border-white/5 ring-1 ring-white/10 group/video">
                            <iframe
                              className="size-full"
                              src={currentPart.video_url.replace('watch?v=', 'embed/').split('&')[0]}
                              title={currentPart.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        )}

                        <div className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                          {currentPart.content}
                        </div>
                      </div>
                    ) : !lesson.content && (
                       <div className="py-20 text-center space-y-6">
                          <BookOpen className="mx-auto size-24 text-slate-100 dark:text-white/5 border border-slate-200 dark:border-white/10 rounded-full p-6" />
                          <div className="space-y-2">
                             <p className="text-xl font-bold text-slate-400">Curicula este în curs de actualizare</p>
                             <p className="text-sm text-muted-foreground max-w-xs mx-auto">Profesorii noștri lucrează la materialele premium pentru această lecție.</p>
                          </div>
                          <Button variant="outline" onClick={() => navigate('/dashboard')} className="rounded-full">Revin mai târziu</Button>
                       </div>
                    )}
                  </div>

                  {/* Additional Resources Section (Images/Documents) */}
                  {lesson.lesson_files && lesson.lesson_files.length > 0 && canAccessLessonFiles(lesson, isPremium) && (
                    <div className="mt-16 space-y-8 border-t border-slate-200/50 dark:border-white/10 pt-10 relative z-10">
                      <div className="flex items-center gap-3">
                         <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="size-4" />
                         </div>
                         <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Resurse Suplimentare</h3>
                      </div>

                      {/* Image Gallery */}
                      {lesson.lesson_files.filter(f => f.file_type?.startsWith('image/')).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {lesson.lesson_files.filter(f => f.file_type?.startsWith('image/')).map(img => (
                            <div key={img.id} className="group relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                              <img 
                                src={img.file_url} 
                                alt={img.file_name} 
                                className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                <span className="text-xs font-bold text-white truncate">{img.file_name}</span>
                              </div>
                              <a 
                                href={img.file_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="absolute top-3 right-3 size-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Document List */}
                      {lesson.lesson_files.filter(f => !f.file_type?.startsWith('image/')).length > 0 && (
                        <div className="grid grid-cols-1 gap-3">
                          {lesson.lesson_files.filter(f => !f.file_type?.startsWith('image/')).map(doc => (
                            <a 
                              key={doc.id}
                              href={doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => {
                                if (doc.is_solved_content && !canDownloadSolvedContent(isPremium)) {
                                  event.preventDefault()
                                  openPremiumModal()
                                }
                              }}
                              className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/[0.08] transition-all group/doc"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                 <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover/doc:bg-primary/20 group-hover/doc:text-primary transition-colors">
                                    <FileText className="size-5" />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-bold truncate pr-4">{doc.file_name}</p>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Descarcă documentul</p>
                                 </div>
                              </div>
                              <ArrowRight className="size-4 text-slate-600 group-hover/doc:text-primary group-hover/doc:translate-x-1 transition-all" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isPremium && lesson.lesson_files?.length > 0 && (
                    <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm text-slate-600 dark:text-slate-300">
                      Materialele și fișierele rezolvate sunt disponibile în Premium.
                      <Button variant="link" onClick={openPremiumModal} className="ml-2 px-0 text-primary">
                        Vezi oferta
                      </Button>
                    </div>
                  )}

                  {!canAccessQuiz(lesson, isPremium) && quizQuestions.length > 0 && isLastPart ? (
                    <div className="mt-10 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm text-slate-600 dark:text-slate-300">
                      Chestionarul și verificarea cunoștințelor sunt incluse în Premium.
                      <Button variant="link" onClick={openPremiumModal} className="ml-2 px-0 text-primary">
                        Vezi oferta
                      </Button>
                    </div>
                  ) : null}

                  {renderQuizSection(isLastPart ? 'Chestionar Final' : 'Verificare Rapidă')}

                  {/* Navigation Footer */}
                  <div className="mt-16 flex flex-col items-center justify-between border-t border-slate-200/50 dark:border-white/10 pt-10 sm:flex-row gap-8 relative z-10">
                    <div className="flex flex-col items-center sm:items-start space-y-1">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-500">
                        {isLastPart ? 'Ai terminat materia?' : 'Continuă Pregătirea'}
                      </p>
                      {hasParts && (
                        <div className="flex items-center gap-2">
                           <div className="flex -space-x-1">
                              {parts.map((_, i) => (
                                <div key={i} className={`size-1.5 rounded-full ring-2 ring-background ${i <= currentPartIndex ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-800'}`} />
                              ))}
                           </div>
                           <span className="text-[10px] font-bold text-muted-foreground uppercase">Secțiunea {currentPartIndex + 1} din {parts.length}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-4 w-full sm:w-auto">
                      {!isFirstPart && (
                        <Button 
                          variant="ghost" 
                          onClick={handlePrevPart} 
                          className="flex-1 sm:flex-none rounded-2xl h-14 px-8 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]"
                        >
                          Înapoi
                        </Button>
                      )}
                      
                      {!isLastPart ? (
                        <Button 
                          onClick={handleNextPart} 
                          className="flex-1 sm:flex-none h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 shadow-xl shadow-primary/20 gap-3 font-black uppercase tracking-widest text-[10px]"
                        >
                          Următoarea Parte
                          <ArrowRight className="size-4" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleComplete} 
                          disabled={saving} 
                          className="flex-1 sm:flex-none h-14 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 font-black uppercase tracking-widest text-[10px] gap-2"
                        >
                          {saving ? 'Se salvează...' : (
                            <>
                              <CheckCircle2 className="size-4" />
                              Finalizează Lecția
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-20 space-y-6 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
               <BookOpen className="size-16 text-slate-700 mx-auto" />
               <p className="text-xl font-bold text-slate-400 italic">Lecția nu a putut fi găsită sau a fost mutată.</p>
               <Button variant="link" onClick={() => navigate('/dashboard')} className="text-primary font-bold">Înapoi la Dashboard</Button>
            </div>
          )}
        </div>
      </main>

      <footer className="container py-12 text-center opacity-30">
        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all">
          <GraduationCap className="size-5" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">ScholarBAC Premium</span>
        </div>
      </footer>
    </div>
  )
}
