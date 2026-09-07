import Link from 'next/link'

/**
 * Le cours n'est plus publié, et la page le dit plutôt que de laisser un trou.
 *
 * La seule source dont je disposais était le point de terminaison non documenté
 * de Yahoo Finance, appelé avec un User-Agent de navigateur maquillé. Ses
 * conditions interdisent aussi bien le scraping que la rediffusion, et la même
 * interdiction vaut pour un prix stocké puis republié — le passage par une base
 * n'y change rien. Une licence d'affichage écrite coûte environ 2 750 €/an, ce
 * que le trafic actuel ne justifie pas.
 *
 * Ce qui reste publié : les pourcentages calculés à partir de ces prix (une
 * performance, un recul), qui sont des faits sur un portefeuille et non un
 * substitut au service de cotation. Ce qui disparaît : toute valeur de cours.
 *
 * Raisonnement complet : `DECISIONS.md`, entrée 2026-09-08.
 */
export function PrixNonPublie({ ticker, avecLien = false }:
  { ticker?: string | null; avecLien?: boolean }) {
  const explication =
    "Je n'affiche pas de cours : la seule source gratuite dont je disposais " +
    "en interdit la rediffusion, et une licence d'affichage coûte plus que ce " +
    "que cette page rapporte."

  if (!avecLien || !ticker) {
    return (
      <span className="text-[11px] text-muted" title={explication}>
        cours non publié
      </span>
    )
  }
  return (
    <span className="text-sm text-muted">
      <span title={explication}>Cours non publié</span>
      {' — '}
      <Link
        href={`https://www.nasdaq.com/market-activity/stocks/${encodeURIComponent(ticker.toLowerCase())}`}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="underline underline-offset-2 hover:text-foreground"
      >
        voir le cours sur Nasdaq
      </Link>
    </span>
  )
}
