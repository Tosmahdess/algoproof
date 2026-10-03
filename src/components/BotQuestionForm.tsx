'use client'

// « Une question sur ce bot ? » — replaces the public Discussion of a bot sheet
// (owner, 2026-09-26). The lab account page's form, carried here: an address to
// answer to and a message, no pseudo, a private reply. The bot is named in the
// message itself, so the operator knows which sheet it came from without a new
// column in contact_messages.
//
// Three rules from the lab's form hold here too: a sent message clears the text
// and keeps the address; a failed send clears NOTHING (losing someone's text to a
// network hiccup is the worst this screen can do); the API's own refusal wins.
import { useId, useState } from 'react'
import { CONTACT_MAX, sendQuestion, validateQuestion } from '@/lib/contact'

export default function BotQuestionForm({ botName, slug }: { botName: string; slug: string }) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const context = `Question sur le bot « ${botName} » (https://algoproof.fr/strategies/bot/${slug}) :\n\n`
  const maxText = CONTACT_MAX - context.length

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setSent(false)
    const checked = validateQuestion(email, message)
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    setBusy(true)
    const res = await sendQuestion({ ...checked.value, message: context + checked.value.message })
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? null)
      return
    }
    setSent(true)
    setMessage('')
  }

  const field = 'w-full rounded-md border border-border-strong bg-bg px-3 text-sm text-foreground placeholder:text-muted focus:border-accent'

  return (
    // Refonte lot 3 (2026-10-02): a section of the fiche between rules, no card.
    <section data-testid="bot-question" className="border-t border-border py-8 sm:py-10">
      <h2 className="text-2xl font-semibold tracking-tight">Une question sur ce bot ?</h2>
      <p className="text-xs text-muted mt-1">J’y réponds moi-même, à l’adresse que tu laisses. Rien n’est publié.</p>

      <form onSubmit={submit} noValidate className="mt-4 space-y-3 max-w-[68ch]">
        <div>
          <label htmlFor={`${id}-email`} className="block text-xs text-muted mb-1">Email</label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="pour que je puisse te répondre"
            className={`${field} min-h-11`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-message`} className="block text-xs text-muted mb-1">Message</label>
          <textarea
            id={`${id}-message`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            maxLength={maxText}
            placeholder="Ce que tu veux savoir sur ce bot."
            className={`${field} py-2 resize-y`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded border border-accent bg-button px-4 text-sm font-semibold text-foreground disabled:opacity-40 transition-colors"
          >
            {busy ? 'Envoi…' : 'Envoyer'}
          </button>
          {sent && <p className="text-xs text-muted">Merci, c’est arrivé. Je te réponds par mail.</p>}
        </div>
        {error && <p role="alert" className="text-xs text-negative">{error}</p>}
      </form>
    </section>
  )
}
