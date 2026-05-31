import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  GraduationCap,
  Map,
  NotebookPen,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'
import { useAuth } from '../../../app/providers/AuthProvider'
import { getLessonsForProfiles } from '../../../services/lessonService'
import { getUserProgress } from '../../../services/progressService'
import { getProfilesFromMetadata } from '../../../services/profileService'
import { getRoadmapsForProfile } from '../../../services/roadmapService'
import { canAccessLessonForUser } from '../../../services/premiumAccessService'
import { getSolvedVariantsForProfiles } from '../../../services/solvedVariantService'
import { getQuizCorrectCount, getQuizMistakeCount } from '../../../services/quizAttemptService'
import { buildTargetGradeReport } from '../../../services/targetGradeReportService'
import { fetchBacExamDate } from '../../../services/platformSettingsService'
import {
  formatExamCountdownLabel,
  getDaysUntilExam,
  getDefaultBacExamDate,
} from '../../../shared/utils/bacExamDate'
import { toUserFacingError, USER_MESSAGES } from '../../../shared/utils/userFacingError'
import { Button } from '../../../shared/ui/Button'
import { AlertMessage } from '../../../shared/ui/AlertMessage'
import { Navbar } from '../../../shared/ui/Navbar'
import { UserAvatar } from '../../../shared/ui/UserAvatar'
import { SUBJECT_PARTS, getProfileMeta } from '../../lessons/profiles'
import { DashboardAmbient } from '../components/DashboardAmbient'
import { MathRainCurtain } from '../../../shared/ui/MathRainCurtain'
const DAY_LABELS_RO = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ']
const MONTH_LABELS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

const cardClass = 'dashboard-glass-card'
const mutedText = 'text-muted-foreground'
const headingText = 'font-heading text-foreground'
const pillClass = 'rounded-xl border border-primary/25 bg-primary/10'

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTH_LABELS_RO[date.getMonth()].slice(0, 3)}`
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0)
}

function isSameCalendarDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function getStudyDayRingState(date, today, lastActivityKey, streak) {
  const key = toDateKey(date)
  const todayKey = toDateKey(today)
  if (key === todayKey) return 'today'
  if (date > today) return 'future'

  if (!lastActivityKey) return 'empty'

  if (key === lastActivityKey) return 'done'

  const dayDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24))
  if (dayDiff > 0 && dayDiff <= Math.max(0, streak - 1)) return 'done'

  const last = new Date(`${lastActivityKey}T12:00:00`)
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24))
  if (dayDiff === 1 && diffDays === 1) return 'partial'

  return 'empty'
}

function buildWeekDays(lastActivityKey, streak, examDate) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const examKey = toDateKey(examDate)
  const days = []

  for (let offset = -3; offset <= 3; offset += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + offset)
    const key = toDateKey(date)
    days.push({
      key,
      date,
      label: DAY_LABELS_RO[date.getDay()],
      dayNum: date.getDate(),
      ringState: getStudyDayRingState(date, today, lastActivityKey, streak),
      isExamDay: key === examKey,
    })
  }

  return days
}

function buildMonthCells(monthView, lastActivityKey, streak, examDate) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const year = monthView.getFullYear()
  const month = monthView.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const examKey = toDateKey(examDate)
  const cells = []

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12, 0, 0, 0)
    const key = toDateKey(date)
    cells.push({
      key,
      date,
      day,
      ringState: getStudyDayRingState(date, today, lastActivityKey, streak),
      isExamDay: key === examKey,
    })
  }

  return cells
}

function StudyMonthCalendar({
  monthView,
  selectedDate,
  onMonthChange,
  onSelectDate,
  lastActivityKey,
  streak,
  examDate,
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])

  const cells = useMemo(
    () => buildMonthCells(monthView, lastActivityKey, streak, examDate),
    [monthView, lastActivityKey, streak, examDate],
  )

  const isTodaySelected = isSameCalendarDay(selectedDate, today)

  useEffect(() => {
    if (!isTodaySelected) {
      onSelectDate(today)
    }
  }, [isTodaySelected, onSelectDate, today])

  const goMonth = (delta) => {
    const nextMonth = new Date(monthView.getFullYear(), monthView.getMonth() + delta, 1, 12, 0, 0, 0)
    onMonthChange(nextMonth)
    onSelectDate(today)
  }

  const examIsToday = toDateKey(today) === toDateKey(examDate)
  const todayInView = monthView.getMonth() === today.getMonth()
    && monthView.getFullYear() === today.getFullYear()

  return (
    <section className={`${cardClass} p-3 sm:p-3.5`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className={`shrink-0 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${mutedText}`}
          aria-label="Luna anterioară"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className={`text-sm font-bold leading-tight ${headingText}`}>
            {MONTH_LABELS_RO[monthView.getMonth()]} {monthView.getFullYear()}
          </p>
          <p className={`mt-0.5 text-[11px] font-semibold ${mutedText}`}>
            Astăzi: {today.getDate()} {MONTH_LABELS_RO[today.getMonth()].slice(0, 3)}
            {examIsToday && (
              <span className="text-red-500 dark:text-red-400"> · Examen BAC</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className={`shrink-0 rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${mutedText}`}
          aria-label="Luna următoare"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="study-calendar-grid mx-auto mt-2 w-full max-w-sm">
        {DAY_LABELS_RO.map((label) => (
          <span key={label} className={`study-calendar-weekday ${mutedText}`}>
            {label}
          </span>
        ))}
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} aria-hidden className="study-calendar-empty" />
          }

          const isTodayCell = isSameCalendarDay(cell.date, today)
          const isPast = cell.date < today
          const isFuture = cell.ringState === 'future'
          const isSelectable = isTodayCell
          const isSelected = isTodayCell && isTodaySelected

          let dayClass = 'study-calendar-day '
          if (isSelected) {
            dayClass += 'bg-primary text-primary-foreground font-bold shadow-sm'
          } else if (cell.isExamDay) {
            dayClass += 'bg-red-500/20 text-red-600 font-bold ring-1 ring-red-500/50 dark:text-red-300'
          } else if (cell.ringState === 'done') {
            dayClass += 'bg-emerald-500/20 text-emerald-700 font-semibold dark:text-emerald-300'
          } else if (isTodayCell) {
            dayClass += 'ring-2 ring-primary text-primary font-bold'
          } else if (isPast || isFuture) {
            dayClass += 'text-muted-foreground/45 font-medium'
          } else {
            dayClass += `${headingText} font-medium opacity-70`
          }

          if (!todayInView && isTodayCell) {
            dayClass += ' ring-2 ring-dashed ring-primary/60'
          }

          return (
            <button
              key={cell.key}
              type="button"
              disabled={!isSelectable}
              onClick={() => { if (isSelectable) onSelectDate(today) }}
              className={dayClass}
              aria-label={`${cell.day} ${MONTH_LABELS_RO[monthView.getMonth()]}`}
              aria-pressed={isSelected}
              aria-current={isTodayCell ? 'date' : undefined}
            >
              {cell.day}
            </button>
          )
        })}
      </div>

      <ul className={`mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] ${mutedText}`}>
        <li className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-primary" aria-hidden />
          Azi
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-emerald-500/35 ring-1 ring-emerald-500/50" aria-hidden />
          Studiu
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-red-500/40 ring-1 ring-red-500/50" aria-hidden />
          Examen BAC
        </li>
      </ul>
    </section>
  )
}

function WeekDayRing({ day }) {
  const base = 'relative flex size-11 items-center justify-center rounded-full text-sm font-semibold transition-colors'
  const examLabel = day.isExamDay ? ' · Examen BAC' : ''

  if (day.isExamDay && day.ringState === 'today') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[11px] font-medium ${mutedText}`}>{day.label}</span>
        <div
          className={`${base} bg-[var(--primary)] text-white shadow-lg shadow-primary/25 ring-2 ring-red-500`}
          aria-label={`${day.dayNum}${examLabel}`}
          title="Ziua examenului BAC"
        >
          {day.dayNum}
          <GraduationCap className="absolute -top-0.5 -right-0.5 size-3.5 text-red-400" />
        </div>
      </div>
    )
  }

  if (day.isExamDay) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[11px] font-medium text-red-500 dark:text-red-400`}>{day.label}</span>
        <div
          className={`${base} bg-red-500/15 text-red-600 ring-2 ring-red-500/50 dark:text-red-400`}
          aria-label={`${day.dayNum}${examLabel}`}
          title="Ziua examenului BAC"
        >
          {day.dayNum}
          <GraduationCap className="absolute -top-0.5 -right-0.5 size-3.5 text-red-500" />
        </div>
      </div>
    )
  }

  if (day.ringState === 'today') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[11px] font-medium ${mutedText}`}>{day.label}</span>
        <div className={`${base} bg-[var(--primary)] text-white shadow-lg shadow-primary/25 ring-2 ring-primary/30`}>
          {day.dayNum}
        </div>
      </div>
    )
  }

  if (day.ringState === 'done') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[11px] font-medium ${mutedText}`}>{day.label}</span>
        <div className={`${base} border-2 border-emerald-500/70 bg-emerald-500/5 text-slate-700 dark:text-slate-200`}>
          {day.dayNum}
          <CheckCircle2 className="absolute -top-0.5 right-0 size-3.5 text-emerald-500" />
        </div>
      </div>
    )
  }

  if (day.ringState === 'partial') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`text-[11px] font-medium ${mutedText}`}>{day.label}</span>
        <div
          className={`${base} border-2 border-emerald-500/30 text-slate-600 dark:text-slate-300`}
          style={{ background: 'conic-gradient(rgb(16 185 129 / 0.45) 0deg 120deg, transparent 120deg 360deg)' }}
        >
          <span className="relative z-10 rounded-full bg-background px-1">{day.dayNum}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`text-[11px] font-medium ${mutedText}`}>{day.label}</span>
      <div className={`${base} border-2 border-border bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400`}>
        {day.dayNum}
      </div>
    </div>
  )
}

function StatRow({ icon: Icon, label, value, iconClass = 'text-primary' }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`size-5 shrink-0 ${iconClass}`} />
        <span className={`text-sm ${mutedText}`}>{label}</span>
      </div>
      <span className={`shrink-0 text-sm font-bold ${headingText}`}>{value}</span>
    </div>
  )
}

function Reveal({ delay = 0, className = '', as: Tag = 'div', children, ...rest }) {
  const style = delay ? { animationDelay: `${delay}ms` } : undefined
  return (
    <Tag className={`dashboard-reveal ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  )
}

export function DashboardPage() {
  const [lessons, setLessons] = useState([])
  const [progressRows, setProgressRows] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [roadmaps, setRoadmaps] = useState([])
  const [solvedVariants, setSolvedVariants] = useState([])
  const [quizMistakeCount, setQuizMistakeCount] = useState(0)
  const [quizCorrectCount, setQuizCorrectCount] = useState(0)
  const [error, setError] = useState('')
  const [activeView, setActiveView] = useState('progress')
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    return today
  })
  const [bacExamDate, setBacExamDate] = useState(() => getDefaultBacExamDate())
  const { user, authLoading, isPremium, openPremiumModal, errorMessage } = useAuth()
  const navigate = useNavigate()

  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )
  const streak = Number(user?.user_metadata?.streak) || 0
  const lastActivityKey = user?.user_metadata?.last_streak_activity_date || null

  const programsSummary = useMemo(() => {
    const labels = activeProfiles.map((k) => getProfileMeta(k).shortLabel)
    return [...new Set(labels)].join(' · ')
  }, [activeProfiles])

  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      if (authLoading || !user?.id) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      setError('')
      try {
        const primaryProfile = activeProfiles[0]
        const [lessonsData, progressData, roadmapData, solvedVariantsData, mistakeCount, correctCount, examDate] = await Promise.all([
          getLessonsForProfiles(activeProfiles, { includeSubjectThreeForAllProfiles: !isPremium }),
          getUserProgress(user.id),
          isPremium ? getRoadmapsForProfile(primaryProfile) : Promise.resolve([]),
          isPremium ? getSolvedVariantsForProfiles(activeProfiles) : Promise.resolve([]),
          isPremium ? getQuizMistakeCount(user.id) : Promise.resolve(0),
          isPremium ? getQuizCorrectCount(user.id) : Promise.resolve(0),
          fetchBacExamDate(),
        ])
        if (!mounted) return
        setLessons(lessonsData)
        setProgressRows(progressData)
        setRoadmaps(roadmapData)
        setSolvedVariants(solvedVariantsData)
        setQuizMistakeCount(mistakeCount)
        setQuizCorrectCount(correctCount)
        setBacExamDate(examDate)
      } catch (loadError) {
        if (!mounted) return
        setError(toUserFacingError(loadError, USER_MESSAGES.load))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }

    loadDashboardData()
    return () => {
      mounted = false
    }
  }, [authLoading, user?.id, activeProfiles, isPremium])

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
      correctAnswerCount: quizCorrectCount,
      answeredQuizLessons,
    })
  }, [isPremium, user?.user_metadata?.target_grade, averageQuizScore, quizMistakeCount, quizCorrectCount, answeredQuizLessons])

  const lessonsBySubject = useMemo(() => {
    const grouped = { 1: [], 2: [], 3: [] }
    for (const lesson of lessons) {
      const part = lesson.subject_part ?? 1
      if (grouped[part]) grouped[part].push(lesson)
    }
    return grouped
  }, [lessons])

  const weekDays = useMemo(
    () => buildWeekDays(lastActivityKey, streak, bacExamDate),
    [lastActivityKey, streak, bacExamDate],
  )

  const daysUntilExam = useMemo(() => getDaysUntilExam(bacExamDate), [bacExamDate])
  const examCountdownLabel = useMemo(
    () => formatExamCountdownLabel(daysUntilExam),
    [daysUntilExam],
  )

  const targetScoreLabel = useMemo(() => {
    if (averageQuizScore !== null) return `${averageQuizScore}%`
    if (targetGradeReport?.targetGrade) return `${Math.round(targetGradeReport.targetGrade * 10)}%`
    return '—'
  }, [averageQuizScore, targetGradeReport])

  const dailyGoal = useMemo(() => {
    const todayKey = toDateKey(new Date())
    const studiedToday = lastActivityKey === todayKey
    const goalTotal = 1
    const goalDone = studiedToday ? 1 : 0
    return { goalDone, goalTotal, studiedToday }
  }, [lastActivityKey])

  const dashboardTitle = useMemo(() => {
    if (activeProfiles.length === 1) {
      return `Matematică ${getProfileMeta(activeProfiles[0]).shortLabel}`
    }
    return `Pregătire BAC · ${programsSummary}`
  }, [activeProfiles, programsSummary])

  const progressPct = overallProgress.progressPercent
  const progressBarPct = Math.max(progressPct, 4)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'elev'
  const dashboardTabBase = 'flex-1 rounded-lg py-2.5 text-sm font-bold uppercase tracking-wide transition-all duration-300'
  const dashboardTabActive = 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
  const dashboardTabInactive = mutedText

  return (
    <div className="relative min-h-screen text-foreground transition-colors duration-500">
      <MathRainCurtain />
      <Navbar />

      <main className="page-ambient-content container relative max-w-3xl py-8 pb-16">
        <div className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
          <DashboardAmbient />
          <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
        </div>

        {error && <AlertMessage message={error} className="relative mb-4" />}
        {errorMessage && <AlertMessage message={errorMessage} className="relative mb-4" />}

        {loadingData ? (
          <div className="dashboard-reveal relative flex h-80 flex-col items-center justify-center gap-4">
            <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className={`text-sm ${mutedText}`}>Se încarcă datele...</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            <Reveal as="section" className="dashboard-hero-card p-5 sm:p-7">
              <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-primary/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-indigo-400/10 blur-2xl" />

              <div className="relative flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${pillClass}`}>
                    <Sparkles className="size-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                      Portal elev · {programsSummary}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1">
                    <CalendarDays className="size-3 text-red-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500 dark:text-red-400">
                      {examCountdownLabel} · {formatShortDate(bacExamDate)}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${mutedText}`}>Bună, {firstName}.</p>
                    <h1 className={`mt-1 text-3xl font-black tracking-tighter sm:text-4xl ${headingText}`}>
                      {dashboardTitle}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 ${pillClass}`}>
                      <UserAvatar metadata={user?.user_metadata} size="sm" className="size-7 ring-2 ring-primary/20" />
                      <span className={`text-sm font-bold ${headingText}`}>{progressPct}%</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                      <Flame className="size-4 text-orange-500" />
                      <span className={`text-sm font-bold ${headingText}`}>{streak}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="rounded-xl">
                      <User className="size-4" />
                      Profil
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal as="section" delay={60} className={`${cardClass} flex justify-between gap-2 overflow-x-auto p-4 sm:p-5`}>
              {weekDays.map((day) => (
                <WeekDayRing key={day.key} day={day} />
              ))}
            </Reveal>

            <Reveal
              delay={120}
              className="flex rounded-xl border border-border/80 bg-muted/50 p-1 dark:bg-muted/30"
            >
              <button
                type="button"
                onClick={() => setActiveView('topics')}
                className={`${dashboardTabBase} ${activeView === 'topics' ? dashboardTabActive : dashboardTabInactive}`}
                aria-pressed={activeView === 'topics'}
              >
                Lecții
              </button>
              <button
                type="button"
                onClick={() => setActiveView('progress')}
                className={`${dashboardTabBase} flex items-center justify-center gap-2 ${activeView === 'progress' ? dashboardTabActive : dashboardTabInactive}`}
                aria-pressed={activeView === 'progress'}
              >
                Progres
                <span className={`rounded-md px-2 py-0.5 text-xs ${
                  activeView === 'progress' ? 'bg-primary-foreground/20' : 'bg-background/80'
                }`}>
                  {progressPct}%
                </span>
              </button>
            </Reveal>

            {activeView === 'progress' ? (
              <>
                <Reveal as="section" delay={180} className={`${cardClass} p-6 sm:p-8`}>
                  <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
                    <div className="min-w-0 space-y-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-5 text-primary" />
                        <h2 className={`text-lg font-black uppercase tracking-tight ${headingText}`}>
                          Progres curriculum
                        </h2>
                      </div>
                      <div className="relative pt-8 pr-14">
                        <div className="relative h-3 overflow-visible rounded-full bg-slate-200 dark:bg-white/10">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-[width] duration-700 ease-out"
                            style={{ width: `${progressBarPct}%` }}
                          />
                          <div
                            className="absolute top-1/2 z-10 -translate-y-1/2 transition-[left] duration-700 ease-out"
                            style={{ left: `clamp(0px, calc(${progressPct}% - 14px), calc(100% - 28px))` }}
                          >
                            <UserAvatar
                              metadata={user?.user_metadata}
                              size="sm"
                              className="size-7 ring-2 ring-background dark:ring-slate-900"
                            />
                          </div>
                          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1">
                            <div className="h-px w-6 border-t border-dashed border-slate-300 dark:border-border" />
                            <Target className="size-5 text-primary" />
                          </div>
                        </div>
                        <p className={`absolute right-0 top-0 text-2xl font-black text-primary`}>{progressPct}%</p>
                      </div>
                      <p className={`text-center text-sm leading-relaxed ${mutedText}`}>
                        Progresul tău la toate lecțiile din program. Continuă așa!
                      </p>
                      {isPremium && targetGradeReport && (
                        <p className={`rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm ${mutedText}`}>
                          {targetGradeReport.message}
                        </p>
                      )}
                    </div>

                    <div className="lg:border-l lg:border-border lg:pl-6">
                      <StatRow icon={GraduationCap} label="Data examen" value={formatShortDate(bacExamDate)} />
                      <StatRow icon={Target} label="Notă țintă" value={targetScoreLabel} iconClass="text-primary" />
                      <StatRow icon={Flame} label="Streak" value={String(streak)} iconClass="text-orange-500" />
                      <StatRow
                        icon={CheckCircle2}
                        label="Lecții finalizate"
                        value={String(overallProgress.completed)}
                        iconClass="text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                </Reveal>

                <Reveal as="section" delay={240} className={`${cardClass} flex items-center justify-between px-5 py-4`}>
                  <div className="flex items-center gap-3">
                    <div className="relative size-10">
                      <svg className="size-full -rotate-90" viewBox="0 0 36 36" aria-hidden>
                        <circle cx="18" cy="18" r="14" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          className="stroke-emerald-500 transition-[stroke-dasharray] duration-500"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${(dailyGoal.goalDone / dailyGoal.goalTotal) * 88} 88`}
                        />
                      </svg>
                    </div>
                    <span className={`text-sm font-semibold ${headingText}`}>Obiectiv zilnic</span>
                  </div>
                  <span className={`text-sm font-bold ${headingText}`}>
                    {dailyGoal.goalDone}/{dailyGoal.goalTotal} lecție
                  </span>
                </Reveal>

                <Reveal delay={300}>
                  <StudyMonthCalendar
                    monthView={calendarMonth}
                    selectedDate={selectedCalendarDate}
                    onMonthChange={setCalendarMonth}
                    onSelectDate={setSelectedCalendarDate}
                    lastActivityKey={lastActivityKey}
                    streak={streak}
                    examDate={bacExamDate}
                  />
                </Reveal>

                {isPremium && (roadmaps.length > 0 || solvedVariants.length > 0) && (
                  <Reveal as="section" delay={360} className="space-y-3">
                    {roadmaps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('/roadmap')}
                        className={`${cardClass} flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10`}
                      >
                        <Map className="size-5 text-primary" />
                        <span className={`flex-1 text-sm font-semibold ${headingText}`}>Plan de studiu</span>
                        <ChevronRight className={`size-4 ${mutedText}`} />
                      </button>
                    )}
                    {solvedVariants.length > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('/variante-rezolvate')}
                        className={`${cardClass} flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10`}
                      >
                        <NotebookPen className="size-5 text-primary" />
                        <span className={`flex-1 text-sm font-semibold ${headingText}`}>Variante rezolvate</span>
                        <ChevronRight className={`size-4 ${mutedText}`} />
                      </button>
                    )}
                  </Reveal>
                )}

                {!isPremium && (
                  <Reveal
                    as="button"
                    delay={360}
                    type="button"
                    onClick={openPremiumModal}
                    className={`${cardClass} flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/15`}
                  >
                    <Crown className="size-5 text-primary" />
                    <span className="text-sm font-semibold text-primary">Activează Premium pentru raport complet</span>
                  </Reveal>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {SUBJECT_PARTS.map((subject, idx) => {
                  const subjectLessons = lessonsBySubject[subject.value] || []
                  const completedCount = subjectLessons.filter((l) => completedSet.has(l.id)).length
                  const totalCount = subjectLessons.length
                  const subjectProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

                  return (
                    <Reveal
                      as="article"
                      key={subject.value}
                      delay={180 + idx * 60}
                      className={`${cardClass} overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10`}
                    >
                      <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
                        <div>
                          <h3 className={`font-black uppercase tracking-tight ${headingText}`}>{subject.label}</h3>
                          <p className={`text-sm ${mutedText}`}>
                            {completedCount}/{totalCount} finalizate · {subjectProgress}%
                          </p>
                        </div>
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground shadow-lg shadow-primary/30">
                          {subject.roman}
                        </span>
                      </div>
                      <div className="mx-5 mt-3 h-2 overflow-hidden rounded-full bg-muted dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-[width] duration-700 ease-out"
                          style={{ width: `${subjectProgress}%` }}
                        />
                      </div>
                      <ul className="max-h-64 space-y-1 overflow-y-auto p-3 custom-scrollbar">
                        {subjectLessons.length > 0 ? (
                          subjectLessons.map((lesson) => {
                            const isCompleted = completedSet.has(lesson.id)
                            const locked = !canAccessLessonForUser(lesson, isPremium, activeProfiles)
                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (locked) {
                                      openPremiumModal()
                                      return
                                    }
                                    navigate(`/lessons/${lesson.id}`)
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                                    isCompleted
                                      ? 'border-transparent bg-emerald-500/5 opacity-70'
                                      : 'border-border/80 bg-background/60 hover:border-primary hover:bg-background hover:shadow-md hover:shadow-primary/5 dark:bg-white/5'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                  ) : (
                                    <BookOpen className="size-4 shrink-0 text-slate-400" />
                                  )}
                                  <span className={`min-w-0 flex-1 truncate font-medium ${
                                    isCompleted ? 'text-slate-500 line-through' : headingText
                                  }`}>
                                    {lesson.title}
                                  </span>
                                  {locked && <Crown className="size-4 shrink-0 text-primary" />}
                                </button>
                              </li>
                            )
                          })
                        ) : (
                          <li className={`rounded-xl border-2 border-dashed border-border py-8 text-center text-sm ${mutedText}`}>
                            Nicio lecție publicată încă
                          </li>
                        )}
                      </ul>
                    </Reveal>
                  )
                })}

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
