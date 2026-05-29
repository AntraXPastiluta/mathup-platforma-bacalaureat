import { useEffect, useRef, useState } from 'react'
import { Send, Lock } from 'lucide-react'
import { Button } from '../../../shared/ui/Button'
import { formatTicketDate } from '../../../services/supportConstants'

const MAX_MESSAGE_LENGTH = 2000

/**
 * Fir de conversație reutilizabil pentru tichetele de suport. Aceeași componentă
 * deservește elevul și administratorul; alinierea bulelor depinde de `selfRole`.
 *
 * `onSend(text)` trebuie să întoarcă `true` la trimitere reușită, caz în care
 * câmpul de scriere se golește. Părintele afișează erorile.
 */
export function SupportChatPanel({
  messages = [],
  selfRole,
  selfUserId = null,
  peerLabel = 'Echipă MathUP',
  onSend,
  sending = false,
  closed = false,
  readOnlyReason = null,
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  const canCompose = !closed && !readOnlyReason && typeof onSend === 'function'

  const submitDraft = async () => {
    const text = draft.trim()
    if (!text || sending || !canCompose) return
    const sent = await onSend(text)
    if (sent) setDraft('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitDraft()
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="max-h-[26rem] space-y-3 overflow-y-auto rounded-2xl border-2 border-border bg-slate-50 p-4 dark:bg-white/5"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-400">
            Niciun mesaj încă.
          </p>
        ) : (
          messages.map((message) => {
            // Prefer author identity so a message is "mine" only when this exact
            // account wrote it. This keeps alignment correct even with several
            // admins on one ticket. The synthesized seed message has no
            // author_user_id, so fall back to the role for that single case.
            const mine =
              message.author_user_id != null && selfUserId != null
                ? message.author_user_id === selfUserId
                : message.author_role === selfRole
            const label = mine ? 'Tu' : peerLabel
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] space-y-1 ${mine ? 'items-end text-right' : 'items-start text-left'}`}>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{label}</span>
                    <span className="font-bold normal-case tracking-normal text-slate-300">
                      {formatTicketDate(message.created_at)}
                    </span>
                  </div>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      mine
                        ? 'bg-primary text-white'
                        : message.author_role === 'admin'
                          ? 'bg-white text-slate-700 ring-2 ring-primary/20 dark:bg-slate-900 dark:text-slate-200'
                          : 'bg-white text-slate-700 ring-2 ring-border dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {closed ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Lock className="size-4" />
          Conversația este închisă.
        </div>
      ) : readOnlyReason ? (
        <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Lock className="size-4" />
          {readOnlyReason}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            rows={3}
            maxLength={MAX_MESSAGE_LENGTH}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie un mesaj… (Enter pentru trimitere, Shift+Enter pentru rând nou)"
            disabled={sending}
            className="w-full resize-none rounded-xl border-2 border-border bg-white px-4 py-3 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none disabled:opacity-50 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
            <Button
              type="button"
              onClick={submitDraft}
              disabled={sending || !draft.trim()}
              className="h-11 rounded-xl"
            >
              {sending ? 'Se trimite…' : 'Trimite'}
              {!sending && <Send className="ml-2 size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
