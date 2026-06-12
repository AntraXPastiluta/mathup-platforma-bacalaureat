/** Iunie = 5 în Date (0-indexed). */
export const DEFAULT_BAC_EXAM_MONTH = 5
export const DEFAULT_BAC_EXAM_DAY = 30

export function getDefaultBacExamDate() {
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  let exam = new Date(now.getFullYear(), DEFAULT_BAC_EXAM_MONTH, DEFAULT_BAC_EXAM_DAY)
  if (exam < now) {
    exam = new Date(now.getFullYear() + 1, DEFAULT_BAC_EXAM_MONTH, DEFAULT_BAC_EXAM_DAY)
  }
  return exam
}

export function parseBacExamDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0)
  }

  const str = String(value ?? '').trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (match) {
    const parsed = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12,
      0,
      0,
      0,
    )
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  return getDefaultBacExamDate()
}

export function formatBacExamDateInput(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDaysUntilExam(examDate) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exam = new Date(examDate)
  exam.setHours(0, 0, 0, 0)
  return Math.ceil((exam - now) / (1000 * 60 * 60 * 24))
}

export function formatExamCountdownLabel(daysUntilExam) {
  if (daysUntilExam < 0) return 'Examenul BAC a trecut'
  if (daysUntilExam === 0) return 'Examen BAC astăzi'
  if (daysUntilExam === 1) return 'Examen BAC în 1 zi'
  return `Examen BAC în ${daysUntilExam} zile`
}
