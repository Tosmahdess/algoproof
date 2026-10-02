// The four trials of the gauntlet as tiles (lot 3, conception §5.1). Names come
// from the one copy module (gauntlet-explainer.ts) so the home and /strategies
// never disagree on what a trial is called; the one-line glosses are written here
// and name no threshold (tests/lib/engine-method-copy.test.ts sweeps them).
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import { GAUNTLET_TRIALS } from '@/lib/gauntlet-explainer'

const GLOSS = [
  'Le profit factor de son pire trimestre civil. Ce trimestre fait partie du backtest, ce n’est pas un test hors échantillon.',
  'Je décale ses signaux une centaine de fois pour voir si les entrées d’origine font mieux que ces décalages.',
  'Après le retrait de n’importe quel marché, il doit rester assez de marchés qualifiés.',
  'Deux marchés où la stratégie marche ne suffisent pas si elle peine sur les vingt autres.',
]

export default function MethodTiles() {
  return (
    <section data-testid="home-method" aria-labelledby="home-method-title" className="mb-12">
      <h2 id="home-method-title" className="text-xl font-semibold mb-3">Comment un bot gagne le droit de tourner</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GAUNTLET_TRIALS.map((t, i) => (
          <div key={t.name} data-testid="method-tile" className="bg-card-2 border border-border rounded-md p-3 sm:row-span-2 sm:grid sm:grid-rows-subgrid sm:gap-y-1">
            {/* Number inline with the title: on its own line it cost each tile 21 px (H-D4). */}
            <div className="flex items-baseline gap-1.5 mb-1 sm:mb-0">
              <span className="tabular-nums text-accent text-xs" aria-hidden="true">{i + 1}</span>
              <h3 className="text-sm font-semibold">{t.name}</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">{GLOSS[i]}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">
        Les trois issues sont recalée, en sursis ou candidate. Une candidate peut être suivie en simulation ; cela ne garantit pas qu’elle gagnera.{' '}
        <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>La méthode complète</Link>
      </p>
    </section>
  )
}
