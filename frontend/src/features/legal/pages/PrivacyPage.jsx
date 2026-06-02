import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ShieldCheck,
  Mail,
  ArrowUp,
  ArrowUpRight,
  Clock,
  CalendarDays,
  FileText,
  ListTree,
} from 'lucide-react'
import { getPrivacyPolicySections, getPrivacyPolicyTitle } from '../../../content/legal/privacyPolicy.ro'
import { LEGAL_DOCS_VERSION, OPERATOR, LEGAL_ROUTES } from '../../../content/legal/legalConstants'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

const RO_MONTHS = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
]

function formatRoDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${RO_MONTHS[m - 1]} ${y}`
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const EMAIL_SPLIT_RE = /([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/g
const EMAIL_TEST_RE = /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/

function RichText({ text }) {
  const parts = text.split(EMAIL_SPLIT_RE)
  return parts.map((part, i) =>
    EMAIL_TEST_RE.test(part) ? (
      <a
        key={`${part}-${i}`}
        href={`mailto:${part}`}
        className="font-bold text-primary decoration-primary/40 underline-offset-4 hover:underline"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Paragraph({ text }) {
  const noteMatch = text.match(/^(Not[ăa]:)\s*(.*)$/s)
  if (noteMatch) {
    return (
      <div className="my-4 flex gap-3 rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-400/20 dark:bg-amber-400/5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-200/90">
          <strong className="font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
            {noteMatch[1]}{' '}
          </strong>
          <RichText text={noteMatch[2]} />
        </p>
      </div>
    )
  }
  return (
    <p className="mb-4 text-[0.9375rem] font-medium leading-[1.75] text-slate-600 last:mb-0 dark:text-slate-300/90">
      <RichText text={text} />
    </p>
  )
}

const metaChips = (version, sectionCount, readingMinutes) => [
  { icon: FileText, label: 'Versiune', value: version },
  { icon: CalendarDays, label: 'Actualizat', value: formatRoDate(version) },
  { icon: Clock, label: 'Timp de citit', value: `~${readingMinutes} min` },
  { icon: ListTree, label: 'Secțiuni', value: String(sectionCount) },
]

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

export function PrivacyPage() {
  const rawSections = getPrivacyPolicySections()

  const sections = useMemo(
    () =>
      rawSections.map((section, i) => {
        const match = section.title.match(/^(\d+)\.\s*(.*)$/s)
        return {
          ...section,
          order: i,
          number: match ? match[1] : null,
          heading: match ? match[2] : section.title,
          id: slugify(section.title),
        }
      }),
    [rawSections],
  )

  const readingMinutes = useMemo(() => {
    const words = rawSections.reduce((acc, s) => {
      const blob = [
        s.title,
        ...(s.paragraphs || []),
        ...(s.list || []),
        ...(s.afterList || []),
      ].join(' ')
      return acc + blob.trim().split(/\s+/).length
    }, 0)
    return Math.max(1, Math.round(words / 200))
  }, [rawSections])

  const [activeId, setActiveId] = useState(sections[0]?.id)
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement
      const total = el.scrollHeight - el.clientHeight
      setProgress(total > 0 ? Math.min(1, el.scrollTop / total) : 0)
      setShowTop(el.scrollTop > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-28% 0px -62% 0px', threshold: 0 },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  const handleJump = (id) => (event) => {
    event.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.history.replaceState(null, '', `#${id}`)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/75 backdrop-blur-md dark:bg-slate-950/75">
        <div className="container flex items-center justify-between py-4">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform group-hover:-rotate-6">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              MathUP
            </strong>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="gap-2 rounded-xl text-slate-500"
          >
            <ChevronLeft className="size-4" />
            Înapoi
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div className="math-notebook-bg absolute inset-0 -z-10" aria-hidden="true" />
        <div className="dashboard-mesh absolute inset-0 -z-10" aria-hidden="true" />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-slate-50 dark:to-slate-950"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-6 bottom-[-3rem] -z-10 select-none font-heading text-[16rem] font-black leading-none text-primary/[0.06] dark:text-primary-400/[0.08]"
          aria-hidden="true"
        >
          §
        </span>

        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="container max-w-5xl py-16 sm:py-20"
        >
          <motion.div variants={fadeUp} className="mb-7">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary dark:bg-primary/10">
              <ShieldCheck className="size-3.5" />
              Document legal · GDPR
            </span>
          </motion.div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <motion.div
              variants={fadeUp}
              className="hidden size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary/30 ring-1 ring-white/20 sm:flex"
            >
              <ShieldCheck className="size-8" />
            </motion.div>

            <div className="min-w-0">
              <motion.h1
                variants={fadeUp}
                className="font-heading text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl dark:text-white"
              >
                {getPrivacyPolicyTitle()}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300/90"
              >
                Cum colectăm, folosim și protejăm datele tale pe MathUP — explicat clar,
                pe înțelesul tuturor și în conformitate cu Regulamentul (UE) 2016/679.
              </motion.p>
            </div>
          </div>

          <motion.dl
            variants={fadeUp}
            className="mt-9 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4"
          >
            {metaChips(LEGAL_DOCS_VERSION, sections.length, readingMinutes).map((chip) => (
              <div
                key={chip.label}
                className="rounded-2xl border border-border/70 bg-white/70 px-4 py-3 backdrop-blur dark:bg-white/[0.03]"
              >
                <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  <chip.icon className="size-3" />
                  {chip.label}
                </dt>
                <dd className="mt-1 font-heading text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {chip.value}
                </dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </section>

      {/* Body */}
      <main className="container max-w-5xl py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav aria-label="Cuprins" className="sticky top-28">
              <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                <ListTree className="size-3.5" />
                Cuprins
              </p>
              <ul className="space-y-0.5 border-l border-border/70">
                {sections.map((section) => {
                  const isActive = activeId === section.id
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={handleJump(section.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`-ml-px flex items-start gap-2.5 border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                          isActive
                            ? 'border-primary font-bold text-primary'
                            : 'border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        <span className="mt-px font-heading text-[11px] font-black tabular-nums opacity-60">
                          {section.number ? section.number.padStart(2, '0') : '·'}
                        </span>
                        <span className="leading-snug">{section.heading}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* Document */}
          <article className="min-w-0">
            <div className="space-y-12">
              {sections.map((section) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-12% 0px' }}
                  variants={fadeUp}
                  className="scroll-mt-28"
                >
                  <header className="mb-5 flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 font-heading text-base font-black tabular-nums text-primary dark:bg-primary/10">
                      {section.number ? section.number.padStart(2, '0') : '§'}
                    </span>
                    <h2 className="font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                      {section.heading}
                    </h2>
                  </header>

                  <div className="border-l-2 border-border/60 pl-5 sm:pl-7">
                    {section.paragraphs?.map((paragraph) => (
                      <Paragraph key={paragraph} text={paragraph} />
                    ))}

                    {section.list?.length ? (
                      <ul className="my-5 space-y-3">
                        {section.list.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span
                              className="mt-2 size-1.5 shrink-0 rotate-45 rounded-[1px] bg-primary"
                              aria-hidden="true"
                            />
                            <span className="text-[0.9375rem] font-medium leading-[1.7] text-slate-600 dark:text-slate-300/90">
                              <RichText text={item} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {section.afterList?.map((paragraph) => (
                      <Paragraph key={paragraph} text={paragraph} />
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>

            {/* Contact callout */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-12% 0px' }}
              variants={fadeUp}
              className="dashboard-hero-card mt-14 p-7 sm:p-9"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25">
                    <Mail className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Ai întrebări despre datele tale?
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300/90">
                      Pentru exercitarea drepturilor GDPR sau orice nelămurire, scrie-ne la{' '}
                      <a
                        href={`mailto:${OPERATOR.dpoEmail}`}
                        className="font-bold text-primary underline-offset-4 hover:underline"
                      >
                        {OPERATOR.dpoEmail}
                      </a>
                      .
                    </p>
                  </div>
                </div>
                <a href={`mailto:${OPERATOR.dpoEmail}`} className="shrink-0">
                  <Button size="sm" className="gap-2 rounded-xl">
                    <Mail className="size-4" />
                    Contactează-ne
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Footer nav */}
            <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-7 sm:flex-row sm:items-center">
              <Link
                to={LEGAL_ROUTES.terms}
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
              >
                Vezi și Termenii și condițiile
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <p className="text-xs font-medium text-slate-400">
                © {String(LEGAL_DOCS_VERSION).slice(0, 4)} {OPERATOR.name}
              </p>
            </div>
          </article>
        </div>
      </main>

      {/* Back to top */}
      <motion.button
        type="button"
        onClick={scrollToTop}
        aria-label="Înapoi sus"
        initial={false}
        animate={showTop ? { opacity: 1, y: 0, pointerEvents: 'auto' } : { opacity: 0, y: 16, pointerEvents: 'none' }}
        className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 ring-1 ring-white/20 transition-transform hover:scale-105 active:scale-95"
      >
        <ArrowUp className="size-5" />
      </motion.button>
    </div>
  )
}
