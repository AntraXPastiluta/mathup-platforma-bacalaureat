import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  BookOpen,
  FileText,
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  NotebookPen,
  GraduationCap,
  Crown,
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
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
import { MathContent } from '../../../shared/ui/MathContent'
import { getProfileMeta, SUBJECT_PARTS } from '../profiles'

// Serif de manuscris pentru numerale și accente — fără fonturi externe (CSP-safe),
// aceeași stivă „demonstrație tipărită” folosită pe Dashboard / Welcome / Profil.
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

// Fiecare subiect primește o identitate cromatică proprie (ca pe tabloul de bord):
// I → indigo, II → violet/fuchsia, III → emerald/teal.
const SUBJECT_ACCENTS = {
  1: {
    label: 'text-indigo-600 dark:text-indigo-400',
    line: 'bg-indigo-500',
    soft: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
    spine: 'from-indigo-500 via-indigo-400 to-indigo-300',
    optSelected: 'border-indigo-500 bg-indigo-500/5 text-indigo-700 dark:text-indigo-300',
    letterSelected: 'bg-indigo-500 text-white',
  },
  2: {
    label: 'text-violet-600 dark:text-violet-400',
    line: 'bg-violet-500',
    soft: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300',
    spine: 'from-violet-500 via-fuchsia-400 to-fuchsia-300',
    optSelected: 'border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-300',
    letterSelected: 'bg-violet-500 text-white',
  },
  3: {
    label: 'text-emerald-600 dark:text-emerald-400',
    line: 'bg-emerald-500',
    soft: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    spine: 'from-emerald-500 via-teal-400 to-teal-300',
    optSelected: 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    letterSelected: 'bg-emerald-500 text-white',
  },
}
const DEFAULT_ACCENT = SUBJECT_ACCENTS[1]

// Etichetă editorială: linie-accent scurtă + micro-text majuscul, exact ca pe Dashboard.
function SectionLabel({ children, lineClass = 'bg-primary', textClass = 'text-primary', className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className={`h-px w-7 shrink-0 ${lineClass}`} aria-hidden />
      <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${textClass}`}>{children}</span>
    </span>
  )
}

// Apariție unică la mount (folosește keyframe-ul CSS comun, prietenos cu pagina ambientală).
function Reveal({ delay = 0, as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`dashboard-reveal ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined} {...rest}>
      {children}
    </Tag>
  )
}

// Fișa de studiu din coloana laterală — înlocuiește vechea „bibliografie” cu un sfat util.
function StudyNote({ subjectIsFree }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-background/60 p-5">
      <div className="flex items-center gap-2.5">
        <GraduationCap className="size-4 text-primary" aria-hidden />
        <h4 className="font-heading text-xs font-black uppercase tracking-[0.16em] text-foreground">Sfat de studiu</h4>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Parcurge fiecare pas în ordine și rezolvă mini-testul pe măsură ce avansezi — recapitularea activă
        fixează noțiunile mult mai bine decât simpla recitire.
      </p>
      {subjectIsFree && (
        <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          Subiectul III este disponibil gratuit pentru toți elevii.
        </p>
      )}
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
  const accent = SUBJECT_ACCENTS[lesson?.subject_part] || DEFAULT_ACCENT

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
        message: isCorrect ? 'Răspuns corect!' : 'Răspuns greșit',
      })
    } catch (submitError) {
      setError(toUserFacingError(submitError, 'Eroare la procesarea răspunsului.'))
    }
  }

  const renderQuizSection = (title = 'Verifică-ți cunoștințele') => {
    if (!lesson) return null
    if (visibleQuizQuestions.length === 0) return null

    return (
      <section className="mt-16 border-t border-border pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${accent.soft}`}>
              <NotebookPen className="size-5" />
            </span>
            <div>
              <SectionLabel lineClass={accent.line} textClass={accent.label}>Mini-test</SectionLabel>
              <h3 className="mt-1.5 font-heading text-xl font-black tracking-tight">{title}</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {visibleQuizAnsweredCount} din {visibleQuizQuestions.length}{' '}
                {visibleQuizQuestions.length === 1 ? 'întrebare rezolvată' : 'întrebări rezolvate'}
              </p>
            </div>
          </div>
          {hasCompletedQuiz && (
            <span
              style={{ fontFamily: SERIF }}
              className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold italic text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-4" />
              Scor {quizScore} / {quizQuestions.length}
            </span>
          )}
        </div>

        <div className="mt-8 space-y-5">
          {visibleQuizQuestions.map((question, questionIndex) => {
            const selectedAnswer = quizSelections[question.id]
            const answered = quizResults[question.id] !== undefined
            const isCorrect = quizResults[question.id] === true
            const options = getQuestionOptions(question)

            return (
              <div
                key={question.id}
                className={`rounded-2xl border bg-white p-6 transition-colors duration-300 dark:bg-slate-900/80 sm:p-7 ${
                  answered ? (isCorrect ? 'border-emerald-500/40' : 'border-red-400/40') : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: SERIF }} className={`text-2xl font-bold italic leading-none ${accent.label}`}>
                    {String(questionIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Întrebarea {questionIndex + 1}
                  </span>
                </div>
                <MathContent
                  content={question.question_text}
                  className="mt-4 font-heading text-lg font-bold leading-snug text-foreground sm:text-xl"
                />
                {question.image_url ? (
                  <div className="mt-5 overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-950">
                    <img
                      src={question.image_url}
                      alt={question.question_text}
                      className="mx-auto max-h-96 w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {options.map((option, optionIndex) => {
                    const selected = selectedAnswer === optionIndex
                    const showCorrect = answered && isCorrect && selected
                    const showWrong = answered && !isCorrect && selected
                    const letter = String.fromCharCode(65 + optionIndex)
                    const letterClass = showCorrect || showWrong
                      ? 'bg-white/25 text-white'
                      : selected
                        ? accent.letterSelected
                        : 'border border-border bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'

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
                        className={`group flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-all duration-200 ${
                          showCorrect
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : showWrong
                              ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/20'
                              : selected
                                ? accent.optSelected
                                : 'border-border bg-slate-50/60 text-slate-600 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white dark:bg-white/5 dark:text-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <span
                          style={{ fontFamily: SERIF }}
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold italic ${letterClass}`}
                        >
                          {letter}
                        </span>
                        <MathContent content={option} className="min-w-0 flex-1" />
                      </button>
                    )
                  })}
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    onClick={() => answerQuestion(question)}
                    disabled={selectedAnswer === undefined || answered}
                    size="sm"
                    className="rounded-xl px-6"
                  >
                    Verifică răspunsul
                  </Button>
                  {answered && (
                    <span
                      className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                        isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                      {isCorrect ? 'Răspuns corect' : 'Mai încearcă'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  const videoSrc = currentPart?.video_url ? resolveLessonVideoEmbedSrc(currentPart.video_url) : null

  return (
    <div className="relative min-h-screen text-foreground">
      <MathRainCurtain />
      <Navbar />

      <AnimatePresence>
        {quizFeedback && (
          <motion.div
            key={`${quizFeedback.type}-${quizFeedback.message}`}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="fixed left-1/2 top-24 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
          >
            <div
              className={`flex items-center justify-center gap-3 rounded-2xl border px-5 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl backdrop-blur-md ${
                quizFeedback.type === 'correct'
                  ? 'border-emerald-400/40 bg-emerald-600/95'
                  : 'border-red-400/40 bg-red-600/95'
              }`}
            >
              {quizFeedback.type === 'correct' ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
              {quizFeedback.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="page-ambient-content container relative py-10 pb-24 sm:py-14">
        <div className={`mx-auto w-full ${hasSidebar ? 'max-w-6xl' : 'max-w-4xl'}`}>
          {loading ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
              <div className="size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">Se încarcă lecția...</p>
            </div>
          ) : error ? (
            <Reveal className="mx-auto max-w-lg">
              <div className="dashboard-glass-card relative overflow-hidden p-8 text-center sm:p-10">
                <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
                <div className="relative space-y-6">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-background">
                    <BookOpen className="size-7 text-primary" />
                  </span>
                  <AlertMessage message={error} variant="error" />
                  <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-xl">
                      Înapoi la tabloul de bord
                    </Button>
                    {!isPremium && (
                      <Button onClick={openPremiumModal} className="gap-2 rounded-xl">
                        <Crown className="size-4" />
                        Vezi Premium
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          ) : lesson ? (
            <div className={hasSidebar ? 'grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]' : ''}>
              {/* ── Coloana principală ─────────────────────────── */}
              <div className="min-w-0 space-y-8">
                {/* Antet editorial */}
                <Reveal as="header" className="space-y-5">
                  <SectionLabel lineClass={accent.line} textClass={accent.label}>
                    {profileMeta?.label} · {subjectMeta?.label}
                  </SectionLabel>

                  <h1 className="font-heading text-4xl font-black leading-[1.03] tracking-tight sm:text-5xl lg:text-[3.35rem]">
                    {lesson.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center rounded-lg border border-border bg-background/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {profileMeta?.label}
                    </span>
                    <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${accent.soft}`}>
                      Subiectul {subjectMeta?.roman}
                    </span>
                    {lesson.subject_part === 3 && (
                      <span className="inline-flex items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Gratuit
                      </span>
                    )}
                    {hasParts && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/70 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <span style={{ fontFamily: SERIF }} className="text-sm font-bold italic text-foreground">
                          {parts.length}
                        </span>
                        {parts.length === 1 ? 'pas' : 'pași'}
                      </span>
                    )}
                  </div>
                </Reveal>

                {/* Foaia de curs — fișă tipărită ce plutește peste „caietul” ambiental */}
                <motion.article
                  key={`${lessonId}-${currentPartIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden rounded-[2rem] border border-border bg-white shadow-xl shadow-slate-300/30 dark:bg-slate-900 dark:shadow-none"
                >
                  <span className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accent.spine}`} aria-hidden />
                  <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.05] dark:opacity-[0.07]" aria-hidden />

                  <div className="relative p-7 sm:p-10 md:p-14">
                    {currentPart ? (
                      <div>
                        <header className="grid grid-cols-[auto_1fr] items-start gap-4 sm:gap-6">
                          <span
                            style={{ fontFamily: SERIF }}
                            className={`select-none text-5xl font-bold italic leading-none opacity-25 sm:text-6xl ${accent.label}`}
                            aria-hidden
                          >
                            {String(currentPartIndex + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 pt-1">
                            <SectionLabel lineClass={accent.line} textClass={accent.label} className="mb-2.5">
                              {hasParts ? `Pasul ${currentPartIndex + 1} din ${parts.length}` : 'Lecție'}
                            </SectionLabel>
                            <h2 className="font-heading text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                              {currentPart.title}
                            </h2>
                          </div>
                        </header>

                        <div className="my-8 h-px w-full bg-border" />

                        {currentPart.video_url && videoSrc && (
                          <div className="mb-8 space-y-3">
                            <SectionLabel lineClass={accent.line} textClass={accent.label}>Material video</SectionLabel>
                            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-lg ring-1 ring-black/5">
                              <iframe
                                className="size-full"
                                src={videoSrc}
                                title={currentPart.title}
                                sandbox="allow-scripts allow-same-origin allow-presentation"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          </div>
                        )}

                        {currentPart.image_url ? (
                          <img
                            src={currentPart.image_url}
                            alt={currentPart.title}
                            className="mb-8 w-full rounded-2xl border border-border object-cover shadow-sm"
                          />
                        ) : null}

                        <MathContent
                          content={currentPart.content}
                          style={{ fontFamily: SERIF }}
                          className="text-[1.075rem] leading-[1.9] text-slate-700 dark:text-slate-300 sm:text-lg"
                        />
                      </div>
                    ) : (
                      <div className="space-y-7 py-16 text-center">
                        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-dashed border-border bg-background">
                          <BookOpen className="size-8 text-muted-foreground" />
                        </span>
                        <div className="space-y-2">
                          <p className="font-heading text-xl font-black tracking-tight">Lecția este în pregătire</p>
                          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                            Conținutul acestui capitol se află în curs de redactare. Revino în curând.
                          </p>
                        </div>
                        <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-xl">
                          Înapoi la lecții
                        </Button>
                      </div>
                    )}

                    {renderQuizSection()}

                    {canCompleteLesson && (
                      <div className="mt-14 border-t border-border pt-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                          {hasParts && (
                            <div className="space-y-2.5">
                              <SectionLabel lineClass={accent.line} textClass={accent.label}>Parcurs</SectionLabel>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  {parts.map((_, i) => (
                                    <span
                                      key={i}
                                      className={`h-1.5 rounded-full transition-all duration-500 ${
                                        i < currentPartIndex
                                          ? `w-6 ${accent.line}`
                                          : i === currentPartIndex
                                            ? `w-9 ${accent.line}`
                                            : 'w-2 bg-border'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span style={{ fontFamily: SERIF }} className="text-sm font-bold italic tabular-nums text-foreground">
                                  {currentPartIndex + 1} / {parts.length}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="flex w-full gap-3 sm:w-auto">
                            {!isFirstPart && (
                              <Button
                                variant="outline"
                                onClick={handlePrevPart}
                                className="h-14 flex-1 gap-2 rounded-xl px-6 sm:flex-none"
                              >
                                <ChevronLeft className="size-4" />
                                Înapoi
                              </Button>
                            )}

                            {!isLastPart ? (
                              <Button
                                onClick={handleNextPart}
                                disabled={!hasCompletedVisibleQuiz}
                                className="h-14 flex-1 gap-2 rounded-xl px-8 shadow-lg shadow-primary/20 sm:flex-none"
                              >
                                Continuă
                                <ArrowRight className="size-4" />
                              </Button>
                            ) : (
                              <Button
                                onClick={handleComplete}
                                disabled={saving || !hasCompletedVisibleQuiz}
                                className="h-14 flex-1 gap-2 rounded-xl px-8 shadow-xl sm:flex-none !border-slate-900 !bg-slate-900 !text-white hover:!bg-slate-800 dark:!border-white dark:!bg-white dark:!text-slate-900 dark:hover:!bg-slate-100"
                              >
                                {saving ? (
                                  'Se salvează...'
                                ) : (
                                  <>
                                    <CheckCircle2 className="size-4" />
                                    Finalizează lecția
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.article>
              </div>

              {/* ── Coloana laterală (materiale suport) ────────── */}
              {hasSidebar && (
                <Reveal as="aside" delay={120} className="space-y-6 lg:sticky lg:top-28">
                  <div className="dashboard-glass-card relative overflow-hidden p-5">
                    <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
                    <div className="relative space-y-4">
                      <div className="flex items-center gap-2.5 border-b border-border pb-3">
                        <FileText className={`size-4 ${accent.label}`} />
                        <h3 className="font-heading text-sm font-black uppercase tracking-[0.16em]">Materiale</h3>
                      </div>

                      <div className="grid gap-3">
                        {supplementaryFiles.map((file) => {
                          const fileHref = getTrustedStorageUrl(file.file_url)
                          if (!fileHref) return null
                          const isImage = file.file_type?.startsWith('image/')

                          return (
                            <a
                              key={file.id}
                              href={fileHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block rounded-xl border border-border bg-white/70 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md hover:shadow-primary/5 dark:bg-white/5"
                            >
                              {isImage ? (
                                <div className="mb-3 aspect-video overflow-hidden rounded-lg border border-border bg-slate-50 dark:bg-slate-950">
                                  <img
                                    src={fileHref}
                                    alt={file.file_name}
                                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                </div>
                              ) : (
                                <div className={`mb-3 flex size-10 items-center justify-center rounded-lg border ${accent.soft}`}>
                                  <FileText className="size-5" />
                                </div>
                              )}
                              <p className="truncate text-sm font-bold text-foreground">{file.file_name}</p>
                              <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  {isImage ? 'Vizualizează' : 'Descarcă PDF'}
                                </span>
                                <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <StudyNote subjectIsFree={lesson.subject_part === 3} />
                </Reveal>
              )}
            </div>
          ) : (
            <Reveal className="mx-auto max-w-lg">
              <div className="dashboard-glass-card relative overflow-hidden p-10 text-center">
                <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
                <div className="relative space-y-6">
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-background">
                    <BookOpen className="size-7 text-muted-foreground" />
                  </span>
                  <div className="space-y-2">
                    <p className="font-heading text-2xl font-black tracking-tight">Nu am găsit această lecție</p>
                    <p className="text-sm text-muted-foreground">Resursa a fost mutată sau nu mai este disponibilă.</p>
                  </div>
                  <Button onClick={() => navigate('/dashboard')} className="rounded-xl">
                    Înapoi la lecții
                  </Button>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="container flex items-center justify-center gap-2.5 text-muted-foreground opacity-70 transition-opacity hover:opacity-100">
          <BrandLogo className="size-5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">MathUP · Matematică pentru Bacalaureat</span>
        </div>
      </footer>
    </div>
  )
}
