import { useMemo } from 'react'
import katex from 'katex'

// Convenție: `$...$` formulă inline, `$$...$$` formulă pe rând separat (display).
// Blocul se potrivește înaintea inline-ului, iar inline-ul nu trece peste linii noi
// (`[^$\n]`), ca un `$` rătăcit să nu „înghită” paragraful următor.
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

// Folosim direct `katex` (build ESM), NU `react-katex`: wrapper-ul CJS al acestuia
// se rupe în bundle-ul de producție (interop rolldown-vite), făcând orice formulă
// să apară cu text roșu. `throwOnError: false` => formulele invalide sunt afișate
// roșu inline de KaTeX, fără să arunce excepție.
function renderMath(value, displayMode) {
  try {
    return katex.renderToString(value, {
      displayMode,
      throwOnError: false,
      errorColor: '#ef4444',
    })
  } catch {
    return null
  }
}

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

export function MathContent({ content, className = '', style }) {
  // Tokenizăm + randăm HTML-ul KaTeX o singură dată per conținut.
  const nodes = useMemo(() => {
    if (!content) return []
    return tokenize(content).map((token, index) => {
      if (token.type === 'text') {
        return { key: index, type: 'text', value: token.value }
      }
      const html = renderMath(token.value, token.type === 'block')
      if (html == null) {
        const source = token.type === 'block' ? `$$${token.value}$$` : `$${token.value}$`
        return { key: index, type: 'error', value: source }
      }
      return { key: index, type: token.type, html }
    })
  }, [content])

  if (!content) return null

  return (
    <div className={`whitespace-pre-wrap ${className}`.trim()} style={style}>
      {nodes.map((node) => {
        if (node.type === 'text') {
          return <span key={node.key}>{node.value}</span>
        }
        if (node.type === 'error') {
          // KaTeX a aruncat o excepție neașteptată — afișăm sursa, nu blocăm pagina.
          return (
            <span key={node.key} className="font-mono text-[0.9em] text-rose-500/80">
              {node.value}
            </span>
          )
        }
        if (node.type === 'block') {
          return <div key={node.key} dangerouslySetInnerHTML={{ __html: node.html }} />
        }
        return <span key={node.key} dangerouslySetInnerHTML={{ __html: node.html }} />
      })}
    </div>
  )
}
