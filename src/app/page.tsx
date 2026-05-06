// src/app/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import BotCard from '@/components/BotCard'
import { getAllBotsWithStats } from '@/lib/queries'
import { DISCORD_URL } from '@/lib/constants'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AlgoProof — Verified Algo Trading',
  description: 'We show every trade — wins and losses. No fake screenshots. Real paper trading data updated hourly.',
}

export default async function HomePage() {
  const bots = await getAllBotsWithStats()

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">

      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-positive/10 border border-positive/20 text-positive text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
          Paper trading actif — chaque trade enregistré
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          La preuve par les chiffres.<br />
          <span className="text-positive">Chaque trade. Chaque perte.</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
          On publie chaque trade — gains, pertes, drawdowns. Données réelles, pas de backtests triés sur le volet.
          Quand on passe en live, vous le verrez ici en premier.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/strategies" className="px-5 py-2.5 bg-positive text-black font-semibold rounded-lg hover:bg-positive/90 transition-colors">
            STRATÉGIES — Voir les bots →
          </Link>
          <Link href="/wealth" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            PATRIMOINE — Système wealth
          </Link>
          <Link href="/intelligence" className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            INTELLIGENCE — Données marché
          </Link>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
             className="px-5 py-2.5 bg-card border border-border rounded-lg hover:border-muted/50 transition-colors">
            Rejoindre Discord
          </a>
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-3 gap-6 mb-20 border-y border-border py-10">
        {[
          { label: 'Zéro faux screenshots', desc: 'Dashboard live mis à jour toutes les heures depuis les données réelles des bots' },
          { label: 'Chaque perte affichée', desc: 'Drawdowns, mauvaises semaines, périodes plates — tout est visible' },
          { label: 'Vérifié par la communauté', desc: 'Les membres Discord recoupent les résultats en temps réel' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="font-semibold mb-1">{s.label}</div>
            <div className="text-sm text-muted">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Bot cards */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Stratégies actives</h2>
        <Link href="/strategies" className="text-sm text-muted hover:text-white transition-colors">Voir tout →</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
        {bots.map(b => <BotCard key={b.id} bot={b} />)}
      </div>

      {/* CTA Discord */}
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Suivre l&apos;aventure</h2>
        <p className="text-muted mb-6">Rejoignez le Discord pour être notifié des nouveaux trades, mises à jour de stratégies et discussions sur les paramètres.</p>
        <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
           className="inline-flex px-6 py-2.5 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors font-medium">
          Rejoindre Discord
        </a>
      </div>

    </div>
  )
}
