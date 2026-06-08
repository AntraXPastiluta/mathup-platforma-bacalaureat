import { InlineMath, BlockMath } from 'react-katex'

// Convenție: `$...$` formulă inline, `$$...$$` formulă pe rând separat (display).
// Blocul se potrivește înaintea inline-ului, iar inline-ul nu trece peste linii noi
// (`[^$\n]`), ca un `$` rătăcit să nu „înghită” paragraful următor.
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

// Împarte textul în segmente: text simplu, formulă inline, formulă bloc.
// Orice `$` nepereche sau formulă goală rămâne text literal (nu ajunge la KaTeX).
function tokenize(text) {
  const tokens = []
  let last = 0
  let match

  MATH_RE.lastIndex = 0
  while ((match = MATH_RE.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ type: 'text', value: text.slice(last, match.index) })
    }

    const blockBody = match[1]
    const inlineBody = match[2]
    const raw = (blockBody ?? inlineBody ?? '').trim()

    if (!raw) {
      // Formulă goală ($$ $$ sau $ $) — păstrăm textul literal.
      tokens.push({ type: 'text', value: match[0] })
    } else if (blockBody != null) {
      tokens.push({ type: 'block', value: raw })
    } else {
      tokens.push({ type: 'inline', value: raw })
    }

    last = match.index + match[0].length
  }

  if (last < text.length) {
    tokens.push({ type: 'text', value: text.slice(last) })
  }

  return tokens
}

// Afișează o formulă invalidă ca text monospațiat (estompat), în loc să arunce
// eroare și să blocheze pagina. KaTeX moștenește `currentColor`, deci formulele
// valide preiau culoarea textului părinte (funcționează și pe temă întunecată).
function renderMathError(label) {
  return (error) => (
    <span
      className="font-mono text-[0.9em] text-rose-500/80"
      title={String(error?.message || error)}
    >
      {label}
    </span>
  )
}

export function MathContent({ content, className = '', style }) {
  if (!content) return null

  const tokens = tokenize(content)

  return (
    <div className={`whitespace-pre-wrap ${className}`.trim()} style={style}>
      {tokens.map((token, index) => {
        if (token.type === 'inline') {
          return (
            <InlineMath
              key={index}
              math={token.value}
              renderError={renderMathError(`$${token.value}$`)}
            />
          )
        }
        if (token.type === 'block') {
          return (
            <BlockMath
              key={index}
              math={token.value}
              renderError={renderMathError(`$$${token.value}$$`)}
            />
          )
        }
        return <span key={index}>{token.value}</span>
      })}
    </div>
  )
}
