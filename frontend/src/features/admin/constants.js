import { BarChart3, BookOpen, FileText, Hammer, Map, Shield, Sigma } from 'lucide-react'

export const ALLOWED_LESSON_FILE_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'doc',
  'docx',
])

export const ADMIN_SECTIONS = [
  { id: 'curriculum', label: 'Curriculum', icon: BookOpen, description: 'Lecții și materie' },
  { id: 'ghid-formule', label: 'Ghid formule', icon: Sigma, description: 'Simboluri matematice' },
  // Secțiunile cu `href` au pagină dedicată (pe tot ecranul), nu se randează inline în consolă.
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, description: 'Trasee de studiu', href: '/admin/roadmaps' },
  { id: 'variants', label: 'Variante', icon: FileText, description: 'Arhivă rezolvări' },
  { id: 'rapoarte', label: 'Rapoarte', icon: BarChart3, description: 'Statistici platformă', technicalOnly: true },
  { id: 'admins', label: 'Admins', icon: Shield, description: 'Control acces', technicalOnly: true },
  { id: 'platform', label: 'Platformă', icon: Hammer, description: 'Mentenanță', technicalOnly: true },
]

/**
 * Secțiuni vizibile în panou. Profesorii văd doar conținutul (Curriculum, Roadmaps,
 * Variante); secțiunile `technicalOnly` (Rapoarte, Acces, Platformă) sunt rezervate
 * administratorilor tehnici (și principalului). Restricția e dublată server-side de RLS.
 */
export function getAdminSectionsForUser(isTechnicalAdmin) {
  return ADMIN_SECTIONS.filter((section) => !section.technicalOnly || isTechnicalAdmin)
}

/** Ruta paginii dedicate a unei secțiuni, dacă există (altfel secțiunea se randează inline). */
export function getSectionHref(sectionId) {
  return ADMIN_SECTIONS.find((section) => section.id === sectionId)?.href ?? null
}

export const LESSON_EDITOR_TABS = [
  { id: 'content', label: 'Conținut' },
  { id: 'parts', label: 'Părți' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'files', label: 'Fișiere' },
]
