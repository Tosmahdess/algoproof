'use client'

import { useState } from 'react'
import { createSupabaseAuthBrowser } from '@/lib/supabase-auth-browser'

export function MagicLinkForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const sb = createSupabaseAuthBrowser()
    const { error: err } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })
    setBusy(false)
    if (err) setError("Le lien n'a pas pu partir. Réessaie dans un instant.")
    else setSent(true)
  }

  if (sent) {
    return (
      <p className="text-sm text-positive">
        Regarde ta boîte mail : je t&apos;ai envoyé un lien de connexion.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="email" required placeholder="ton@email.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-bg border border-border rounded px-3 py-2 text-sm placeholder:text-muted"
      />
      {error && <p className="text-xs text-negative">{error}</p>}
      <button
        type="submit" disabled={busy}
        className="w-full rounded-lg bg-positive px-4 py-2 text-sm font-semibold text-bg hover:bg-positive/90 disabled:opacity-40"
      >
        {busy ? '...' : 'Recevoir mon lien de connexion'}
      </button>
    </form>
  )
}
