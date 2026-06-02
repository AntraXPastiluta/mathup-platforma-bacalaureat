import { useState } from 'react'

import { Loader2, Send } from 'lucide-react'

import { AlertMessage } from '../../../shared/ui/AlertMessage'

import { toUserFacingError } from '../../../shared/utils/userFacingError'

import { submitSupportTicket } from '../../../services/supportTicketService'

import {

  SUPPORT_CATEGORIES,

  MIN_MESSAGE_LENGTH,

  MAX_MESSAGE_LENGTH,

  MAX_SUBJECT_LENGTH,

} from '../constants'



const fieldLabel =

  'mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'



export function SupportNewTicketForm({ onCreated }) {

  const [category, setCategory] = useState(SUPPORT_CATEGORIES[0].value)

  const [subject, setSubject] = useState('')

  const [message, setMessage] = useState('')

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')



  const handleSubmit = async (event) => {

    event.preventDefault()

    setError('')

    setSuccess('')



    const trimmedSubject = subject.trim()

    const trimmedMessage = message.trim()



    if (!trimmedSubject) {

      setError('Introdu un subiect pentru solicitare.')

      return

    }

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {

      setError('Introdu mesajul (minim 10 caractere).')

      return

    }



    setLoading(true)

    try {

      const ticket = await submitSupportTicket({

        category,

        subject: trimmedSubject.slice(0, MAX_SUBJECT_LENGTH),

        message: trimmedMessage.slice(0, MAX_MESSAGE_LENGTH),

      })

      setSubject('')

      setMessage('')

      setSuccess('Mesajul a fost trimis. Îți vom răspunde în curând.')

      onCreated?.(ticket)

    } catch (err) {

      setError(toUserFacingError(err))

    } finally {

      setLoading(false)

    }

  }



  const canSubmit =

    !loading &&

    subject.trim().length > 0 &&

    message.trim().length >= MIN_MESSAGE_LENGTH



  return (

    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">

      <div className="space-y-2.5">

        <div>

          <label className={fieldLabel} htmlFor="support-category">

            Categorie

          </label>

          <select

            id="support-category"

            value={category}

            onChange={(e) => setCategory(e.target.value)}

            className="support-chat-input !max-h-none w-full !rounded-lg"

          >

            {SUPPORT_CATEGORIES.map((c) => (

              <option key={c.value} value={c.value}>

                {c.label}

              </option>

            ))}

          </select>

        </div>



        <div>

          <label className={fieldLabel} htmlFor="support-subject">

            Subiect

          </label>

          <input

            id="support-subject"

            type="text"

            value={subject}

            onChange={(e) => setSubject(e.target.value)}

            maxLength={MAX_SUBJECT_LENGTH}

            className="support-chat-input !max-h-none w-full !rounded-lg"

            placeholder="Ex: Problemă la lecția de algebră"

          />

        </div>



        <div>

          <label className={fieldLabel} htmlFor="support-message">

            Mesaj

          </label>

          <textarea

            id="support-message"

            value={message}

            onChange={(e) => setMessage(e.target.value)}

            rows={3}

            maxLength={MAX_MESSAGE_LENGTH}

            className="support-chat-input !max-h-none w-full !rounded-lg"

            placeholder="Descrie problema cât mai clar..."

          />

        </div>

      </div>



      <div className="mt-3 space-y-2">

        {error && <AlertMessage message={error} variant="error" />}

        {success && <AlertMessage message={success} variant="success" />}



        <button

          type="submit"

          disabled={!canSubmit}

          className="support-chat-send inline-flex !h-9 !w-full !rounded-lg items-center justify-center gap-2 text-xs font-semibold disabled:opacity-50"

        >

          {loading ? (

            <Loader2 className="size-3.5 animate-spin" aria-hidden />

          ) : (

            <Send className="size-3.5" aria-hidden />

          )}

          <span>Trimite solicitarea</span>

        </button>

      </div>

    </form>

  )

}


