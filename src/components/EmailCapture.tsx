'use client'

import { useState } from 'react'
import type { SubscribeSource } from '@/lib/subscribe'

interface Props {
  source: SubscribeSource
  title?: string
  description?: string
}

export default function EmailCapture({
  source,
  title = 'Suivre la recherche',
  description = 'Je publie mes backtests, mes rejets et les évolutions du labo. Laisse ton email pour recevoir les prochains write-ups et être prévenu à l’ouverture de l’abonnement. Pas de spam, désinscription sur simple réponse.',
}: Props) {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot, humans never fill it
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source, website }),
      })
      if (!res.ok) throw new Error('bad status')
      setSubmitted(true)
      setEmail('')
    } catch {
      setError('Ça n’a pas marché, réessaie dans un instant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="border border-border rounded-xl p-6 bg-card/40">
      <p className="text-sm font-bold mb-1">{title}</p>
      <p className="text-xs text-muted leading-relaxed mb-4">{description}</p>
      {submitted ? (
        <p className="text-xs text-positive">C&apos;est noté, à bientôt.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="ton@email.fr"
            aria-label="Adresse email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={254}
            required
            className="flex-1 bg-background border border-border rounded px-3 py-2 text-xs placeholder:text-muted focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="px-4 py-2 text-xs font-semibold bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi...' : 'Me prévenir'}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-negative mt-2">{error}</p>}
    </div>
  )
}
