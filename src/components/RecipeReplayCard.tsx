import Link from 'next/link'
import { numericDate } from '@/lib/format-date'
import type { RecipeReplayView } from '@/lib/recipe-replay'

// What the replay on the repaired execution gives for this bot's recipe.
// Wording rules (user decision 2026-09-18): a replay, never a verdict, and no
// hard-gate outcome of any kind. D-AUDIT-4: the wave itself is not re-judged;
// the corrected engine re-runs the families it came from, and this block is
// replaced BY HAND (nothing replaces it automatically — see validUntil).
// The PF is the one of the selection universe (30 assets), so the card says
// it is not the bot's own basket.
function day(isoDate: string): string {
  // Bare YYYY-MM-DD: anchor at noon UTC so no timezone shifts the day.
  return numericDate(`${isoDate}T12:00:00Z`)
}

function basketClause(traded: number, universe: number): string {
  if (traded <= 0 || traded >= universe) return ''
  return traded === 1
    ? ', pas seulement sur celui que ce bot trade'
    : `, pas seulement sur les ${traded} que ce bot trade`
}

const ORIGIN =
  'Ce bot a été choisi en août par mon moteur de recherche, dans une version qui exécutait mal certains trades'

export default function RecipeReplayCard({ view, tradedAssets }: {
  view: RecipeReplayView
  tradedAssets: number
}) {
  if (view.state === 'pending') {
    return (
      <aside data-testid="recipe-replay"
             className="rounded-lg border border-border p-4 text-sm space-y-1 mb-8">
        <div className="text-xs uppercase tracking-widest text-muted">Rejeu de la recette</div>
        <p>{ORIGIN}. Sa recette n&apos;a pas encore été rejouée avec l&apos;exécution corrigée.</p>
      </aside>
    )
  }

  return (
    <aside data-testid="recipe-replay"
           className="rounded-lg border border-border p-4 text-sm space-y-2 mb-8">
      <div className="text-xs uppercase tracking-widest text-muted">
        Rejeu de la recette · {day(view.replayedOn)}
      </div>
      <p>
        {ORIGIN} (trois défauts, trouvés le 10 septembre). Le {day(view.replayedOn)}, j&apos;ai
        rejoué sa recette avec l&apos;exécution corrigée.
      </p>
      <p>
        Au rejeu, elle donne un{' '}
        <Link href="/lexique#profit-factor" className="text-accent">PF</Link>{' '}
        de {view.pf.toFixed(2).replace('.', ',')} sur {view.n} trades. C&apos;est mesuré sur
        les {view.universeAssets} actifs qui ont servi à la choisir
        {basketClause(tradedAssets, view.universeAssets)}, avec des données arrêtées
        au {day(view.dataThrough)}.
      </p>
      <p className="text-muted">
        Ce n&apos;est pas un nouveau verdict : je n&apos;ai pas refait le contrôle contre le
        hasard. Le moteur corrigé refait le tour des familles d&apos;où vient cette recette ;
        quand il aura fini, je remplacerai ce bloc à la main par ce qu&apos;il en dit.
      </p>
      <p className="text-xs text-muted font-mono">empreinte du moteur utilisé pour le rejeu : {view.engineFingerprint}</p>
    </aside>
  )
}
