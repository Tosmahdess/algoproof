import type { Metadata } from 'next'
import Link from 'next/link'
import { BYBIT_AFFILIATE_URL, HL_AFFILIATE_URL } from '@/lib/affiliates'

export const metadata: Metadata = {
  title: 'Démarrer — Trader les bots depuis la France',
  description: 'Binance a cessé de servir les résidents français (MiCA, juillet 2026). Découvrez Bybit, Hyperliquid et Kraken, les exchanges compatibles pour trader les stratégies AlgoProof depuis la France.',
  openGraph: { url: 'https://algoproof.fr/start' },
}

export default function StartPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-12">

      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Trader les bots depuis la France
        </h1>
        <p className="text-muted leading-relaxed">
          Binance Futures est bloqué pour les résidents français depuis 2023 (restriction AMF), et
          Binance a cessé de servir la France au 1er juillet 2026 (réglementation MiCA). Trois
          plateformes restent compatibles pour trader les mêmes stratégies. Mon propre bot spot
          live tourne sur Kraken depuis le 30 juin.
        </p>
      </div>

      {/* Exchange cards */}
      <div className="grid gap-6 sm:grid-cols-2">

        {/* Bybit */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bybit</h2>
            <span className="rounded-full bg-positive/10 border border-positive/30 px-2.5 py-0.5 text-xs font-medium text-positive">
              Recommandé débutants
            </span>
          </div>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>✓ Exchange centralisé (CEX) — interface familière</li>
            <li>✓ Dépôt fiat (virement, carte bancaire)</li>
            <li>✓ KYC standard, disponible en France</li>
            <li>✓ Frais taker compétitifs</li>
            <li>✓ API compatible avec nos bots</li>
          </ul>
          <div className="space-y-2 text-xs text-muted">
            <p className="font-medium text-text">3 étapes pour démarrer :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Créer un compte et passer le KYC</li>
              <li>Déposer des USDT (virement SEPA ou carte)</li>
              <li>Générer une clé API et la configurer dans le bot</li>
            </ol>
          </div>
          <a
            href={BYBIT_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-positive py-2.5 text-center text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Ouvrir un compte Bybit →
          </a>
        </div>

        {/* Hyperliquid */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Hyperliquid</h2>
            <span className="rounded-full bg-muted/10 border border-border px-2.5 py-0.5 text-xs font-medium text-muted">
              Avancé
            </span>
          </div>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>✓ Exchange décentralisé (DEX) — non-custodial</li>
            <li>✓ Dépôt USDC via Arbitrum</li>
            <li>✓ Frais taker 0.065%, maker rebate</li>
            <li>✓ 150+ paires perps disponibles</li>
            <li>✓ Agent wallet isolé (sécurité renforcée)</li>
          </ul>
          <div className="space-y-2 text-xs text-muted">
            <p className="font-medium text-text">3 étapes pour démarrer :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Installer MetaMask et acheter de l&apos;USDC</li>
              <li>Bridger l&apos;USDC vers Arbitrum et déposer sur HL</li>
              <li>Créer un agent wallet avec permissions trade-only</li>
            </ol>
          </div>
          <a
            href={HL_AFFILIATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-border py-2.5 text-center text-sm font-semibold text-text transition-colors hover:border-muted"
          >
            Découvrir Hyperliquid →
          </a>
        </div>

        {/* Kraken */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kraken</h2>
            <span className="rounded-full bg-positive/10 border border-positive/30 px-2.5 py-0.5 text-xs font-medium text-positive">
              Mon bot spot tourne ici
            </span>
          </div>
          <ul className="space-y-1.5 text-sm text-muted">
            <li>✓ Disponible en France (cadre MiCA)</li>
            <li>✓ Dépôt EUR par virement SEPA</li>
            <li>✓ Exchange historique (2011), réputation sécurité solide</li>
            <li>✓ API compatible avec nos bots spot</li>
            <li>✓ C&apos;est ici que mon bot EMA Cross live tourne depuis le 30 juin 2026</li>
          </ul>
          <div className="space-y-2 text-xs text-muted">
            <p className="font-medium text-text">3 étapes pour démarrer :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Créer un compte et passer le KYC</li>
              <li>Déposer des EUR (virement SEPA) ou de l&apos;USDC</li>
              <li>Générer une clé API Spot et la configurer dans le bot</li>
            </ol>
          </div>
          <a
            href="https://www.kraken.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-border py-2.5 text-center text-sm font-semibold text-text transition-colors hover:border-positive hover:text-positive"
          >
            Découvrir Kraken →
          </a>
        </div>
      </div>

      {/* Affiliate disclosure */}
      <p className="text-xs text-muted">
        Transparence : le lien Bybit ci-dessus est un lien d'affiliation : si tu ouvres un
        compte en passant par lui, je touche une commission, sans aucun surcoût pour toi. Les liens
        Hyperliquid et Kraken ne sont pas affiliés. Ça ne change ni mon avis ni mes comparatifs.
      </p>

      {/* Comparison table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Comparatif</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-4 py-3 text-left font-medium text-muted">Critère</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Bybit</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Hyperliquid</th>
                <th className="px-4 py-3 text-left font-medium text-muted">Kraken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Type',               'CEX',             'DEX',              'CEX'],
                ['Dépôt',              'Fiat + crypto',   'USDC Arbitrum',    'Fiat (EUR SEPA) + crypto'],
                ['Frais taker',        '~0.055%',         '0.065%',           '~0.26% spot*'],
                ['Futures FR',         '✓ Oui',           '✓ Oui',            '✗ Non'],
                ['Spot FR',            '✓ Oui',           '—',                '✓ Oui'],
                ['Complexité setup',   'Facile',          'Avancée',          'Facile'],
                ['Custodial',          'Oui',             'Non',              'Oui'],
              ].map(([label, bybit, hl, kraken]) => (
                <tr key={label} className="hover:bg-card/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted">{label}</td>
                  <td className="px-4 py-3 text-text">{bybit}</td>
                  <td className="px-4 py-3 text-text">{hl}</td>
                  <td className="px-4 py-3 text-text">{kraken}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">* Frais dégressifs selon le volume : vérifier les grilles exactes sur les sites des plateformes.</p>
      </div>

      {/* Why not Binance */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold">Pourquoi pas Binance ?</h2>
        <p className="text-sm text-muted leading-relaxed">
          Depuis 2023, l&apos;AMF (Autorité des Marchés Financiers) a demandé aux plateformes de dérivés crypto
          de restreindre l&apos;accès aux résidents français : Binance Futures est bloqué depuis. Et au
          1er juillet 2026, avec la fin de la période de transition MiCA, Binance a cessé de servir les
          résidents français y compris pour le spot. Mon propre bot spot live a migré sur Kraken le 30 juin
          2026, sans changer de stratégie.
        </p>
        <p className="text-sm text-muted leading-relaxed">
          <strong className="text-text">À ne pas faire :</strong> utiliser un VPN pour contourner la restriction
          expose votre compte au freeze et vous engage juridiquement.
        </p>
      </div>

      {/* CTA bottom */}
      <div className="text-center">
        <Link
          href="/strategies"
          className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-medium text-text transition-colors hover:border-positive hover:text-positive"
        >
          Voir toutes les stratégies →
        </Link>
      </div>

    </main>
  )
}
