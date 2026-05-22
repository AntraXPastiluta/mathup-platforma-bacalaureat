import { BookOpen, FileText, Map, Shield, Users } from 'lucide-react'

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
  { id: 'premium', label: 'Premium', icon: Users, description: 'Abonamente elevi' },
  { id: 'admins', label: 'Admins', icon: Shield, description: 'Control acces' },
]

export const LESSON_EDITOR_TABS = [
  { id: 'content', label: 'Conținut' },
  { id: 'parts', label: 'Părți' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'files', label: 'Fișiere' },
]
