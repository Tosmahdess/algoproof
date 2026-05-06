import { DISCORD_URL, TWITTER_URL } from '@/lib/constants'

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-10">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-muted">
        <span>AlgoProof — Chaque trade, chaque perte, tout est public.</span>
        <div className="flex gap-6">
          <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">X / Twitter</a>
          <a href={DISCORD_URL}  target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-4 text-xs text-muted/50">
        Ceci n'est pas un conseil financier. Toutes les performances sont en paper trading sauf mention contraire.
      </div>
    </footer>
  )
}
