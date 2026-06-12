export function DashboardAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="dashboard-aurora absolute inset-0" />
      <div className="dashboard-mesh absolute inset-0 opacity-70 dark:opacity-50" />
      <span className="dashboard-particle dashboard-particle--a" />
      <span className="dashboard-particle dashboard-particle--b" />
      <span className="dashboard-particle dashboard-particle--c" />
      <span className="dashboard-particle dashboard-particle--d" />
      <span className="dashboard-particle dashboard-particle--e" />
    </div>
  )
}
