import { useEffect, useRef } from 'react'
import { isEditableEventTarget } from '../utils/graphMapping'

/**
 * Scurtăturile editorului, la nivel de fereastră: Ctrl+S (salvează), Ctrl+Z (anulează),
 * Ctrl+Y / Ctrl+Shift+Z (refă). Handlerele trec printr-un ref („latest ref”) ca listener-ul
 * să nu se re-aboneze la fiecare render — handleSave depinde de form/graf.
 */
export function useStudioShortcuts({ onSave, onUndo, onRedo }) {
  const handlersRef = useRef({ onSave, onUndo, onRedo })
  useEffect(() => {
    handlersRef.current = { onSave, onUndo, onRedo }
  })

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        handlersRef.current.onSave()
        return
      }
      // În inputuri lăsăm Ctrl+Z/Y nativ (undo de text), nu istoricul grafului.
      if (isEditableEventTarget(event.target)) return
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handlersRef.current.onUndo()
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        handlersRef.current.onRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
