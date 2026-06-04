/**
 * Tabel mic generic pentru defalcările din panoul de Rapoarte.
 * Primește `columns` ([{ key, label }]) și `rows` (array de obiecte).
 */
export function ReportTable({ title, columns = [], rows, emptyLabel = 'Nu există date.' }) {
  const data = Array.isArray(rows) ? rows : []

  return (
    <div className="rounded-3xl border border-slate-300/50 bg-white p-6 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
      <h3 className="mb-4 text-lg font-black tracking-tight text-slate-800 dark:text-white">{title}</h3>

      {data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-semibold text-muted-foreground dark:border-white/10">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100 last:border-0 dark:border-white/5"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
