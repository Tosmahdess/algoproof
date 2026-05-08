'use client'

import { useState, useEffect } from 'react'
import type { Comment } from '@/lib/types'

interface Props { slug: string }

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

export default function DiscussionTab({ slug }: Props) {
  const [comments,   setComments]   = useState<Comment[]>([])
  const [pseudo,     setPseudo]     = useState('')
  const [message,    setMessage]    = useState('')
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const fetchComments = async () => {
    try {
      const res  = await fetch(`/api/comments?slug=${slug}`)
      const data = await res.json()
      setComments(data)
    } catch {
      // silently fail — display stale state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchComments() }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pseudo.trim() || !message.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_slug: slug, pseudo, message }),
      })
      if (!res.ok) throw new Error("Erreur lors de l'envoi")
      setSubmitted(true)
      setPseudo('')
      setMessage('')
      await fetchComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-xs text-muted">Chargement...</p>

  return (
    <div className="space-y-6">
      {comments.length === 0 ? (
        <p className="text-xs text-muted italic">
          Aucune discussion pour l&apos;instant. Soyez le premier.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="border-b border-border/50 pb-4 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold">{c.pseudo}</span>
                <span className="text-[10px] text-muted">{fmt(c.created_at)}</span>
              </div>
              <p className="text-xs text-muted/90 leading-relaxed">{c.message}</p>
            </div>
          ))}
        </div>
      )}

      {submitted ? (
        <p className="text-xs text-positive">
          Message envoyé — il apparaîtra après modération.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest">
            Poser une question
          </p>
          <input
            type="text"
            placeholder="Pseudo"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            maxLength={50}
            required
            className="w-full bg-background border border-border rounded px-3 py-2 text-xs placeholder:text-muted focus:outline-none focus:border-[#ff6b35]"
          />
          <textarea
            placeholder="Votre question ou commentaire..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={1000}
            required
            rows={3}
            className="w-full bg-background border border-border rounded px-3 py-2 text-xs placeholder:text-muted focus:outline-none focus:border-[#ff6b35] resize-none"
          />
          {error && <p className="text-xs text-negative">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !pseudo.trim() || !message.trim()}
            className="px-4 py-2 text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] border border-[#ff6b35]/30 rounded hover:bg-[#ff6b35]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      )}
    </div>
  )
}
