/**
 * Accente editoriale partajate de paginile de administrare (consola `/admin` și paginile
 * dedicate). Aceeași voce „document tipărit" ca pe Dashboard / Welcome, fără fonturi externe
 * (CSP-safe).
 */

// Serif de manuscris pentru accentele editoriale.
export const SERIF =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, "Times New Roman", serif'

// Etichetă editorială: linie-accent + micro-text majuscul (ca pe Dashboard).
export function SectionLabel({ children, className = '' }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="h-px w-7 shrink-0 bg-primary" aria-hidden />
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
        {children}
      </span>
    </span>
  )
}

// Revelare unică la intrare — folosește animația comună din index.css.
export function Reveal({ delay = 0, as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`dashboard-reveal ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
