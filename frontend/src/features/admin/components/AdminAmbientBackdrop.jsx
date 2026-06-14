/**
 * Fundalul ambiental fix al paginilor de administrare — aceeași „atmosferă" indigo ca pe
 * tabloul de bord (aurora + mesh + particule + grilă de caiet). Pur decorativ, fără props;
 * partajat între consola `/admin` și paginile dedicate (ex. `/admin/curriculum`).
 */
export function AdminAmbientBackdrop() {
  return (
    <div
      className="ambient-backdrop-fixed pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="dashboard-aurora absolute inset-0" />
      <div className="dashboard-mesh absolute inset-0 opacity-70 dark:opacity-50" />
      <span className="dashboard-particle dashboard-particle--a" />
      <span className="dashboard-particle dashboard-particle--b" />
      <span className="dashboard-particle dashboard-particle--c" />
      <span className="dashboard-particle dashboard-particle--d" />
      <span className="dashboard-particle dashboard-particle--e" />
      <div className="absolute inset-0 scholar-grid opacity-[0.04] dark:opacity-[0.06]" />
    </div>
  )
}
