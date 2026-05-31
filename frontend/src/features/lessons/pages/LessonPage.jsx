import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  CheckCircle2, 
  XCircle,
  BookOpen, 
  FileText,
  ArrowRight,
  ExternalLink,
  HelpCircle
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { getLessonById } from '../../../services/lessonService'
import { markLessonCompleted } from '../../../services/progressService'
import { submitQuizAnswer } from '../../../services/quizAttemptService'
import {
  canAccessLessonPart,
  canAccessQuiz,
  canTrackLessonCompletion,
} from '../../../services/premiumAccessService'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getTrustedStorageUrl, resolveLessonVideoEmbedSrc } from '../../../shared/utils/safeUrl'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Navbar } from '../../../shared/ui/Navbar'
import { BrandLogo } from '../../../shared/ui/BrandLogo'
import { getProfileMeta, SUBJECT_PARTS } from '../profiles'

function AcademicContextBox({ className = '' }) {
  return (
    <div className={`rounded-[2rem] border-2 border-dashed border-border bg-slate-50/50 p-8 dark:bg-white/2 space-y-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="size-2 rounded-full bg-primary" />
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Context Academic</h4>
      </div>
      <p className="text-xs font-medium leading-relaxed text-slate-500 italic">
        &quot;Studiul matematicii necesită rigoare și perseverență. Fiecare teoremă înțeleasă este o bază solidă pentru succesul tău viitor.&quot;
      </p>
      <div className="border-t border-border pt-4">
        <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Bibliografie Recomandată</p>
        <p className="mt-1 text-[10px] font-bold text-slate-600">Ministerul Educației - Programa 2024</p>
      </div>
    </div>
  )
}

export function LessonPage() {
  const { lessonId } = useParams()
  const { user, isPremium, openPremiumModal, refreshSessionUser } = useAuth()
  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )
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
        const lessonData = await getLessonById(lessonId, { isPremium, activeProfiles })
        if (!mounted) return
        if (!lessonData) {
          setError('Această lecție necesită acces Premium sau un program activ.')
          setLesson(null)
          return
        }
        setLesson(lessonData)
        setCurrentPartIndex(0)
        setQuizSelections({})
        setQuizResults({})
        setQuizFeedback(null)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadLesson()
    return () => {
      mounted = false
    }
  }, [lessonId, isPremium, activeProfiles])

  useEffect(() => {
    if (loading) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [lessonId, loading, currentPartIndex])

  useEffect(() => {
    if (!quizFeedback) return
    const timer = setTimeout(() => setQuizFeedback(null), 1800)
    return () => clearTimeout(timer)
  }, [quizFeedback])

  const subjectMeta = lesson
    ? SUBJECT_PARTS.find((subject) => subject.value === lesson.subject_part)
    : null
  const profileMeta = lesson ? getProfileMeta(lesson.profile) : null

  const parts = lesson?.lesson_parts || []
  const supplementaryFiles = (lesson?.lesson_files || []).filter((file) => !file.is_solved_content)
  const hasSidebar = supplementaryFiles.length > 0
  const hasParts = parts.length > 0
  const canCompleteLesson = hasParts || Boolean(lesson?.content?.trim())
  const currentPart = hasParts ? parts[currentPartIndex] : null
  const isLastPart = hasParts ? currentPartIndex === parts.length - 1 : true
  const isFirstPart = currentPartIndex === 0
  const quizQuestions = lesson?.quiz_questions || []
  const quizAnsweredCount = quizQuestions.filter((question) => quizResults[question.id] !== undefined).length
  const quizScore = quizQuestions.filter((question) => quizResults[question.id] === true).length
  const hasCompletedQuiz = quizQuestions.length > 0 && quizAnsweredCount === quizQuestions.length
  const getQuestionOptions = (question) => {
    return Array.isArray(question.options) ? question.options : question.options?.choices || []
  }
  const getQuestionPlacement = (question) => {
    if (Array.isArray(question.options)) return { type: 'end', partId: '' }
    return question.options?.placement || { type: 'end', partId: '' }
  }
  // Întrebările pot fi ancorate „după o anumită parte” (apar doar pe acea parte) sau, în
  // mod implicit, la finalul lecției (apar doar pe ultima parte).
  const visibleQuizQuestions = quizQuestions.filter((question) => {
    const placement = getQuestionPlacement(question)
    if (placement.type === 'after_part') return currentPart?.id === placement.partId
    return isLastPart
  })
  const visibleQuizAnsweredCount = visibleQuizQuestions.filter(
    (question) => quizResults[question.id] !== undefined,
  ).length
  const hasCompletedVisibleQuiz = visibleQuizQuestions.length === 0
    || visibleQuizAnsweredCount === visibleQuizQuestions.length

  const handleComplete = async () => {
    if (!user?.id || !lesson?.id || !canCompleteLesson || !canTrackLessonCompletion(lesson, isPremium, activeProfiles)) return
    if (!hasCompletedVisibleQuiz) {
      setQuizFeedback({
        type: 'wrong',
        message: 'Răspunde la toate întrebările înainte de a finaliza lecția.',
      })
      return
    }
    setSaving(true)
    try {
      const score = quizQuestions.length > 0
        ? Math.round((quizScore / quizQuestions.length) * 100)
        : null
      await markLessonCompleted({ lessonId: lesson.id, score })
      await refreshSessionUser()
      navigate('/dashboard')
    } catch (saveError) {
      setError(toUserFacingError(saveError, USER_MESSAGES.save))
    } finally {
      setSaving(false)
    }
  }

  const handleNextPart = () => {
    if (!lesson?.lesson_parts || currentPartIndex >= lesson.lesson_parts.length - 1) return
    if (!hasCompletedVisibleQuiz) {
      setQuizFeedback({
        type: 'wrong',
        message: 'Răspunde la toate întrebările înainte de a continua.',
      })
      return
    }
    const nextPartIndex = currentPartIndex + 1
    if (!canAccessLessonPart(lesson, nextPartIndex, isPremium, activeProfiles)) {
      openPremiumModal()
      return
    }
    setCurrentPartIndex(nextPartIndex)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrevPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const answerQuestion = async (question) => {
    const selectedAnswer = quizSelections[question.id]
    if (selectedAnswer === undefined) return
    if (!canAccessQuiz(lesson, isPremium, activeProfiles)) {
      openPremiumModal()
      return
    }

    try {
      // Corectitudinea este evaluată pe server (submitQuizAnswer); clientul nu primește
      // niciodată indexul răspunsului corect, ca să nu poată fi extras din rețea.
      const isCorrect = await submitQuizAnswer({
        questionId: question.id,
        selectedIndex: selectedAnswer,
      })
      setQuizResults((prev) => ({ ...prev, [question.id]: isCorrect }))
      setQuizFeedback({
        type: isCorrect ? 'correct' : 'wrong',
        message: isCorrect ? 'Verificat: Corect' : 'Verificat: Incorect',
      })
    } catch (submitError) {
      setError(toUserFacingError(submitError, 'Eroare la procesarea răspunsului.'))
    }
  }

  const renderQuizSection = (title = 'Evaluare Cunoștințe') => {
    if (!lesson) return null
    if (visibleQuizQuestions.length === 0) return null

    return (
      <div className="mt-24 space-y-10 border-t-4 border-double border-border pt-16 relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-slate-900 text-white flex items-center justify-center dark:bg-white dark:text-slate-900">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1">{title}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Sesiune de testare academică / {visibleQuizAnsweredCount} din {visibleQuizQuestions.length} finalizate
              </p>
            </div>
          </div>
          {hasCompletedQuiz && (
            <div className="rounded-xl bg-emerald-500 text-white px-6 py-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
              Scor Final: {quizScore}/{quizQuestions.length}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {visibleQuizQuestions.map((question, questionIndex) => {
            const selectedAnswer = quizSelections[question.id]
            const answered = quizResults[question.id] !== undefined
            const isCorrect = quizResults[question.id] === true
            const options = getQuestionOptions(question)

            return (
              <div key={question.id} className="rounded-2xl border-2 border-border bg-white dark:bg-slate-900 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                   <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded">Item {questionIndex + 1}</span>
                </div>
                <p className="mb-8 text-xl font-black text-slate-900 dark:text-white leading-tight">{question.question_text}</p>
                {question.image_url ? (
                  <div className="mb-8 overflow-hidden rounded-xl border-2 border-border shadow-inner">
                    <img
                      src={question.image_url}
                      alt={question.question_text}
                      className="w-full max-h-96 object-contain bg-slate-50"
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {options.map((option, optionIndex) => {
                    const selected = selectedAnswer === optionIndex
                    const showCorrect = answered && isCorrect && selected
                    const showWrong = answered && !isCorrect && selected

                    return (
                      <button
                        key={`${question.id}-${optionIndex}`}
                        type="button"
                        onClick={() => {
                          // La reselectarea unei opțiuni, anulăm rezultatul anterior ca
                          // utilizatorul să poată reverifica răspunsul.
                          setQuizSelections((prev) => ({ ...prev, [question.id]: optionIndex }))
                          setQuizResults((prev) => {
                            const next = { ...prev }
                            delete next[question.id]
                            return next
                          })
                        }}
                        className={`rounded-xl border-2 px-6 py-4 text-left text-sm font-bold transition-all duration-300 ${
                          showCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : showWrong
                              ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20'
                              : selected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-slate-50/50 text-slate-600 hover:border-slate-400 dark:bg-white/2 dark:text-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t-2 border-border pt-6">
                  <Button
                    type="button"
                    onClick={() => answerQuestion(question)}
                    disabled={selectedAnswer === undefined || answered}
                    className="rounded-xl px-8"
                  >
                    Verifică Itemul
                  </Button>
                  {answered && (
                    <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                      {isCorrect ? 'Răspuns Validat' : 'Răspuns Invalid'}
                    </div>
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
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500 bg-slate-50 dark:bg-slate-950 pb-16">
      <Navbar />
      <AnimatePresence>
        {quizFeedback && (
          <motion.div
            key={quizFeedback.type}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            className="fixed left-1/2 top-10 z-[100] -translate-x-1/2"
          >
            <div className={`flex items-center gap-4 rounded-xl border-2 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-2xl backdrop-blur-xl ${
              quizFeedback.type === 'correct'
                ? 'border-emerald-500/30 bg-emerald-600 text-white'
                : 'border-red-500/30 bg-red-600 text-white'
            }`}>
              {quizFeedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="container pt-16">
        <div className={hasSidebar ? 'mx-auto max-w-6xl' : 'mx-auto max-w-4xl'}>
          {loading ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-8 text-center">
              <div className="size-16 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
              <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Consultare Arhivă...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-12 text-center space-y-6">
               <AlertMessage message={error} variant="error" />
               <Button onClick={() => navigate('/dashboard')} variant="outline">Reîntoarcere în Siguranță</Button>
            </div>
          ) : lesson ? (
            <div className={hasSidebar ? 'grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1fr)_280px]' : 'space-y-10'}>
              {/* Main Content Column */}
              <div className="space-y-10">
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-wrap gap-2"
                  >
                    <span className="inline-flex items-center rounded-lg bg-primary/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20">
                      {profileMeta?.label}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-border">
                      {subjectMeta?.label}
                    </span>
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-black tracking-tighter sm:text-7xl leading-[0.95]"
                  >
                    {lesson.title}
                  </motion.h1>
                </div>

                <motion.div
                  key={`${lessonId}-${currentPartIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <div className="relative bg-white dark:bg-slate-900 border-2 border-border rounded-[2.5rem] p-10 md:p-16 shadow-2xl shadow-slate-200/50 dark:shadow-none">
                    <div className="prose prose-slate max-w-none dark:prose-invert relative z-10">
                      {/* Sequential Lesson Part */}
                      {currentPart ? (
                        <div className="space-y-12">
                          <div className="pb-8 border-b-2 border-border mb-8">
                             <div className="flex items-center gap-4 mb-4">
                                <span className="text-4xl font-black text-primary opacity-20">0{currentPartIndex + 1}</span>
                                <h2 className="text-3xl font-black uppercase tracking-tighter m-0">{currentPart.title}</h2>
                             </div>
                          </div>
                          
                          {currentPart.video_url && resolveLessonVideoEmbedSrc(currentPart.video_url) && (
                            <div className="relative aspect-video overflow-hidden rounded-2xl border-4 border-border bg-black shadow-2xl group/video">
                              <iframe
                                className="size-full"
                                src={resolveLessonVideoEmbedSrc(currentPart.video_url)}
                                title={currentPart.title}
                                sandbox="allow-scripts allow-same-origin allow-presentation"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          )}

                          {currentPart.image_url ? (
                            <img
                              src={currentPart.image_url}
                              alt={currentPart.title}
                              className="w-full rounded-2xl border-2 border-border object-cover shadow-lg"
                            />
                          ) : null}

                          <div className="text-xl leading-[1.8] text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium font-serif italic">
                            {currentPart.content}
                          </div>
                        </div>
                      ) : (
                         <div className="py-24 text-center space-y-8">
                            <BookOpen className="mx-auto size-20 text-slate-200" />
                            <div className="space-y-3">
                               <p className="text-2xl font-black uppercase tracking-tighter">Material în curs de redactare</p>
                               <p className="text-sm font-medium text-slate-400 max-w-xs mx-auto">Profesorii noștri finalizează transcrierea academică pentru acest capitol.</p>
                            </div>
                            <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-xl">Revin la Index</Button>
                         </div>
                      )}
                    </div>

                    {renderQuizSection()}

                    {canCompleteLesson && (
                    <div className="mt-20 flex flex-col items-center justify-between border-t-2 border-border pt-12 sm:flex-row gap-10">
                      <div className="flex flex-col items-center sm:items-start space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                          Status Lectură
                        </p>
                        {hasParts && (
                          <div className="flex items-center gap-3">
                             <div className="flex gap-1.5">
                                {parts.map((_, i) => (
                                  <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= currentPartIndex ? 'w-8 bg-primary' : 'w-2 bg-border'}`} />
                                ))}
                             </div>
                             <span className="text-[10px] font-black uppercase text-primary tracking-widest">Pasul {currentPartIndex + 1} / {parts.length}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-4 w-full sm:w-auto">
                        {!isFirstPart && (
                          <Button 
                            variant="outline" 
                            onClick={handlePrevPart} 
                            className="flex-1 sm:flex-none h-16 px-10 rounded-xl font-black uppercase tracking-widest text-[10px]"
                          >
                            Pagina Anterioară
                          </Button>
                        )}
                        
                        {!isLastPart ? (
                          <Button 
                            onClick={handleNextPart}
                            disabled={!hasCompletedVisibleQuiz}
                            className="flex-1 sm:flex-none h-16 px-12 rounded-xl bg-primary text-white shadow-xl shadow-primary/20 gap-4"
                          >
                            Următoarea Secțiune
                            <ArrowRight className="size-4" />
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleComplete} 
                            disabled={saving || !hasCompletedVisibleQuiz}
                            className="flex-1 sm:flex-none h-16 px-14 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl font-black uppercase tracking-widest text-[10px] gap-3"
                          >
                            {saving ? 'Validare...' : 'Finalizează Studiul'}
                          </Button>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {hasSidebar ? (
              <aside className="space-y-10">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 border-b-2 border-border pb-4">
                     <FileText className="size-5 text-primary" />
                     <h3 className="text-sm font-black uppercase tracking-[0.2em]">Materiale Suport</h3>
                  </div>

                  <div className="grid gap-4">
                     {supplementaryFiles.map(file => {
                        const fileHref = getTrustedStorageUrl(file.file_url)
                        if (!fileHref) return null
                        const isImage = file.file_type?.startsWith('image/')
                        
                        return (
                          <a 
                            key={file.id}
                            href={fileHref}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group block p-4 rounded-xl border-2 border-border bg-white dark:bg-slate-900 hover:border-primary transition-all duration-300"
                          >
                             {isImage ? (
                               <div className="aspect-video mb-4 overflow-hidden rounded-lg bg-slate-50 border border-border">
                                  <img src={fileHref} alt={file.file_name} className="size-full object-cover group-hover:scale-105 transition-transform" />
                               </div>
                             ) : (
                               <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary mb-3 border border-primary/10">
                                  <FileText className="size-5" />
                               </div>
                             )}
                             <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mb-1">{file.file_name}</p>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isImage ? 'Vizualizează' : 'Descarcă PDF'}</span>
                                <ExternalLink className="size-3 text-slate-300 group-hover:text-primary transition-colors" />
                             </div>
                          </a>
                        )
                     })}
                  </div>
                </motion.div>

                <AcademicContextBox />
              </aside>
              ) : (
                <AcademicContextBox className="max-w-2xl mx-auto" />
              )}
            </div>
          ) : (
            <div className="text-center py-32 space-y-8 bg-white border-2 border-border rounded-[2.5rem]">
               <BookOpen className="size-16 text-slate-200 mx-auto" />
               <p className="text-2xl font-black uppercase tracking-tighter">Resursa nu a putut fi localizată</p>
               <Button onClick={() => navigate('/dashboard')} className="rounded-xl">Reîntoarcere la Arhivă</Button>
            </div>
          )}
        </div>
      </main>

      <footer className="container py-12 text-center opacity-40">
        <div className="flex flex-col items-center gap-4 grayscale hover:grayscale-0 transition-all duration-700">
          <BrandLogo className="size-10" />
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-[0.6em] text-slate-900 dark:text-white">
              MathUP Scholarly Syllabus
            </span>
            <span className="block text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Platinum Access Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
