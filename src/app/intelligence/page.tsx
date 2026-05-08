import type { Metadata } from 'next'
import { compileMDX } from 'next-mdx-remote/rsc'
import ExplainerBox from '@/components/ExplainerBox'
import MiRegimeBadge from '@/components/MiRegimeBadge'
import { getLatestMacroReport } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Intelligence de marché',
  description: 'La boussole du labo — ce qui guide nos décisions d\'entrée. Sentiment, dérivés, actualités, macro : 4 piliers de décision en temps réel.',
  openGraph: { url: 'https://algoproof.fr/intelligence' },
}

const REGIME_COLORS: Record<string, string> = {
  NEUTRAL: '#d2a8ff',
  BULL:    '#3fb950',
  BEAR:    '#ff4444',
}

const PILLARS = [
  {
    id: 'sentiment',
    label: 'Sentiment',
    weight: '30%',
    color: '#ff6b35',
    functional:
      "Suit la peur et la cupidité du marché en temps réel. Quand les traders sont dans la peur extrême, c'est souvent un signal d'alarme. Quand ils sont euphoriques, le risque augmente. Ce pilier mesure l'état émotionnel de la foule.",
    technical:
      'Indice Fear & Greed (0–100), normalisé sur [−50, +50]. Contribution au score = (valeur − 50) / 50 × pondération. Actualisé toutes les 60 secondes. Cache 15 minutes en cas d\'échec API.',
  },
  {
    id: 'derivatives',
    label: 'Produits dérivés',
    weight: '30%',
    color: '#d2a8ff',
    functional:
      'Surveille le marché des futures crypto en temps réel. Les taux de financement, l\'open interest et les liquidations révèlent quand l\'effet de levier est dangereusement élevé — précurseur classique des corrections violentes.',
    technical:
      'Binance Futures : taux de financement (8h), variation OI, ratio Long/Short. Flux WebSocket de liquidations (fenêtre glissante 60s). Composite : funding × 0,4 + delta_OI × 0,3 + ratio_LS × 0,3.',
  },
  {
    id: 'news',
    label: 'Actualités',
    weight: '20%',
    color: '#3fb950',
    functional:
      "Analyse les titres financiers en continu. Un événement négatif majeur (hack d'exchange, répression réglementaire, choc macro) peut bouger les marchés plus vite que n'importe quel indicateur. On surveille les news pour que les bots n'entrent pas dans la tempête.",
    technical:
      'Flux RSS de 3 sources (CoinDesk, CoinTelegraph, Reuters via proxy Google News). Score d\'impact TF-IDF par titre. Blackout T2 : 30 min. Blackout T1 : 2h.',
  },
  {
    id: 'macro',
    label: 'Macro',
    weight: '20%',
    color: '#40c4ff',
    functional:
      "Surveille les conditions macroéconomiques : volatilité des marchés actions (VIX), force du dollar américain (DXY), et événements à venir comme les décisions de la Fed ou le CPI. La crypto n'existe pas en vase clos.",
    technical:
      'VIX > 30 → verrou inconditionnel indépendamment du score composite. Scoring momentum DXY. Calendrier économique : 134 événements sur 2 niveaux. T1 (Fed/CPI/NFP) : pause 2h. T2 (données secondaires) : pause 30min.',
  },
]

export default async function IntelligencePage() {
  const report = await getLatestMacroReport()

  let reportContent: React.ReactElement | null = null
  if (report?.content) {
    try {
      const { content } = await compileMDX({ source: report.content })
      reportContent = content
    } catch {
      reportContent = null
    }
  }

  const regimeColor = report?.regime ? (REGIME_COLORS[report.regime] ?? '#888') : '#888'

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 space-y-16">
      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          Service d&apos;Intelligence de Marché
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Le gardien qui ne dort jamais.
        </h1>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          Chaque bot AlgoProof est filtré par une couche d&apos;intelligence de marché en temps réel. Avant chaque trade, le service MI consulte 4 sources de données et décide si le marché est sûr. Sinon, aucun bot ne trade — sans exception.
        </p>
      </div>

      {/* Live regime */}
      <MiRegimeBadge />

      {/* Daily macro report */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-base font-bold tracking-tight">Analyse macro du jour</h2>
          {report && (
            <span className="text-xs text-muted font-mono">
              {report.date}
              {report.score != null && (
                <> · score <span className={report.score >= 0 ? 'text-positive' : 'text-negative'}>{report.score.toFixed(1)}</span></>
              )}
              {report.regime && (
                <> · <span style={{ color: regimeColor }}>{report.regime}</span></>
              )}
            </span>
          )}
        </div>

        {reportContent ? (
          <div className="rounded border border-border bg-card px-6 py-5 prose prose-sm prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-lg prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-muted prose-h2:mt-6
            prose-p:text-sm prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-blockquote:border-border prose-blockquote:text-muted prose-blockquote:text-xs">
            {reportContent}
          </div>
        ) : (
          <div className="rounded border border-dashed border-border px-6 py-8 text-center">
            <p className="text-xs text-muted">Rapport non disponible — généré chaque jour à 9h UTC.</p>
          </div>
        )}
      </section>

      {/* Defense Mesh */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-4">Bouclier défensif</h2>
        <ExplainerBox stacked
          functional={
            <p>
              Le bouclier défensif est un filet de protection à cinq couches autour de chaque bot. Chaque couche peut arrêter le trading indépendamment en cas de danger — une couche défaillante ne fait pas tomber le système. Même si le service MI est hors ligne, les bots basculent sur des valeurs prudentes par défaut.
            </p>
          }
          technical={
            <div className="space-y-1 text-xs font-mono">
              <div className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-1">
                <span className="font-semibold">Layer 1</span>
                <span className="text-muted">Taille de position — ajustée selon le score MI</span>
                <span className="font-semibold">Layer 2</span>
                <span className="text-muted">is_safe_to_trade() — verrou strict, toutes les conditions doivent être remplies</span>
                <span className="font-semibold">Layer 3</span>
                <span className="text-muted">VIX &gt; 30 — arrêt complet inconditionnel</span>
                <span className="font-semibold">Layer 4</span>
                <span className="text-muted">Blackouts événements T1/T2 — pauses 2h / 30min</span>
                <span className="font-semibold">Layer 5</span>
                <span className="text-muted">Watchdog heartbeat — données périmées → bloqué par défaut</span>
              </div>
              <p className="pt-2 text-[10px] text-muted">
                Plage de score : [−100, +100]. Pondérations : Sentiment 30% · Dérivés 30% · Actualités 20% · Macro 20%.
                Condition : composite &gt; −30 ET VIX ≤ 30 ET pas de T1 dans 2h ET pas de T2 dans 30min.
              </p>
            </div>
          }
        />
      </section>

      {/* 4 Pillars */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-6">Les 4 piliers</h2>
        <div className="space-y-6">
          {PILLARS.map((p) => (
            <div key={p.id} className="rounded border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: p.color }}
                >
                  {p.label}
                </span>
                <span className="ml-auto text-xs text-muted font-mono">Poids {p.weight}</span>
              </div>
              <div className="border-t-0">
                <ExplainerBox stacked functional={p.functional} technical={p.technical} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
