import { NotebookPen } from 'lucide-react'

export function SolvedVariantDocumentIcon({ compact = false, className = '' }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-primary/10 bg-primary/10 text-primary shadow-sm ${
        compact ? 'size-8 rounded-lg' : 'size-10 rounded-xl'
      } ${className}`}
      aria-hidden="true"
    >
      <NotebookPen className={compact ? 'size-3.5' : 'size-4'} />
    </div>
  )
}
