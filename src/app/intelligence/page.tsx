import type { Metadata } from 'next'
import { compileMDX } from 'next-mdx-remote/rsc'
import ExplainerBox from '@/components/ExplainerBox'
import JsonLd from '@/components/JsonLd'
import { faqJsonLd } from '@/lib/jsonld'
import MiRegimeBadge from '@/components/MiRegimeBadge'
import MiHistoryChart from '@/components/MiHistoryChart'
import MiPillarsSection from '@/components/MiPillarsSection'
import { getLatestMacroReport, getMiHistory, getComponentChangelog } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'La météo du marché — régime, risque ON/OFF, en français',
  description: 'Chaque jour, l\'état du marché résumé en clair : risque ON ou OFF. Un régime qui agrège volatilité, sentiment, dérivés et macro en un indicateur lisible.',
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
      'Indice Fear & Greed (0–100), normalisé sur [−100, +100]. Actualisé toutes les 30 min. Produit le régime : EXTREME_FEAR / FEAR / NEUTRAL / GREED / EXTREME_GREED.',
  },
  {
    id: 'derivatives',
    label: 'Produits dérivés',
    weight: '30%',
    color: '#d2a8ff',
    functional:
      'Surveille le marché des futures crypto en temps réel. Les taux de financement, l\'open interest et les liquidations révèlent quand l\'effet de levier est dangereusement élevé — précurseur classique des corrections violentes.',
    technical:
      'Binance Futures : taux de financement (8h) × 40% + ratio Long/Short contrariant × 35% + delta OI × 25%. Flux WebSocket liquidations (60s) : ajustements ±20 pts si >10M$/h. Symboles : BTC/ETH/SOL.',
  },
  {
    id: 'news',
    label: 'Actualités',
    weight: '20%',
    color: '#3fb950',
    functional:
      "Analyse les titres financiers en continu. Un événement négatif majeur (hack d'exchange, répression réglementaire, choc macro) peut bouger les marchés plus vite que n'importe quel indicateur. On surveille les news pour que les bots n'entrent pas dans la tempête.",
    technical:
      'Flux RSS : 3 sources crypto (CoinDesk, Decrypt, Cointelegraph) + 4 géopolitiques (Reuters, BBC, NYT, Al Jazeera). Scoring mots-clés ±15 pts/titre, décroissance exponentielle τ=2h. >20 000 titres archivés.',
  },
  {
    id: 'macro',
    label: 'Macro',
    weight: '20%',
    color: '#40c4ff',
    functional:
      "Surveille les conditions macroéconomiques : volatilité des marchés actions (VIX), force du dollar américain (DXY), et événements à venir comme les décisions de la Fed ou le CPI. La crypto n'existe pas en vase clos.",
    technical:
      'Base : VIX + DXY 5j. Ajustements MI-8→MI-11 : VIX term structure · credit spreads HYG/IEI · Put/Call SPY · insider buying SEC Form 4 · earnings beat · analyst revisions · short interest · options flow SPY+QQQ. Calendrier : FOMC/CPI/NFP blackout 2h, T2 blackout 30min.',
  },
  {
    id: 'institutional',
    label: 'Institutionnel',
    weight: 'obs.',
    color: '#f6c90e',
    functional:
      "Mesure le comportement des acteurs institutionnels : vol d'options crypto (DVOL), flux ETF Bitcoin (IBIT + FBTC), et structure du marché (dominance BTC, stablecoin dry powder). Ces signaux reflètent ce que font les grands capitaux, pas les traders retail.",
    technical:
      'BTC DVOL Deribit × 40% (vol implicite crypto VIX) + flux IBIT/FBTC var. j/j × 40% + USDT.D niveau + BTC.D tendance × 20%. Score observationnel [-100, +100], non intégré au score global avant validation 90 jours.',
  },
]

export const revalidate = 1800

export default async function IntelligencePage() {
  const [report, miHistory, miChangelogs] = await Promise.all([
    getLatestMacroReport(),
    getMiHistory(7),
    getComponentChangelog('mi'),
  ])

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
      <JsonLd data={faqJsonLd([
        { question: 'C\'est quoi un régime de marché ?', answer: 'Une lecture d\'ensemble de l\'humeur du marché — calme, tendu ou en stress — calculée à partir de plusieurs signaux agrégés.' },
        { question: 'À quelle fréquence est-ce mis à jour ?', answer: 'Le rapport macro est régénéré chaque jour, et les signaux live plusieurs fois par heure.' },
        { question: 'Ça sert à quoi ?', answer: 'À savoir quand le contexte est porteur ou risqué, pour les bots comme pour les décisions d\'investissement.' },
      ])} />
      {/* Hero */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-positive mb-2">
          Service d&apos;Intelligence de Marché
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Le gardien qui ne dort jamais.
        </h1>
        <p className="text-sm text-muted max-w-2xl mb-6">
          Chaque jour, je résume l&apos;état du marché : <strong>risque ON</strong> (favorable) ou <strong>risque OFF</strong> (prudence). Le « régime » agrège volatilité, sentiment, dérivés et macro en un seul indicateur lisible.
        </p>
        <p className="text-xs text-muted mb-6 max-w-2xl">
          Pourquoi ça compte : quand le risque passe à OFF, mes bots se font plus prudents (positions réduites, défense active). La météo du marché n&apos;est pas décorative — elle pilote des décisions. Termes expliqués dans le <a href="/lexique" className="text-accent">lexique</a>.
        </p>
        <p className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">
          Chaque bot AlgoProof est filtré par une couche d&apos;intelligence de marché en temps réel. Avant chaque trade, le service MI consulte 4 sources de données et décide si le marché est sûr. Sinon, aucun bot ne trade — sans exception.
        </p>
      </div>

      {/* Live regime */}
      <MiRegimeBadge />

      {/* Historical scores — 7 days */}
      <section>
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-base font-bold tracking-tight">Historique des scores</h2>
          <span className="text-xs text-muted">7 derniers jours · synchronisation toutes les 30 min</span>
        </div>
        <div className="rounded border border-border bg-card px-6 py-5">
          <MiHistoryChart data={miHistory} />
        </div>
        <p className="text-[10px] text-muted mt-2">
          Lignes fines = piliers individuels. Ligne blanche = score global composite.
          Zones pointillées à ±30 = frontières NEUTRAL / GREED / FEAR.
        </p>
      </section>

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

      {/* Pillars + changelog — tabbed */}
      <section>
        <h2 className="text-base font-bold tracking-tight mb-4">Les piliers</h2>
        <MiPillarsSection pillars={PILLARS} changelogs={miChangelogs} />
      </section>
    </main>
  )
}
