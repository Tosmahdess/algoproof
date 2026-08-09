// The shared engine-process block (« Comment je décide qu'une stratégie mérite
// un bot »). It used to render on all 22 concept pages; it now renders ONCE, at
// the top of /strategies, and the concept pages point here (#comment-je-decide).
// The copy itself stays in src/lib/gauntlet-explainer.ts — this file only owns
// the markup, so the copy guard tests keep a single target.
import Link from 'next/link'
import {
  GAUNTLET_EXPLAINER_TITLE,
  gauntletFunnel,
  GAUNTLET_TRIALS,
  GAUNTLET_VERDICTS,
  GAUNTLET_HONESTY,
  GAUNTLET_ACCESS,
} from '@/lib/gauntlet-explainer'
import type { SearchSpace } from '@/lib/engine-search-space'

// `space` comes from the page, which reads it server-side. Passed in rather than fetched
// here so this file stays markup-only and the copy guards keep a single target.
export default function GauntletExplainer({ space = null }: { space?: SearchSpace | null }) {
  return (
    <section
      id="comment-je-decide"
      data-testid="index-gauntlet"
      className="mb-10 bg-card border border-border rounded-lg p-5"
    >
      <h2 className="text-xs uppercase tracking-wider text-muted mb-3">
        {GAUNTLET_EXPLAINER_TITLE}
      </h2>
      {gauntletFunnel(space).map((p, i) => <p key={i} className="text-sm mb-3">{p}</p>)}

      <p className="text-sm mb-3">Le gantelet, c’est quatre épreuves. Il faut tenir les quatre.</p>
      <ol className="space-y-3 mb-3">
        {GAUNTLET_TRIALS.map((t, i) => (
          <li key={t.name} className="text-sm">
            <span className="text-accent font-mono text-xs mr-2">{i + 1}</span>
            {t.name}
            <span className="block text-xs text-muted mt-1">{t.plain}</span>
          </li>
        ))}
      </ol>

      {GAUNTLET_VERDICTS.map((p, i) => <p key={i} className="text-sm mb-3">{p}</p>)}
      {GAUNTLET_HONESTY.map((p, i) => <p key={i} className="text-xs text-muted mb-3">{p}</p>)}
      <p className="text-xs text-muted mb-3">
        {GAUNTLET_ACCESS.before}
        <a
          href={GAUNTLET_ACCESS.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          {GAUNTLET_ACCESS.linkLabel}
        </a>
        {GAUNTLET_ACCESS.after}
      </p>

      <p className="text-xs text-muted">
        <a
          href="https://lab.algoproof.fr/cockpit/survivants"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          Ce que mon moteur a jugé
        </a>
        {' · '}
        <a
          href="https://lab.algoproof.fr/cockpit/dossier/emacross"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          Un dossier ouvert en entier
        </a>
        {' · '}
        <Link href="/lexique" className="text-accent underline">Les termes</Link>
        {' · '}
        <Link href="/preuve" className="text-accent underline">Ma méthode</Link>
      </p>
    </section>
  )
}
