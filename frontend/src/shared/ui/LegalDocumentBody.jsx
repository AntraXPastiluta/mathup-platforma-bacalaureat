export function LegalDocumentBody({ sections, className = '' }) {
  if (!sections?.length) return null

  return (
    <div className={`space-y-8 ${className}`.trim()}>
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
            {section.title}
          </h2>
          {section.paragraphs?.map((paragraph) => (
            <p
              key={paragraph}
              className="mb-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 last:mb-0"
            >
              {paragraph}
            </p>
          ))}
          {section.list?.length ? (
            <ul className="mb-3 list-disc space-y-2 pl-5 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.afterList?.map((paragraph) => (
            <p
              key={paragraph}
              className="mb-3 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-400 last:mb-0"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  )
}
