import { insertAtCursor } from './insertAtCursor'

// Determină dacă poziția `caret` se află în interiorul unei regiuni matematice
// ($...$ inline sau $$...$$ bloc), scanând delimitatorii dinaintea caretului.
// Convenție: un `$$` deschide/închide un bloc, un `$` o formulă inline (la fel ca
// tokenizer-ul din MathContent, unde `$a$$b$` = două formule inline alăturate).
export function isCaretInMath(text, caret) {
  const value = typeof text === 'string' ? text : ''
  const limit = Math.min(caret ?? value.length, value.length)
  let mode = 'text' // 'text' | 'inline' | 'block'
  let i = 0

  while (i < limit) {
    if (value[i] === '$') {
      const isDouble = value[i + 1] === '$'
      if (mode === 'text') {
        mode = isDouble ? 'block' : 'inline'
        i += isDouble ? 2 : 1
        continue
      }
      if (mode === 'block') {
        if (isDouble) {
          mode = 'text'
          i += 2
          continue
        }
        i += 1
        continue
      }
      // mode === 'inline' — un singur $ închide formula inline.
      mode = 'text'
      i += 1
      continue
    }
    i += 1
  }

  return mode !== 'text'
}

// Inserează un element din paletă la cursor. Dacă suntem deja într-o formulă,
// inserăm LaTeX brut (ca să putem compune, ex. ∞ în interiorul unei limite);
// altfel împachetăm în $...$ (inline) sau $$...$$ (bloc).
export function insertMathSnippet(textareaEl, item, block, currentValue, setValue) {
  const value = typeof currentValue === 'string' ? currentValue : ''
  const caret = textareaEl?.selectionStart ?? value.length

  if (isCaretInMath(value, caret)) {
    const offset = item.cursorOffset ?? item.snippet.length
    insertAtCursor(textareaEl, item.snippet, value, setValue, offset)
    return
  }

  const delimiter = block ? '$$' : '$'
  const wrapped = `${delimiter}${item.snippet}${delimiter}`
  const offset = item.cursorOffset != null
    ? item.cursorOffset + delimiter.length
    : wrapped.length
  insertAtCursor(textareaEl, wrapped, value, setValue, offset)
}
