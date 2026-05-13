import type { Metadata } from 'next'
import Link from 'next/link'
import { BYBIT_AFFILIATE_URL } from '@/lib/affiliates'

export const metadata: Metadata = {
  title: 'Démarrer — Trader les bots depuis la France',
  description: 'Binance Futures est bloqué en France depuis 2023 (AMF). Découvrez Bybit et Hyperliquid, les deux exchanges compatibles pour trader les bots AlgoProof.',
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
          Binance Futures n&apos;est plus accessible aux résidents français depuis 2023 (restriction AMF).
          Deux exchanges compatibles permettent de trader les mêmes stratégies.
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
            href="https://app.hyperliquid.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-border py-2.5 text-center text-sm font-semibold text-text transition-colors hover:border-muted"
          >
            Découvrir Hyperliquid →
          </a>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ['Type', 'CEX (centralisé)', 'DEX (décentralisé)'],
                ['Dépôt', 'Fiat + crypto', 'USDC via Arbitrum'],
                ['Frais taker', '~0.055%', '0.065%'],
                ['Paires disponibles', '300+', '150+'],
                ['Complexité setup', 'Facile', 'Avancée'],
                ['Custodial', 'Oui', 'Non'],
                ['Accessible France', '✓ Oui', '✓ Oui'],
              ].map(([label, bybit, hl]) => (
                <tr key={label} className="hover:bg-card/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted">{label}</td>
                  <td className="px-4 py-3 text-text">{bybit}</td>
                  <td className="px-4 py-3 text-text">{hl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">* Vérifier les frais exacts sur bybit.com/fee-schedule</p>
      </div>

      {/* Why not BF */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold">Pourquoi pas Binance Futures ?</h2>
        <p className="text-sm text-muted leading-relaxed">
          Depuis 2023, l&apos;AMF (Autorité des Marchés Financiers) a demandé aux plateformes de dérivés crypto
          de restreindre l&apos;accès aux résidents français. Binance a appliqué cette restriction volontairement
          pour ses produits Futures. Il n&apos;existe pas de dérogation individuelle.
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
