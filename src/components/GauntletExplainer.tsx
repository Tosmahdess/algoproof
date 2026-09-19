// The shared engine-process block (« Comment je décide qu'une stratégie mérite
// un bot »). It used to render on all 22 concept pages; it now renders ONCE, at
// the top of /strategies, and the concept pages point here (#comment-je-decide).
// The copy itself stays in src/lib/gauntlet-explainer.ts — this file only owns
// the markup, so the copy guard tests keep a single target.
import Link from 'next/link'
import Repli from '@/components/Repli'
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
//
// 2026-09-19 (D055): folded on a phone, untouched on a computer. On a 390 px
// phone the search came at 2 083 px, after ~700 words. The anchor
// #comment-je-decide moved from the <section> to the <h2>, which is what Repli
// reads: the 22 concept pages still land on the block OPENED. The summary line
// is UI chrome, not engine copy, and it keeps the limit visible when folded.
export default function GauntletExplainer({ space = null }: { space?: SearchSpace | null }) {
  return (
    <Repli
      id="comment-je-decide"
      testId="index-gauntlet"
      titre={GAUNTLET_EXPLAINER_TITLE}
      resume="Comment je trie, les quatre épreuves, et la limite que j’écris noir sur blanc."
      resumeClassName="text-sm font-normal text-foreground"
      className="mb-10 bg-card border border-border rounded-lg p-5"
      titreClassName="text-xs uppercase tracking-wider text-muted"
      // At 1440 px the card ran ~110 characters a line. max-w-2xl (~78) and not
      // max-w-prose (~65): the latter pushed the search 307 px further down.
      corpsClassName="mt-3 max-w-2xl"
    >
      {gauntletFunnel(space).map((p, i) => <p key={i} className="text-sm mb-3">{p}</p>)}

      {/* The old sentence demanded all four trials, which contradicted « en sursis reste
          publiée » : rater une seule des trois épreuves de robustesse laisse la stratégie
          publiée (audit 2026-09-10). */}
      <p className="text-sm mb-3">Le gantelet, c’est quatre épreuves. Une candidate les tient toutes.</p>
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
      {/* Body size, not text-xs muted: this is the limit the site stands on,
          and it was the least readable paragraph of the page. */}
      {GAUNTLET_HONESTY.map((p, i) => <p key={i} className="text-sm text-muted mb-3">{p}</p>)}
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
    </Repli>
  )
}
