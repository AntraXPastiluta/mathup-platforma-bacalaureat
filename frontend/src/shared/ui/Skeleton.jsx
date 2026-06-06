// Bloc de încărcare (skeleton) reutilizabil — shimmer pur CSS, fără dependențe.
// Stilurile de bază + shimmer-ul trăiesc în index.css (`.skeleton-block`), unde respectă
// și `prefers-reduced-motion`. Rotunjirea o controlează apelantul prin `rounded`, iar
// dimensiunile prin `className` (ex. „h-4 w-32"). Implicit `aria-hidden` — marchează
// regiunea-părinte cu `role="status"`/`aria-busy` și un text sr-only pentru cititoarele de ecran.
export function Skeleton({ className = '', rounded = 'rounded-lg', as: Tag = 'div', ...rest }) {
  return <Tag aria-hidden className={`skeleton-block ${rounded} ${className}`} {...rest} />
}
