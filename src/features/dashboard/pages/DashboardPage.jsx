import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Award, 
  GraduationCap,
  Sparkles,
  User,
  Crown,
  Map,
  NotebookPen,
  Download,
  Target,
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { getLessonsForProfiles } from '../../../services/lessonService'
import { getUserProgress } from '../../../services/progressService'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getRoadmapsForProfile } from '../../../services/roadmapService'
import { canAccessLessonForUser } from '../../../services/premiumAccessService'
import { getSolvedVariantsForProfiles } from '../../../services/solvedVariantService'
import { getQuizMistakeCount } from '../../../services/quizAttemptService'
import { buildTargetGradeReport } from '../../../services/targetGradeReportService'
import { downloadRemoteFile } from '../../../shared/utils/downloadRemoteFile'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Navbar } from '../../../shared/ui/Navbar'
import { SolvedVariantDocumentIcon } from '../../../shared/ui/SolvedVariantDocumentIcon'
import { SUBJECT_PARTS, getProfileMeta } from '../../lessons/profiles'

export function DashboardPage() {
  const [lessons, setLessons] = useState([])
  const [progressRows, setProgressRows] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [roadmaps, setRoadmaps] = useState([])
  const [solvedVariants, setSolvedVariants] = useState([])
  const [downloadingVariantId, setDownloadingVariantId] = useState(null)
  const [quizMistakeCount, setQuizMistakeCount] = useState(0)
  const [error, setError] = useState('')
  const { user, isPremium, openPremiumModal, startPremiumCheckout, checkoutLoading, errorMessage } = useAuth()
  const navigate = useNavigate()

  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )
  const fullName = user?.user_metadata?.full_name || 'Elev'
  const programsSummary = useMemo(() => {
    const labels = activeProfiles.map((k) => getProfileMeta(k).shortLabel)
    return [...new Set(labels)].join(' · ')
  }, [activeProfiles])
  
  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      if (!user?.id) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      setError('')
      try {
        const primaryProfile = activeProfiles[0]
        const [lessonsData, progressData, roadmapData, solvedVariantsData, mistakeCount] = await Promise.all([
          getLessonsForProfiles(activeProfiles),
          getUserProgress(user.id),
          isPremium ? getRoadmapsForProfile(primaryProfile) : Promise.resolve([]),
          isPremium ? getSolvedVariantsForProfiles(activeProfiles) : Promise.resolve([]),
          isPremium ? getQuizMistakeCount(user.id) : Promise.resolve(0),
        ])
        if (!mounted) return
        setLessons(lessonsData)
        setProgressRows(progressData)
        setRoadmaps(roadmapData)
        setSolvedVariants(solvedVariantsData)
        setQuizMistakeCount(mistakeCount)
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message)
      } finally {
        if (mounted) setLoadingData(false)
      }
    }

    loadDashboardData()
    return () => {
      mounted = false
    }
  }, [user?.id, activeProfiles, isPremium])

  const completedSet = useMemo(
    () => new Set(progressRows.filter((item) => item.completed).map((item) => item.lesson_id)),
    [progressRows],
  )

  const overallProgress = useMemo(() => {
    const total = lessons.length
    const completed = lessons.filter((lesson) => completedSet.has(lesson.id)).length
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100)
    return { total, completed, progressPercent }
  }, [lessons, completedSet])

  const performanceMessaging = useMemo(() => {
    const { completed, total } = overallProgress
    const program = programsSummary

    if (total === 0) {
      return {
        title: 'Pregătirea pentru BAC continuă',
        description: `Materia pentru ${program} se populează. Revino când apar lecțiile publicate.`,
      }
    }

    if (completed === 0) {
      return {
        title: 'Hai să deschidem primul capitol',
        description: `Ai ${total} ${total === 1 ? 'capitol' : 'capitole'} pentru ${program}. Începe prima lecție și construiește ritmul de studiu.`,
      }
    }

    if (completed === 1) {
      return {
        title: 'Excelent început',
        description: `Ai finalizat deja 1 capitol din ${total} pentru ${program}. Continuă cu următoarea lecție ca ritmul să prindă formă.`,
      }
    }

    if (completed < total && completed < Math.ceil(total / 2)) {
      return {
        title: 'Ești pe drumul cel bun',
        description: `Ai stăpânit deja ${completed} din ${total} capitole pentru ${program}. Menține ritmul și avansează pas cu pas.`,
      }
    }

    if (completed < total) {
      return {
        title: 'Progres solid',
        description: `Ai finalizat ${completed} din ${total} capitole pentru ${program}. Mai ai ${total - completed} până la finalizarea materiei — ești în zona decisivă.`,
      }
    }

    return {
      title: 'Materia este finalizată',
      description: `Ai stăpânit toate cele ${completed} capitole pentru ${program}. Recapitulează lecțiile și fixează progresul cu quiz-uri.`,
    }
  }, [overallProgress, programsSummary])

  const averageQuizScore = useMemo(() => {
    const scored = progressRows.filter((row) => typeof row.score === 'number')
    if (scored.length === 0) return null
    const total = scored.reduce((sum, row) => sum + row.score, 0)
    return Math.round(total / scored.length)
  }, [progressRows])

  const answeredQuizLessons = useMemo(
    () => progressRows.filter((row) => typeof row.score === 'number').length,
    [progressRows],
  )

  const targetGradeReport = useMemo(() => {
    if (!isPremium) return null
    return buildTargetGradeReport({
      targetGradeValue: user?.user_metadata?.target_grade,
      averageQuizScore,
      wrongAnswerCount: quizMistakeCount,
      answeredQuizLessons,
    })
  }, [isPremium, user?.user_metadata?.target_grade, averageQuizScore, quizMistakeCount, answeredQuizLessons])

  const lessonsBySubject = useMemo(() => {
    const grouped = { 1: [], 2: [], 3: [] }
    for (const lesson of lessons) {
      const part = lesson.subject_part ?? 1
      if (grouped[part]) grouped[part].push(lesson)
    }
    return grouped
  }, [lessons])

  const handleDownloadVariant = async (variant) => {
    setDownloadingVariantId(variant.id)
    setError('')
    try {
      await downloadRemoteFile(variant.file_url, variant.file_name)
    } catch (downloadError) {
      setError(downloadError.message)
    } finally {
      setDownloadingVariantId(null)
    }
  }


  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 transition-colors duration-500">
      <Navbar />

      <main className="container py-10 relative">
        {/* Background Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10 blur-3xl rounded-full" />

        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-primary animate-spin-slow" />
              <span className="text-xs font-bold text-primary uppercase tracking-tighter">Plan personalizat de studiu</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">Salutare, {fullName.split(' ')[0]}! 👋</h2>
            <p className="text-muted-foreground max-w-md mt-1">Suntem pregătiți să abordăm subiectele de astăzi. Ești la un pas de succes.</p>
          </motion.div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white/50 dark:bg-black/20 rounded-2xl border border-slate-200/50 dark:border-white/5 w-fit">
            <Button
              variant="ghost"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all text-slate-500 hover:text-primary dark:hover:text-white"
            >
              <User className="size-3.5" />
              Editează Profil
            </Button>
          </div>
        </div>

        {error && <AlertMessage message={error} className="mb-8" />}
        {errorMessage && <AlertMessage message={errorMessage} className="mb-8" />}

        {!isPremium ? (
          <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">ScholarBAC Premium</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">Deblochează roadmap-ul de studiu</p>
            </div>
            <Button onClick={startPremiumCheckout} disabled={checkoutLoading} className="rounded-2xl bg-gradient-to-r from-primary to-indigo-600 px-6">
              {checkoutLoading ? 'Redirecționare...' : 'Cumpără Premium'}
            </Button>
          </div>
        ) : null}

        <div className="space-y-12">
          {loadingData ? (
            <div className="flex h-96 flex-col items-center justify-center gap-6 text-center">
              <div className="relative">
                <div className="size-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-8 animate-pulse rounded-full bg-primary/10" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-bold">Generăm materialele tale...</p>
                <p className="text-sm text-muted-foreground animate-pulse">Aproape gata</p>
              </div>
            </div>
          ) : (
            <>
              {/* Ultra-Premium Progress Card */}
              <motion.div 
                className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-xl shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none md:p-12"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Abstract backgrounds */}
                <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl dark:hidden" />
                <div className="absolute -bottom-12 -left-12 size-48 rounded-full bg-indigo-500/10 blur-3xl dark:hidden" />
                
                <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center">
                   <div className="flex-1 space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary backdrop-blur-md dark:bg-white/10 dark:text-white">
                         <Award className="size-3 text-yellow-500 dark:text-yellow-400" />
                         Performanță Actuală
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white">{performanceMessaging.title}</h3>
                      <p className="max-w-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {performanceMessaging.description}
                        {isPremium && averageQuizScore !== null && (
                          <span className="mt-3 block text-sm text-slate-600 dark:text-indigo-200">
                            Scor mediu la quiz-uri: <span className="font-black text-slate-900 dark:text-white">{averageQuizScore}%</span>
                          </span>
                        )}
                      </p>
                   </div>
                   <div className="flex flex-col items-center gap-4 w-full md:w-80">
                      <div className="relative size-40 flex items-center justify-center">
                         <svg className="size-full transform -rotate-90">
                            <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-white/10" />
                            <motion.circle 
                              cx="80" cy="80" r="70" fill="transparent" stroke="url(#progressGradient)" strokeWidth="12" strokeLinecap="round"
                              initial={{ strokeDasharray: "440", strokeDashoffset: "440" }}
                              animate={{ strokeDashoffset: 440 - (440 * overallProgress.progressPercent) / 100 }}
                              transition={{ duration: 2, ease: "easeOut" }}
                            />
                            <defs>
                              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                            </defs>
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900 dark:text-white">
                            <span className="text-4xl font-black tracking-tighter">{overallProgress.progressPercent}%</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Finalizat</span>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>

              {isPremium && targetGradeReport ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Target className="size-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Raport Premium</p>
                        <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">{targetGradeReport.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{targetGradeReport.message}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nota tinta</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{targetGradeReport.targetGrade.toFixed(2)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raspunsuri gresite</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{targetGradeReport.wrongAnswerCount}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medie quiz</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">
                          {targetGradeReport.averageQuizScore ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {isPremium && roadmaps.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Map className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Roadmap de studiu</h3>
                        <p className="text-sm text-muted-foreground">Roadmap-ul este publicat de profesor.</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/roadmap')} className="rounded-2xl">
                      Vezi roadmap
                    </Button>
                  </div>
                  <div className="space-y-6">
                    {roadmaps.map((roadmap) => (
                      <div key={roadmap.id} className="space-y-3">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-primary">{roadmap.title}</h4>
                          {roadmap.description ? <p className="text-sm text-muted-foreground">{roadmap.description}</p> : null}
                        </div>
                        <div className="space-y-2">
                          {(roadmap.study_roadmap_steps ?? []).map((step, index) => {
                            const locked = step.requires_premium && !isPremium
                            return (
                              <button
                                key={step.id}
                                type="button"
                                onClick={() => {
                                  if (locked) {
                                    openPremiumModal()
                                    return
                                  }
                                  if (step.lesson_id) navigate(`/lessons/${step.lesson_id}`)
                                }}
                                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left transition-all hover:border-primary/30 dark:border-slate-800"
                              >
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pasul {index + 1}</p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{step.title}</p>
                                </div>
                                {locked ? <Crown className="size-4 text-primary" /> : <ChevronRight className="size-4 text-slate-400" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {isPremium ? (
                <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <NotebookPen className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">Variante deja rezolvate</h3>
                        <p className="text-sm text-muted-foreground">Documente publicate de profesor pentru programul tău.</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/variante-rezolvate')} variant="outline" className="rounded-2xl">
                      Vezi toate
                    </Button>
                  </div>

                  {solvedVariants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nu există variante rezolvate publicate încă.</p>
                  ) : (
                    <div className="space-y-3">
                      {solvedVariants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => handleDownloadVariant(variant)}
                          disabled={downloadingVariantId === variant.id}
                          className="platform-surface-hover flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all disabled:cursor-wait disabled:opacity-70 dark:border-slate-800 dark:bg-slate-900/40"
                        >
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                              {getProfileMeta(variant.profile).shortLabel}
                            </p>
                            <div className="mt-1 flex min-w-0 items-center gap-2">
                              <SolvedVariantDocumentIcon compact />
                              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{variant.file_name}</p>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{getProfileMeta(variant.profile).label}</p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            {downloadingVariantId === variant.id ? (
                              <span className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                            ) : (
                              <Download className="size-4" />
                            )}
                            Descarcă
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}

              {/* Subjects Grid */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {SUBJECT_PARTS.map((subject, index) => {
                  const subjectLessons = lessonsBySubject[subject.value] || []
                  const completedCount = subjectLessons.filter((lesson) => completedSet.has(lesson.id)).length
                  const totalCount = subjectLessons.length
                  const subjectProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

                  return (
                    <motion.article
                      key={subject.value}
                      className="platform-surface-hover group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index + 0.4 }}
                      whileHover={{ y: -8 }}
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-xl font-black text-primary border border-primary/10 group-hover:from-primary group-hover:to-indigo-600 group-hover:text-white transition-all duration-500">
                            {subject.roman}
                          </div>
                          <div>
                            <h3 className="text-lg font-black leading-tight tracking-tight text-slate-800 dark:text-white">{subject.label}</h3>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{totalCount} LECȚII</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-muted-foreground">
                          <span>Progres Subiect</span>
                          <span>{subjectProgress}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-slate-800 dark:shadow-none">
                           <motion.div 
                              className="h-full bg-gradient-to-r from-primary to-indigo-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${subjectProgress}%` }}
                              transition={{ duration: 1.5, delay: 0.5 + index * 0.1 }}
                           />
                        </div>
                      </div>

                      <div className="flex-1">
                        {subjectLessons.length > 0 ? (
                          <div className="space-y-2">
                            {subjectLessons.map((lesson) => {
                              const isCompleted = completedSet.has(lesson.id)
                              const locked = !canAccessLessonForUser(lesson, isPremium, activeProfiles)
                              return (
                                <div key={lesson.id} className="space-y-1">
                                  <motion.button
                                    type="button"
                                    className={`group/item platform-surface-hover relative flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                                      isCompleted
                                        ? 'platform-surface-hover-subtle border-transparent opacity-60'
                                        : 'border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
                                    }`}
                                    onClick={() => {
                                      if (locked) {
                                        openPremiumModal()
                                        return
                                      }
                                      navigate(`/lessons/${lesson.id}`)
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <div className={`flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 group-hover/item:border-primary/50'}`}>
                                      {isCompleted ? (
                                        <CheckCircle2 className="size-4" />
                                      ) : (
                                        <div className="size-1.5 rounded-full bg-primary/40" />
                                      )}
                                    </div>
                                    <span className={`flex-1 truncate text-xs font-black tracking-tight ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                      {lesson.title}
                                    </span>
                                    <ChevronRight className="size-3 text-muted-foreground opacity-0 -translate-x-2 transition-all group-hover/item:opacity-100 group-hover/item:translate-x-0" />
                                  </motion.button>
                                  
                                  {/* Sub-parts indicators */}
                                  {lesson.lesson_parts && lesson.lesson_parts.length > 0 && !isCompleted && (
                                    <div className="ml-9 border-l-2 border-slate-100 dark:border-slate-800 pl-4 py-1 space-y-2">
                                      {lesson.lesson_parts.map((part, pIdx) => (
                                        <div key={part.id} className="platform-surface-hover-subtle flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition-all group/part cursor-pointer" onClick={() => navigate(`/lessons/${lesson.id}`)}>
                                          <div className="size-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/part:bg-primary transition-colors" />
                                          <span className="text-[10px] font-bold text-muted-foreground group-hover/part:text-primary transition-colors uppercase tracking-tight">
                                            Partea {pIdx + 1}: {part.title}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center p-4">
                             <BookOpen className="size-6 text-slate-300 mb-2" />
                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coming Soon</p>
                          </div>
                        )}
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="container py-12 text-center opacity-30">
        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all">
          <GraduationCap className="size-5" />
          <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">ScholarBAC Premium</span>
        </div>
      </footer>
    </div>
  )
}
