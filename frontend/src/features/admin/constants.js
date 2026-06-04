import { BarChart3, BookOpen, FileText, Hammer, Map, MessageCircle, Shield } from 'lucide-react'

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
  { id: 'roadmaps', label: 'Roadmaps', icon: Map, description: 'Trasee de studiu' },
  { id: 'variants', label: 'Variante', icon: FileText, description: 'Arhivă rezolvări' },
  { id: 'support', label: 'Suport', icon: MessageCircle, description: 'Tickete elevi' },
  { id: 'rapoarte', label: 'Rapoarte', icon: BarChart3, description: 'Statistici platformă' },
  { id: 'admins', label: 'Admins', icon: Shield, description: 'Control acces' },
  { id: 'platform', label: 'Platformă', icon: Hammer, description: 'Mentenanță', primaryAdminOnly: true },
]

/** Secțiuni vizibile în panou (Platformă = doar admin principal, verificat server-side). */
export function getAdminSectionsForUser(isPrimaryAdmin) {
  return ADMIN_SECTIONS.filter((section) => !section.primaryAdminOnly || isPrimaryAdmin)
}

export const LESSON_EDITOR_TABS = [
  { id: 'content', label: 'Conținut' },
  { id: 'parts', label: 'Părți' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'files', label: 'Fișiere' },
]
