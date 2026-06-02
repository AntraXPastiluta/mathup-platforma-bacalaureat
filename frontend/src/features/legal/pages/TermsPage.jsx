import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Scale,
  Mail,
  ArrowUp,
  ArrowUpRight,
  Clock,
  CalendarDays,
  FileText,
  ListTree,
  Ban,
  Building2,
  MapPin,
  Hash,
  FileBadge,
  ShieldCheck,
} from 'lucide-react'
import { getTermsAndConditionsSections, getTermsAndConditionsTitle } from '../../../content/legal/termsAndConditions.ro'
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

// Inline tokenizer — turns e-mail addresses into mailto links and the major
// statute references (OUG, Legea, Regulamentul UE) into small legal chips.
const EMAIL_SRC = '[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}'
const LEGAL_SRC = 'OUG\\s*\\d+\\/\\d{4}|Legea\\s*nr\\.\\s*\\d+\\/\\d{4}|Regulamentul\\s*\\(UE\\)\\s*\\d+\\/\\d{4}'
const TOKEN_RE = new RegExp(`(${EMAIL_SRC}|${LEGAL_SRC})`, 'g')
const EMAIL_TEST = new RegExp(`^${EMAIL_SRC}$`)
const LEGAL_TEST = /^(OUG|Legea|Regulamentul)/

function RichText({ text }) {
  const parts = String(text).split(TOKEN_RE)
  return parts.map((part, i) => {
    if (!part) return null
    if (EMAIL_TEST.test(part)) {
      return (
        <a
          key={`${part}-${i}`}
          href={`mailto:${part}`}
          className="font-bold text-primary decoration-primary/40 underline-offset-4 hover:underline"
        >
          {part}
        </a>
      )
    }
    if (LEGAL_TEST.test(part)) {
      return (
        <span
          key={`${part}-${i}`}
          className="mx-px whitespace-nowrap rounded-md border border-primary/20 bg-primary/[0.07] px-1.5 py-px font-heading text-[0.8em] font-bold tracking-tight text-primary dark:bg-primary/15"
        >
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function Paragraph({ text }) {
  const noteMatch = String(text).match(/^(Not[ăa]:)\s*(.*)$/s)
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

// Section 1 ("Informații despre Furnizor") is rendered as an operator identity
// card. Lines shaped "Cheie: Valoare" become an icon-labelled definition grid.
const KV_RE = /^([^:]{2,40}):\s+(.+)$/

function iconForKey(key) {
  const k = key.toLowerCase()
  if (k.includes('denumire')) return Building2
  if (k.includes('sediu') || k.includes('adres')) return MapPin
  if (k.includes('cui') || k.includes('înregistrare') || k.includes('inregistrare')) return Hash
  if (k.includes('reg') || k.includes('comer')) return FileBadge
  if (k.includes('mail')) return Mail
  return FileText
}

function OperatorCard({ leads, entries }) {
  return (
    <div className="border-l-2 border-border/60 pl-5 sm:pl-7">
      {leads.map((text) => (
        <Paragraph key={text} text={text} />
      ))}
      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/60 sm:grid-cols-2 dark:bg-white/[0.06]">
        {entries.map(({ key, value }) => {
          const Icon = iconForKey(key)
          return (
            <div key={key} className="flex items-start gap-3 bg-white/90 p-4 dark:bg-slate-950/70">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/15">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <dt className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {key}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <RichText text={value} />
                </dd>
              </div>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

const metaChips = (version, sectionCount, readingMinutes) => [
  { icon: FileText, label: 'Versiune', value: version },
  { icon: CalendarDays, label: 'Actualizat', value: formatRoDate(version) },
  { icon: Clock, label: 'Timp de citit', value: `~${readingMinutes} min` },
  { icon: ListTree, label: 'Clauze', value: String(sectionCount) },
]

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

export function TermsPage() {
  const rawSections = getTermsAndConditionsSections()

  const sections = useMemo(
    () =>
      rawSections.map((section, i) => {
        const match = section.title.match(/^(\d+)\.\s*(.*)$/s)
        const isOperator = /furnizor/i.test(section.title)
        const prohibitions =
          !!section.list?.length &&
          /interzis[ăa]?:?\s*$/i.test(section.paragraphs?.[section.paragraphs.length - 1] || '')

        let operatorLeads = null
        let operatorEntries = null
        if (isOperator) {
          operatorLeads = []
          operatorEntries = []
          for (const p of section.paragraphs || []) {
            const kv = p.match(KV_RE)
            if (kv) operatorEntries.push({ key: kv[1].trim(), value: kv[2].trim() })
            else operatorLeads.push(p)
          }
          if (!operatorEntries.length) {
            operatorLeads = null
            operatorEntries = null
          }
        }

        return {
          ...section,
          order: i,
          number: match ? match[1] : null,
          heading: match ? match[2] : section.title,
          id: slugify(section.title),
          prohibitions,
          operatorLeads,
          operatorEntries,
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
          className="pointer-events-none absolute -right-4 bottom-[-4rem] -z-10 select-none font-heading text-[18rem] font-black leading-none text-primary/[0.06] dark:text-primary-400/[0.08]"
          aria-hidden="true"
        >
          ¶
        </span>

        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="container max-w-5xl py-16 sm:py-20"
        >
          <motion.div variants={fadeUp} className="mb-7">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-primary dark:bg-primary/10">
              <Scale className="size-3.5" />
              Document legal · Acord de utilizare
            </span>
          </motion.div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <motion.div
              variants={fadeUp}
              className="hidden size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary/30 ring-1 ring-white/20 sm:flex"
            >
              <Scale className="size-8" />
            </motion.div>

            <div className="min-w-0">
              <motion.h1
                variants={fadeUp}
                className="font-heading text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl dark:text-white"
              >
                {getTermsAndConditionsTitle()}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300/90"
              >
                Regulile care guvernează folosirea platformei MathUP. Prin crearea unui cont
                și utilizarea serviciilor, accepți integral termenii de mai jos.
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
                          {section.number ? section.number.padStart(2, '0') : '¶'}
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
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/5 font-heading text-base font-black tabular-nums text-primary dark:bg-primary/10">
                      {section.number ? section.number.padStart(2, '0') : '¶'}
                    </span>
                    <h2 className="font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                      {section.heading}
                    </h2>
                  </header>

                  {section.operatorEntries ? (
                    <OperatorCard leads={section.operatorLeads} entries={section.operatorEntries} />
                  ) : (
                    <div className="border-l-2 border-border/60 pl-5 sm:pl-7">
                      {section.paragraphs?.map((paragraph) => (
                        <Paragraph key={paragraph} text={paragraph} />
                      ))}

                      {section.list?.length ? (
                        section.prohibitions ? (
                          <ul className="my-5 space-y-2.5">
                            {section.list.map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-3 rounded-xl border border-rose-300/50 bg-rose-50/60 p-3.5 dark:border-rose-400/20 dark:bg-rose-400/5"
                              >
                                <Ban className="mt-0.5 size-4 shrink-0 text-rose-500 dark:text-rose-400" />
                                <span className="text-[0.9375rem] font-medium leading-[1.7] text-slate-700 dark:text-slate-200/90">
                                  <RichText text={item} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
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
                        )
                      ) : null}

                      {section.afterList?.map((paragraph) => (
                        <Paragraph key={paragraph} text={paragraph} />
                      ))}
                    </div>
                  )}
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
                    <Scale className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                      Ai întrebări despre acești termeni?
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300/90">
                      Pentru orice nelămurire legată de utilizarea platformei, scrie-ne la{' '}
                      <a
                        href={`mailto:${OPERATOR.email}`}
                        className="font-bold text-primary underline-offset-4 hover:underline"
                      >
                        {OPERATOR.email}
                      </a>
                      .
                    </p>
                  </div>
                </div>
                <a href={`mailto:${OPERATOR.email}`} className="shrink-0">
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
                to={LEGAL_ROUTES.privacy}
                className="group inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-colors hover:text-primary dark:text-slate-400"
              >
                Vezi și Politica de Confidențialitate
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
