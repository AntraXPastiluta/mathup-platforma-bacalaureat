import { motion } from 'framer-motion'
import {
  Sigma,
  MousePointerClick,
  Eye,
  Layers,
  Infinity as InfinityIcon,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react'
import { MathContent } from '../../../shared/ui/MathContent'

// Catalog de exemple pentru ghid. `write` = exact ce tastează profesorul (cu $...$),
// astfel încât același șir e afișat ca text brut ȘI randat prin MathContent.
const EXAMPLE_GROUPS = [
  {
    id: 'baza',
    label: 'Bază — inline vs. bloc',
    items: [
      { write: 'Aria este $\\pi r^2$ pentru disc.', desc: 'Formulă în text (inline)' },
      { write: '$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$', desc: 'Formulă centrată pe rând (bloc)' },
    ],
  },
  {
    id: 'uzuale',
    label: 'Construcții uzuale',
    items: [
      { write: '$\\frac{a}{b}$', desc: 'Fracție' },
      { write: '$x^{n}$', desc: 'Putere' },
      { write: '$a_{n}$', desc: 'Indice' },
      { write: '$\\sqrt{x}$', desc: 'Radical' },
      { write: '$\\sqrt[3]{x}$', desc: 'Radical de ordin n' },
      { write: '$\\left| x \\right|$', desc: 'Modul' },
      { write: '$\\sum_{k=1}^{n} k$', desc: 'Sumă' },
      { write: '$\\int_{0}^{1} f(x)\\,dx$', desc: 'Integrală definită' },
      { write: '$\\vec{v}$', desc: 'Vector' },
      { write: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$', desc: 'Matrice 2×2' },
    ],
  },
  {
    id: 'litere',
    label: 'Litere și operatori',
    items: [
      { write: '$\\alpha,\\ \\beta,\\ \\pi,\\ \\Delta,\\ \\varphi$', desc: 'Litere grecești' },
      { write: '$a \\le b,\\ x \\ne y,\\ a \\pm b$', desc: 'Relații și operatori' },
      { write: '$x \\in \\mathbb{R},\\ A \\cup B,\\ A \\cap B$', desc: 'Mulțimi' },
      { write: '$\\infty,\\ \\to,\\ \\Rightarrow,\\ \\forall$', desc: 'Simboluri speciale' },
    ],
  },
  {
    id: 'bac',
    label: 'Exemple de Bacalaureat',
    items: [
      { write: '$ax^2 + bx + c = 0$', desc: 'Ecuația de gradul II' },
      { write: '$\\Delta = b^2 - 4ac$', desc: 'Discriminant' },
      { write: '$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$', desc: 'Soluțiile ecuației' },
      { write: "$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$", desc: 'Definiția derivatei' },
    ],
  },
]

const STEPS = [
  {
    icon: MousePointerClick,
    title: '1. Deschide paleta',
    body: 'În editorul unei lecții (secțiunea Curriculum → Conținut sau Părți), deasupra fiecărei casete de text există butonul „Σ Simboluri”. Apasă-l pentru a deschide paleta cu simboluri și termeni, grupate pe categorii.',
  },
  {
    icon: Sigma,
    title: '2. Alege un simbol',
    body: 'Click pe orice simbol îl inserează direct în text, la poziția cursorului. Pentru construcții cu „goluri” (fracție, putere, radical), cursorul sare automat în prima paranteză { } ca să poți completa imediat.',
  },
  {
    icon: Layers,
    title: '3. Inline sau pe rând separat',
    body: 'Bifează „Formulă pe rând separat ($$)” în paletă dacă vrei o formulă mare, centrată pe propriul rând (ex. o integrală). Altfel, formula apare în rândul textului (inline).',
  },
  {
    icon: Eye,
    title: '4. Verifică în previzualizare',
    body: 'Sub fiecare casetă de text apare un panou „Previzualizare” care randează formula exact cum o va vedea elevul. Dacă vezi text roșu, formula are o greșeală de scriere.',
  },
]

function GuideCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-3xl border border-slate-300/50 bg-white p-8 shadow-md dark:border-white/10 dark:bg-[#0a0f1c] dark:shadow-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ExampleRow({ write, desc }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{desc}</p>
        <code className="block break-words font-mono text-xs text-slate-600 dark:text-slate-300">{write}</code>
      </div>
      <div className="shrink-0 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2 dark:border-white/10 dark:bg-black/20 sm:min-w-[10rem] sm:text-right">
        <MathContent content={write} className="text-base text-slate-800 dark:text-slate-100" />
      </div>
    </div>
  )
}

export function MathGuideSection() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sigma className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Ghid formule matematice</h2>
          <p className="text-sm text-muted-foreground">
            Cum adaugi simboluri și formule în lecții, ca să se afișeze frumos elevilor.
          </p>
        </div>
      </div>

      {/* Cum scrii o formulă */}
      <GuideCard icon={Sigma} title="Cum scrii o formulă">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Formulele se scriu în <span className="font-bold text-slate-800 dark:text-white">LaTeX</span>, încadrate
          între simboluri <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">$</code>.
          Nu trebuie să le scrii de mână — folosește paleta „Σ Simboluri”. Există două moduri:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">$...$</code>
              {' '}— formulă <span className="font-bold">inline</span>, în rândul textului.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">•</span>
            <span>
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/10">$$...$$</code>
              {' '}— formulă <span className="font-bold">bloc</span>, centrată pe propriul rând.
            </span>
          </li>
        </ul>
        <div className="mt-5 space-y-3">
          {EXAMPLE_GROUPS[0].items.map((item) => (
            <ExampleRow key={item.write} {...item} />
          ))}
        </div>
      </GuideCard>

      {/* Pași de utilizare */}
      <GuideCard icon={MousePointerClick} title="Cum inserezi din editor">
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <step.icon className="size-4" />
                <p className="text-sm font-black text-slate-800 dark:text-white">{step.title}</p>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
            </div>
          ))}
        </div>
      </GuideCard>

      {/* Limită spre infinit — exemplu dedicat */}
      <GuideCard icon={InfinityIcon} title="Exemplu: limită spre infinit">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Ai două variante rapide pentru o limită spre infinit:
        </p>
        <ol className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="font-bold text-primary">1.</span>
            <span>
              Apasă butonul <span className="font-bold text-slate-800 dark:text-white">„lim →∞”</span> (categoria
              „Sume, integrale, limite”) — primești structura gata făcută, apoi scrii doar variabila.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-primary">2.</span>
            <span>
              Sau apasă <span className="font-bold text-slate-800 dark:text-white">„lim”</span>, scrie variabila, mută
              cursorul după <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">→</code> și
              apasă <span className="font-bold text-slate-800 dark:text-white">„∞”</span>. Când cursorul e deja într-o
              formulă, simbolul se adaugă <span className="font-bold">în interiorul</span> ei (nu creează o formulă nouă).
            </span>
          </li>
        </ol>
        <div className="mt-5">
          <ExampleRow write={'$\\lim_{n \\to \\infty} \\frac{1}{n} = 0$'} desc="Rezultat" />
        </div>
      </GuideCard>

      {/* Catalog rapid */}
      <GuideCard icon={Sigma} title="Catalog rapid">
        <p className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Exemple de scriere (stânga) și rezultatul randat (dreapta). Toate sunt disponibile și în paleta „Σ Simboluri”.
        </p>
        <div className="space-y-6">
          {EXAMPLE_GROUPS.slice(1).map((group) => (
            <div key={group.id} className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">{group.label}</p>
              {group.items.map((item) => (
                <ExampleRow key={item.write} {...item} />
              ))}
            </div>
          ))}
        </div>
      </GuideCard>

      {/* Bun de știut */}
      <GuideCard icon={Lightbulb} title="Bun de știut">
        <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              Dacă o formulă e scrisă greșit, în previzualizare și la elev apare cu
              <span className="font-bold text-rose-500"> text roșu</span> în loc să randeze — verifică parantezele
              <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">{'{ }'}</code> și comenzile.
            </span>
          </li>
          <li className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span>
              Fiecare formulă are nevoie de <span className="font-bold">$ de deschidere și de închidere</span>. Un singur
              <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">$</code> rămas singur în text
              apare ca simplu semn de dolar.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Textul normal (fără <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-white/10">$</code>)
              rămâne neschimbat, inclusiv rândurile noi. Poți combina liber text și formule în aceeași casetă.
            </span>
          </li>
        </ul>
      </GuideCard>
    </motion.div>
  )
}
