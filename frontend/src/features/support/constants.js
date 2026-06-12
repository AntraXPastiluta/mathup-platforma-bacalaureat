export const SUPPORT_CATEGORIES = [
  { value: 'cont', label: 'Cont și autentificare' },
  { value: 'plati', label: 'Plăți și Premium' },
  { value: 'continut', label: 'Conținut și lecții' },
  { value: 'tehnic', label: 'Problemă tehnică' },
  { value: 'altele', label: 'Altele' },
]

export const TICKET_STATUS_LABELS = {
  open: 'Deschis',
  in_progress: 'În lucru',
  closed: 'Închis',
}

export const MIN_MESSAGE_LENGTH = 10
// Răspunsurile din conversație pot fi scurte („Da”, „Mulțumesc”) — cerem doar text nevid.
export const MIN_REPLY_LENGTH = 1
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_SUBJECT_LENGTH = 200
