import type { Metadata } from 'next'
import { getAllBotsWithStats, getLatestPerScope } from '@/lib/queries'
import { supabaseServer } from '@/lib/supabase-server'
import OverviewClient from '@/components/OverviewClient'
import WhatsNew from '@/components/WhatsNew'
import type { TradeWithBot } from '@/lib/types'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Mes bots en direct — résultats de trading algo vérifiés',
  description: 'Chaque bot trade en conditions réelles, chaque trade est horodaté — gains et pertes. Profit factor, win rate et drawdown mis à jour toutes les heures.',
}

async function getRecentTrades(limit = 20): Promise<TradeWithBot[]> {
  const { data } = await supabaseServer
    .from('trades')
    .select('id,opened_at,closed_at,asset,side,pnl,reason,bots(name,slug,family)')
    .order('closed_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as TradeWithBot[]
}

export default async function OverviewPage() {
  const [bots, recentTrades, latestPerScope] = await Promise.all([
    getAllBotsWithStats(),
    getRecentTrades(20),
    getLatestPerScope(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <JsonLd data={faqJsonLd([
        { question: 'Les résultats sont-ils réels ?', answer: 'Oui. Les bots tournent en continu et chaque trade est enregistré automatiquement, gains comme pertes. Les chiffres sont mis à jour toutes les heures.' },
        { question: 'Qu\'est-ce que le profit factor ?', answer: 'C\'est le rapport entre l\'argent gagné et l\'argent perdu. Un PF de 1,3 signifie 1,30 € gagné pour 1 € perdu.' },
        { question: 'Le trading est-il en argent réel ?', answer: 'La plupart des bots sont en paper trading (simulation fidèle). Les bots en argent réel sont indiqués comme « live ».' },
      ])} />
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vue d&apos;ensemble</h1>
          <p className="text-sm text-muted max-w-2xl mb-6">
            Chaque bot ci-dessous trade en conditions réelles. Le <strong>profit factor</strong> (PF) divise les gains par les pertes : au-dessus de 1, la stratégie gagne. Tout est horodaté, rien n&apos;est retiré.
          </p>
          <p className="text-xs text-muted mb-6 max-w-2xl">
            Comment lire : le <a href="/lexique#profit-factor" className="text-accent">profit factor</a> mesure les gains divisés par les pertes, le <a href="/lexique#win-rate" className="text-accent">win rate</a> le % de trades gagnants, le <a href="/lexique#drawdown" className="text-accent">drawdown</a> la pire baisse. Plus de définitions dans le <a href="/lexique" className="text-accent">lexique</a>.
          </p>
          <p className="text-sm text-muted mt-1">
            Dashboard complet — données synchronisées depuis le VPS toutes les heures.
          </p>
        </div>
        <div className="text-right text-xs text-muted font-mono">
          <p>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="opacity-60">ISR 1h</p>
        </div>
      </div>
      <WhatsNew latest={latestPerScope} />
      <OverviewClient bots={bots} recentTrades={recentTrades} />
    </div>
  )
}
