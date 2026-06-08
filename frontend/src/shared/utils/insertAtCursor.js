// Inserează `snippet` la poziția cursorului dintr-un <textarea> controlat de React,
// înlocuind eventuala selecție. `cursorOffset` (opțional) indică unde să fie plasat
// caret-ul în interiorul snippet-ului după inserare (ex. în prima `{}` de la `\frac{}{}`);
// dacă lipsește, caret-ul ajunge la finalul textului inserat.
//
// Pentru că textarea-ul e controlat, `setValue` declanșează o re-randare care resetează
// caret-ul la final — de aceea îl restaurăm într-un `requestAnimationFrame`, după ce React
// a aplicat noua valoare în DOM.
export function insertAtCursor(textareaEl, snippet, currentValue, setValue, cursorOffset) {
  const value = typeof currentValue === 'string' ? currentValue : ''
  const start = textareaEl?.selectionStart ?? value.length
  const end = textareaEl?.selectionEnd ?? value.length

  const next = value.slice(0, start) + snippet + value.slice(end)
  setValue(next)

  const caret = start + (cursorOffset ?? snippet.length)
  requestAnimationFrame(() => {
    if (!textareaEl) return
    textareaEl.focus()
    textareaEl.setSelectionRange(caret, caret)
  })
}
