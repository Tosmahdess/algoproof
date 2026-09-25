// The four trials of the gauntlet as tiles (lot 3, conception §5.1). Names come
// from the one copy module (gauntlet-explainer.ts) so the home and /strategies
// never disagree on what a trial is called; the one-line glosses are written here
// and name no threshold (tests/lib/engine-method-copy.test.ts sweeps them).
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import { GAUNTLET_TRIALS } from '@/lib/gauntlet-explainer'

const GLOSS = [
  'Le PF de son pire trimestre civil. Pas un test hors échantillon, et je l’écris.',
  'Ses signaux décalés une centaine de fois. Si la vraie ne sort pas du lot, elle ne prouve rien.',
  'Le retrait de n’importe quel marché doit en laisser assez.',
  'Deux qui marchent et vingt qui traînent, ça ne suffit pas.',
]

export default function MethodTiles() {
  return (
    <section data-testid="home-method" aria-labelledby="home-method-title" className="mb-12">
      <h2 id="home-method-title" className="text-xl font-semibold mb-3">Comment un bot gagne le droit de tourner</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GAUNTLET_TRIALS.map((t, i) => (
          <div key={t.name} data-testid="method-tile" className="bg-card border border-border rounded-lg p-4">
            <p className="font-mono text-accent text-xs mb-1" aria-hidden="true">{i + 1}</p>
            <h3 className="text-sm font-semibold mb-1">{t.name}</h3>
            <p className="text-xs text-muted leading-relaxed">{GLOSS[i]}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted mt-3">
        Au bout, trois issues : recalée, en sursis, candidate. Une candidate n’est pas une gagnante, elle a gagné le droit d’être surveillée.{' '}
        <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>La méthode complète</Link>
      </p>
    </section>
  )
}
