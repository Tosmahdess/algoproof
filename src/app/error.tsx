// src/app/error.tsx
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-32 text-center">
      <p className="text-muted mb-4">Dashboard temporarily unavailable.</p>
      <p className="text-xs text-muted/60 mb-8">{error.digest}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-card border border-border rounded-lg text-sm hover:border-muted/50 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
