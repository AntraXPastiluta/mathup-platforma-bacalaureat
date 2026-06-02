import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  GraduationCap,
  Map,
  Moon,
  NotebookPen,
  Sun,
  Sunrise,
  Target,
  TrendingUp,
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

// Serif de manuscris pentru accentele editoriale — fără fonturi externe (CSP-safe),
// aceeași stivă ca pe pagina Welcome, ca să păstrăm vocea „demonstrație tipărită”.
const SERIF = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

const DAY_LABELS_RO = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ']
const MONTH_LABELS_RO = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
]

const cardClass = 'dashboard-glass-card'
const mutedText = 'text-muted-foreground'
const headingText = 'font-heading text-foreground'
// Titlu editorial — sans greu, majuscule, tracking strâns (ca pe Welcome).
const editorialHeading = 'font-heading font-black uppercase tracking-tight text-foreground'

// Fiecare subiect primește o identitate cromatică proprie pe bara de progres.
const SUBJECT_ACCENTS = {
  1: { bar: 'from-indigo-500 to-indigo-400' },
  2: { bar: 'from-violet-500 to-fuchsia-400' },
  3: { bar: 'from-emerald-500 to-teal-400' },
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function formatShortDate(date) {
  return `${date.getDate()} ${MONTH_LABELS_RO[date.getMonth()].slice(0, 3)}`
}

function formatLongDate(date) {
  return `${date.getDate()} ${MONTH_LABELS_RO[date.getMonth()]} ${date.getFullYear()}`
}

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 5) return { text: 'Spor la învățat', Icon: Moon }
  if (hour < 12) return { text: 'Bună dimineața', Icon: Sunrise }
  if (hour < 18) return { text: 'Bună ziua', Icon: Sun }
  return { text: 'Bună seara', Icon: Moon }
}

function getProgressMessage(pct, total) {
  if (total === 0) return 'Lecțiile vor apărea aici imediat ce sunt publicate.'
  if (pct === 0) return 'Începe cu prima lecție — primul pas contează cel mai mult.'
  if (pct >= 100) return 'Felicitări! Ai parcurs tot materialul disponibil.'
  if (pct < 40) return 'Ai pornit bine — ține ritmul, fiecare lecție te apropie de examen.'
  if (pct < 75) return 'Ești peste jumătatea drumului. Continuă tot așa!'
  return 'Aproape gata — mai ai puțin până termini tot materialul.'
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

// Etichetă editorială: linie-accent + micro-text majuscul, exact ca pe Welcome.
function SectionLabel({ children, tone = 'primary', className = '' }) {
  const textColor = tone === 'muted' ? mutedText : 'text-primary'
  const lineColor = tone === 'muted' ? 'bg-border' : 'bg-primary'
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className={`h-px w-7 shrink-0 ${lineColor}`} aria-hidden />
      <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${textColor}`}>
        {children}
      </span>
    </span>
  )
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
    <section className={`${cardClass} relative overflow-hidden p-4 sm:p-5`}>
      <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
      <div className="relative">
        <SectionLabel className="mb-3">Calendar de studiu</SectionLabel>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className={`shrink-0 rounded-lg border border-border/70 p-1 transition-colors hover:border-primary hover:text-primary ${mutedText}`}
            aria-label="Luna anterioară"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className={`text-sm leading-tight ${editorialHeading}`}>
              {MONTH_LABELS_RO[monthView.getMonth()]} {monthView.getFullYear()}
            </p>
            <p className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
              Azi · {today.getDate()} {MONTH_LABELS_RO[today.getMonth()].slice(0, 3)}
              {examIsToday && (
                <span className="text-red-500 dark:text-red-400"> · Examen BAC</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className={`shrink-0 rounded-lg border border-border/70 p-1 transition-colors hover:border-primary hover:text-primary ${mutedText}`}
            aria-label="Luna următoare"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="study-calendar-grid mx-auto mt-3 w-full max-w-sm">
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

        <ul className={`mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide ${mutedText}`}>
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
      </div>
    </section>
  )
}

function WeekDayRing({ day }) {
  const base = 'relative flex size-10 items-center justify-center rounded-full text-sm font-bold transition-colors sm:size-11'
  const labelBase = 'text-[10px] font-black uppercase tracking-widest'
  const examLabel = day.isExamDay ? ' · Examen BAC' : ''

  if (day.isExamDay && day.ringState === 'today') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`${labelBase} ${mutedText}`}>{day.label}</span>
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
        <span className={`${labelBase} text-red-500 dark:text-red-400`}>{day.label}</span>
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
        <span className={`${labelBase} text-primary`}>{day.label}</span>
        <div className={`${base} bg-[var(--primary)] text-white shadow-lg shadow-primary/25 ring-2 ring-primary/30`}>
          {day.dayNum}
        </div>
      </div>
    )
  }

  if (day.ringState === 'done') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`${labelBase} ${mutedText}`}>{day.label}</span>
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
        <span className={`${labelBase} ${mutedText}`}>{day.label}</span>
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
      <span className={`${labelBase} ${mutedText}`}>{day.label}</span>
      <div className={`${base} border-2 border-border bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400`}>
        {day.dayNum}
      </div>
    </div>
  )
}

function StatChip({ icon: Icon, label, value, iconClass = 'text-primary' }) {
  return (
    <div className="dashboard-stat-chip">
      <span className="dashboard-stat-chip__icon" aria-hidden>
        <Icon className={`size-4 ${iconClass}`} />
      </span>
      <div className="min-w-0">
        <p className={`text-[9px] font-black uppercase tracking-[0.16em] leading-tight ${mutedText}`}>{label}</p>
        <p className={`mt-0.5 font-heading text-base font-black tabular-nums ${headingText}`}>{value}</p>
      </div>
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
  const { user, session, authLoading, isPremium, openPremiumModal, errorMessage } = useAuth()
  const navigate = useNavigate()

  const activeProfiles = useMemo(
    () => getProfilesFromMetadata(user?.user_metadata),
    [user?.user_metadata],
  )
  const streak = Number(user?.user_metadata?.streak) || 0
  const lastActivityKey = user?.user_metadata?.last_streak_activity_date || null

  const profileCodes = useMemo(() => {
    const labels = activeProfiles.map((k) => getProfileMeta(k).shortLabel)
    return [...new Set(labels)]
  }, [activeProfiles])
  const programsSummary = useMemo(() => profileCodes.join(' · '), [profileCodes])

  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      if (authLoading || !user?.id || !session?.access_token) {
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
  }, [authLoading, user?.id, session?.access_token, activeProfiles, isPremium])

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
  const greeting = useMemo(() => getTimeGreeting(), [])
  const GreetingIcon = greeting.Icon
  const examLongDate = useMemo(() => formatLongDate(bacExamDate), [bacExamDate])
  const examFocus = useMemo(() => {
    if (daysUntilExam < 0) return { value: '—', caption: 'BAC-ul a trecut' }
    if (daysUntilExam === 0) return { value: '0', caption: 'BAC-ul este azi' }
    if (daysUntilExam === 1) return { value: '1', caption: 'zi până la BAC' }
    return { value: String(daysUntilExam), caption: 'zile până la BAC' }
  }, [daysUntilExam])
  const examYear = useMemo(() => bacExamDate.getFullYear(), [bacExamDate])
  const progressMessage = useMemo(
    () => getProgressMessage(progressPct, overallProgress.total),
    [progressPct, overallProgress.total],
  )

  // Tab-uri editoriale — segmented control cu majuscule grele.
  const dashboardTabBase = 'flex-1 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  const dashboardTabActive = 'bg-primary text-white shadow-sm shadow-primary/25'
  const dashboardTabInactive = `${mutedText} hover:text-foreground`

  return (
    <div className="relative min-h-screen text-foreground transition-colors duration-500">
      <MathRainCurtain />
      <Navbar />

      <main className="page-ambient-content container relative max-w-4xl py-8 pb-20 sm:py-10">
        <div className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
          <DashboardAmbient />
          <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
        </div>

        {error && <AlertMessage message={error} className="relative mb-4" />}
        {errorMessage && <AlertMessage message={errorMessage} className="relative mb-4" />}

        {loadingData ? (
          <div className="dashboard-reveal relative flex h-80 flex-col items-center justify-center gap-4">
            <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${mutedText}`}>Se încarcă datele...</p>
          </div>
        ) : (
          <div className="relative space-y-6 sm:space-y-7">
            {/* ── Cover sheet / hero editorial ─────────────────── */}
            <Reveal as="section" className="dashboard-hero-card relative overflow-hidden p-5 sm:p-7">
              <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/12 blur-3xl" aria-hidden />
              <div className="pointer-events-none absolute -bottom-20 left-1/4 size-40 rounded-full bg-indigo-400/8 blur-3xl" aria-hidden />

              <div className="relative grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
                {/* Coloana editorială */}
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <SectionLabel>Tabloul tău · Matematică BAC</SectionLabel>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/profile')}
                      className="-mt-1.5 shrink-0 gap-2 rounded-xl"
                    >
                      <UserAvatar metadata={user?.user_metadata} size="sm" className="size-6 ring-1 ring-primary/25" />
                      <span className="hidden text-[11px] font-black uppercase tracking-widest sm:inline">Profil</span>
                    </Button>
                  </div>

                  <p className={`mt-5 inline-flex items-center gap-2 text-sm font-medium ${mutedText}`}>
                    <GreetingIcon className="size-4 shrink-0 text-primary" aria-hidden />
                    {greeting.text},
                    <span style={{ fontFamily: SERIF }} className="text-base font-semibold not-italic text-primary">
                      {firstName}
                    </span>
                  </p>

                  <h1 className={`mt-2 text-3xl leading-[0.95] sm:text-4xl ${editorialHeading}`}>
                    {dashboardTitle}
                  </h1>

                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className={`text-[10px] font-black uppercase tracking-[0.18em] ${mutedText}`}>
                      Programul tău
                    </span>
                    <div className="flex items-center gap-2">
                      {profileCodes.map((code) => (
                        <span
                          key={code}
                          style={{ fontFamily: SERIF }}
                          className="rounded-lg border border-border bg-background/60 px-3 py-1 text-sm font-semibold italic text-primary"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Showpiece: ștampila de countdown (fișă tipărită) */}
                <div className="relative mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none">
                  <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 rounded-[1.1rem] border border-primary/20 bg-primary/[0.04]" aria-hidden />

                  <div
                    className="dashboard-countdown relative rotate-1 p-5 transition-transform duration-500 hover:rotate-0"
                    title={examCountdownLabel}
                  >
                    <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.5] dark:opacity-[0.35]" aria-hidden />

                    <div className="relative">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                        <GraduationCap className="size-3.5" aria-hidden />
                        Examen BAC
                      </span>

                      <div className="mt-1.5 flex items-end gap-3">
                        <span
                          style={{ fontFamily: SERIF }}
                          className="text-[3.6rem] font-bold italic leading-[0.78] tabular-nums text-primary sm:text-[4.25rem]"
                        >
                          {examFocus.value}
                        </span>
                        <span className={`mb-2 text-[11px] font-bold uppercase leading-tight tracking-wide ${mutedText}`}>
                          {examFocus.caption}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3.5">
                        <div className="leading-tight">
                          <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${mutedText}`}>Progres</p>
                          <p style={{ fontFamily: SERIF }} className="mt-0.5 text-xl font-bold italic tabular-nums text-primary">
                            {progressPct}%
                          </p>
                        </div>
                        <div className="leading-tight">
                          <p className={`text-[9px] font-black uppercase tracking-[0.16em] ${mutedText}`}>Streak</p>
                          <p className="mt-0.5 flex items-center gap-1.5">
                            <span style={{ fontFamily: SERIF }} className="text-xl font-bold italic tabular-nums text-foreground">
                              {streak}
                            </span>
                            <Flame className="size-4 text-orange-500" aria-hidden />
                          </p>
                        </div>
                      </div>

                      <div className={`mt-3.5 flex items-center gap-1.5 border-t border-border/60 pt-3 text-[10px] font-black uppercase tracking-[0.14em] ${mutedText}`}>
                        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
                        {examLongDate}
                      </div>
                    </div>
                  </div>

                  {/* ștampilă plutitoare BAC */}
                  <div
                    className="absolute -left-4 -top-4 hidden size-[4.5rem] rotate-[-12deg] items-center justify-center rounded-full border-2 border-primary/30 bg-background/85 text-center sm:flex"
                    aria-hidden
                  >
                    <span className="text-[9px] font-black uppercase leading-tight tracking-[0.14em] text-primary">
                      BAC
                      <br />
                      {examYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* fâșia săptămânii */}
              <div className="relative mt-7 border-t border-border/60 pt-5">
                <SectionLabel className="mb-4">Săptămâna ta</SectionLabel>
                <div className="dashboard-week-strip">
                  {weekDays.map((day) => (
                    <WeekDayRing key={day.key} day={day} />
                  ))}
                </div>
              </div>
            </Reveal>

            {/* ── Comutator vizualizare ────────────────────────── */}
            <Reveal
              delay={50}
              className="flex w-full rounded-xl border-2 border-border bg-background/70 p-1 sm:inline-flex sm:w-auto"
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
                <span
                  style={{ fontFamily: SERIF }}
                  className={`text-sm font-bold italic tabular-nums ${activeView === 'progress' ? 'text-white' : 'text-primary'}`}
                >
                  {progressPct}%
                </span>
              </button>
            </Reveal>

            {activeView === 'progress' ? (
              <div className="dashboard-bento">
                <Reveal as="section" delay={90} className={`dashboard-bento__main ${cardClass} relative overflow-hidden p-5 sm:p-7`}>
                  <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.4] dark:opacity-[0.28]" aria-hidden />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <SectionLabel>Progres la lecții</SectionLabel>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/5">
                        <TrendingUp className="size-4 text-primary" aria-hidden />
                      </span>
                    </div>

                    <div className="mt-4 flex items-end gap-3">
                      <span
                        style={{ fontFamily: SERIF }}
                        className="text-6xl font-bold italic leading-none tabular-nums text-primary sm:text-7xl"
                      >
                        {progressPct}
                        <span className="text-3xl sm:text-4xl">%</span>
                      </span>
                      <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${mutedText}`}>
                        {overallProgress.completed} din {overallProgress.total}
                        <br />finalizate
                      </p>
                    </div>

                    <div className="relative mt-7 pt-2">
                      <div className="relative h-2.5 overflow-visible rounded-full bg-slate-200 dark:bg-white/10">
                        <div
                          className="dashboard-progress-fill absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-[width] duration-700 ease-out"
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
                          <div className="h-px w-5 border-t border-dashed border-slate-300 dark:border-border" aria-hidden />
                          <Target className="size-4 text-primary" aria-hidden />
                        </div>
                      </div>
                    </div>

                    <p className={`mt-5 text-sm leading-relaxed ${mutedText}`}>
                      {progressMessage}
                    </p>
                    {isPremium && targetGradeReport && (
                      <p className={`mt-3 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-sm leading-relaxed ${mutedText}`}>
                        {targetGradeReport.message}
                      </p>
                    )}
                  </div>
                </Reveal>

                <aside className="dashboard-bento__aside space-y-3">
                  <Reveal delay={120} className="grid grid-cols-2 gap-2">
                    <StatChip icon={GraduationCap} label="Examen" value={formatShortDate(bacExamDate)} iconClass="text-red-500" />
                    <StatChip icon={Target} label="Notă țintă" value={targetScoreLabel} iconClass="text-primary" />
                    <StatChip icon={Flame} label="Streak" value={String(streak)} iconClass="text-orange-500" />
                    <StatChip
                      icon={CheckCircle2}
                      label="Finalizate"
                      value={String(overallProgress.completed)}
                      iconClass="text-emerald-600 dark:text-emerald-400"
                    />
                  </Reveal>

                  <Reveal as="section" delay={150} className={`${cardClass} px-4 py-3.5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-11 shrink-0">
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
                        <div>
                          <p className={`text-xs font-black uppercase tracking-wide ${headingText}`}>Obiectiv azi</p>
                          <p className={`mt-0.5 text-xs ${mutedText}`}>
                            {dailyGoal.studiedToday ? 'Ai studiat azi' : 'Încă nu ai studiat'}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontFamily: SERIF }} className={`text-lg font-bold italic tabular-nums ${headingText}`}>
                        {dailyGoal.goalDone}/{dailyGoal.goalTotal}
                      </span>
                    </div>
                  </Reveal>

                  {isPremium && (roadmaps.length > 0 || solvedVariants.length > 0) && (
                    <Reveal delay={180} className="grid gap-2">
                      {roadmaps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('/roadmap')}
                          className={`${cardClass} dashboard-card-lift flex items-center gap-2.5 px-3.5 py-3 text-left hover:border-primary/40`}
                        >
                          <Map className="size-4 shrink-0 text-primary" aria-hidden />
                          <span className={`min-w-0 flex-1 text-xs font-black uppercase tracking-wide ${headingText}`}>Plan de studiu</span>
                          <ChevronRight className={`size-4 shrink-0 ${mutedText}`} aria-hidden />
                        </button>
                      )}
                      {solvedVariants.length > 0 && (
                        <button
                          type="button"
                          onClick={() => navigate('/variante-rezolvate')}
                          className={`${cardClass} dashboard-card-lift flex items-center gap-2.5 px-3.5 py-3 text-left hover:border-primary/40`}
                        >
                          <NotebookPen className="size-4 shrink-0 text-primary" aria-hidden />
                          <span className={`min-w-0 flex-1 text-xs font-black uppercase tracking-wide ${headingText}`}>Variante rezolvate</span>
                          <ChevronRight className={`size-4 shrink-0 ${mutedText}`} aria-hidden />
                        </button>
                      )}
                    </Reveal>
                  )}

                  {!isPremium && (
                    <Reveal
                      as="button"
                      delay={180}
                      type="button"
                      onClick={openPremiumModal}
                      className={`${cardClass} dashboard-card-lift flex w-full items-center gap-2.5 border-primary/25 bg-primary/5 px-3.5 py-3 text-left hover:border-primary/50`}
                    >
                      <Crown className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="text-sm font-bold text-primary">
                        Raport complet cu{' '}
                        <span style={{ fontFamily: SERIF }} className="italic">Premium</span>
                      </span>
                    </Reveal>
                  )}
                </aside>

                <Reveal delay={130} className="dashboard-bento__calendar">
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
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {SUBJECT_PARTS.map((subject, idx) => {
                  const subjectLessons = lessonsBySubject[subject.value] || []
                  const completedCount = subjectLessons.filter((l) => completedSet.has(l.id)).length
                  const totalCount = subjectLessons.length
                  const subjectProgress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
                  const accent = SUBJECT_ACCENTS[subject.value] || SUBJECT_ACCENTS[1]
                  const isFreeSubject = subject.value === 3

                  return (
                    <Reveal
                      as="article"
                      key={subject.value}
                      delay={90 + idx * 50}
                      className={`group ${cardClass} dashboard-card-lift relative overflow-hidden`}
                    >
                      <div className="pointer-events-none absolute inset-0 scholar-grid opacity-[0.35] dark:opacity-[0.24]" aria-hidden />

                      {/* Capitol numerotat — numeral roman serif, ca pe Welcome */}
                      <div className="relative grid grid-cols-[auto_1fr] items-start gap-4 border-b border-border/60 p-4 sm:gap-6 sm:p-5">
                        <span
                          style={{ fontFamily: SERIF }}
                          className="select-none text-5xl font-bold italic leading-none text-slate-300 transition-colors duration-300 group-hover:text-primary dark:text-slate-700 sm:text-6xl"
                          aria-hidden
                        >
                          {subject.roman}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-lg sm:text-xl ${editorialHeading}`}>{subject.label}</h3>
                            {isFreeSubject && (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                                Gratuit
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.14em] ${mutedText}`}>
                            {completedCount}/{totalCount} finalizate · {subjectProgress}%
                          </p>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out ${accent.bar}`}
                              style={{ width: `${subjectProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <ul className="custom-scrollbar relative max-h-64 space-y-1 overflow-y-auto p-3">
                        {subjectLessons.length > 0 ? (
                          subjectLessons.map((lesson, lessonIdx) => {
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
                                  <span className="flex size-6 shrink-0 items-center justify-center">
                                    {isCompleted ? (
                                      <CheckCircle2 className="size-4 text-emerald-600" />
                                    ) : (
                                      <span
                                        style={{ fontFamily: SERIF }}
                                        className="text-sm font-bold italic tabular-nums text-primary/45"
                                      >
                                        {String(lessonIdx + 1).padStart(2, '0')}
                                      </span>
                                    )}
                                  </span>
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
                          <li className={`rounded-xl border-2 border-dashed border-border py-8 text-center text-[11px] font-black uppercase tracking-[0.16em] ${mutedText}`}>
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
