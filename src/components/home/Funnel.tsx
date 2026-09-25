// The engine's funnel as bars (lot 3, conception §3.4 and §5.1; mock-ups of PASS 4).
// Four steps: swept, judged, their verdicts, candidates. Widths on a log10 scale
// (lib/home-data.ts): the last step is 1 configuration in 12 000, invisible on a
// linear bar. The fleet is written BESIDE the funnel, never as its last step: the
// funnel counts configurations of the engine, the fleet counts bots, some of them
// deployed by hand before the engine existed (D059 refused the fusion, twice).
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { FunnelCounts } from '@/lib/funnel'
import { frNumber } from '@/lib/display'
import { funnelWidths } from '@/lib/home-data'
import { heroRatio } from '@/lib/hero-ratio'
import { floorSharePct } from '@/lib/cockpit-share'
import { labUrl } from '@/lib/lab-links'

const n = (v: number) => frNumber(v, 0)

function Step({ label, value, sub, children }: { label: string; value?: number; sub?: string; children: React.ReactNode }) {
  return (
    <div data-testid="funnel-step" className="grid gap-1 sm:grid-cols-[200px_1fr] sm:gap-4 sm:items-center">
      <div>
        {value !== undefined && <div data-testid="funnel-value" className="font-mono text-xl font-medium leading-tight tabular-nums">{n(value)}</div>}
        <div data-testid="funnel-label" className={`text-xs ${value === undefined ? 'text-foreground text-sm font-medium' : 'text-muted'}`}>{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Bar({ width, note }: { width: number; note: string }) {
  return (
    <>
      <div className="h-7 rounded bg-border-strong relative">
        <div data-testid="funnel-bar" className="absolute inset-y-0 left-0 rounded bg-muted/60" style={{ width: `${width}%` }} />
      </div>
      <p className="text-xs text-muted mt-1">{note}</p>
    </>
  )
}

export default function Funnel({ counts, live, paper }: { counts: FunnelCounts | null; live: number; paper: number }) {
  if (!counts || counts.n_swept <= 0) return null
  const [wSwept, wJudged, wGo] = funnelWidths([counts.n_swept, counts.n_judged, counts.n_go])
  const judgedShare = floorSharePct(counts.n_judged, counts.n_swept)
  const noGoShare = floorSharePct(counts.n_no_go, counts.n_judged)
  const marginalShare = floorSharePct(counts.n_marginal, counts.n_judged)
  const ratio = heroRatio(counts.n_go, counts.n_judged)
  const pct = (part: number) => `${Math.max(0.5, (100 * part) / Math.max(1, counts.n_judged)).toFixed(1)}%`

  return (
    <section aria-labelledby="home-funnel-title" className="mb-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-3">
        <h2 id="home-funnel-title" className="text-xl font-semibold">Ce que mon moteur a essayé</h2>
        <span className="text-xs text-muted">jugements publiés au fil de l’eau, EMA cross en exemple</span>
      </div>
      {/* The funnel proper counts configurations only; the fleet line below it is
          outside the funnel on purpose (D059). */}
      <div data-testid="home-funnel" className="bg-card border border-border border-b-0 rounded-t-lg p-5 sm:p-6 space-y-4">
        <Step label="Configurations balayées" value={counts.n_swept}>
          <Bar width={wSwept} note="tout ce que le moteur a énuméré" />
        </Step>
        <Step label="Jugées au gantelet" value={counts.n_judged} sub={judgedShare !== null ? `${judgedShare} % des balayées` : undefined}>
          <Bar width={wJudged} note="le gantelet complet coûte du calcul, alors il ne passe qu’une partie du corpus ; le reste est non jugé, pas recalé" />
        </Step>
        <Step label="Leurs verdicts">
          <div data-testid="funnel-verdicts">
            <div className="flex h-7 gap-0.5 rounded overflow-hidden">
              <span className="block bg-muted/60" style={{ width: pct(counts.n_no_go) }} />
              <span className="block bg-warning/70" style={{ width: pct(counts.n_marginal) }} />
              <span className="block bg-foreground" style={{ width: pct(counts.n_go), minWidth: '4px' }} />
            </div>
            <p className="text-xs text-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
              <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-muted/60 mr-1.5 align-[-1px]" />{n(counts.n_no_go)} recalées{noGoShare !== null && ` · ${noGoShare} %`}</span>
              <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-warning/70 mr-1.5 align-[-1px]" />{n(counts.n_marginal)} en sursis{marginalShare !== null && ` · ${marginalShare} %`}</span>
              <span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-foreground mr-1.5 align-[-1px]" />{n(counts.n_go)} candidates{ratio !== null && ` · 1 sur ${n(ratio)} jugées`}</span>
            </p>
          </div>
        </Step>
        <Step label="Candidates" value={counts.n_go} sub={ratio !== null ? `1 sur ${n(ratio)} jugées` : undefined}>
          <Bar width={wGo} note="admises à la surveillance en simulation. Pas validées, pas branchées. Une candidate n’est pas une gagnante : elle a gagné le droit d’être surveillée." />
        </Step>
      </div>
      <div className="bg-card border border-border rounded-b-lg px-5 sm:px-6 py-4">
        <p data-testid="home-fleet-line" className="text-xs text-muted leading-relaxed">
          Hors de cet entonnoir, la flotte : <strong className="text-foreground font-mono">{live + paper}</strong> bots en service, dont ceux déployés à la main avant le moteur, et <strong className="text-foreground font-mono">{live}</strong> avec mon argent. Les plateformes qui vendent des stratégies publient leurs gagnantes, jamais le nombre de tentatives.{' '}
          <a href={labUrl('https://lab.algoproof.fr/cockpit/cimetiere', 'funnel')} target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>Voir le cimetière</a>
          {' · '}
          <Link href="/strategies#comment-je-decide" className={linkClass('inline')}>Comment je décide</Link>
        </p>
      </div>
    </section>
  )
}
