// The home's one band under the two entries: the fleet line, then the engine's
// read, in the same order and under the same words as the four KPI cards at the
// top of lab.algoproof.fr/cockpit (owner, 2026-09-24).
//
// It replaces two blocks that sat there before — the bot strip (shrink-wrapped
// to its text) and FunnelCounter (max-w-xl) — which, stacked under two
// full-width cards, gave the desktop page four different widths in a row. One
// block, the container's width, nothing else to line up.
//
// Rules carried over, each one pinned by tests/app/home-two-entries.test.tsx:
//   - bots are counted ONCE on this page, as a total with its two parts;
//   - the candidate count NEVER renders without its denominator (cockpit spec
//     §9.3): « 3 368 » alone reads as « 3 368 winners »;
//   - two text colours only, no hue on the figures: green is for gains, and
//     none of these numbers is one;
//   - no link to the cimetière here (owner's call).
//
// FunnelCounter itself is left alone: /overview and its tests still use it.
import type { FunnelCounts } from '@/lib/funnel'
import { heroRatio } from '@/lib/hero-ratio'
import { shareOfJudged } from '@/lib/cockpit-share'

const nf = new Intl.NumberFormat('fr-FR')

// Verbatim from algolab web/lib/wave-generation.ts. It travels with the
// candidates note below: « pas branchées » speaks of the CORRECTED engine, and
// without this sentence it reads as a contradiction of the 75 bots running in
// simulation that this very band counts.
const WAVE_GENERATION_NOTE =
  "Les bots qui tournent en simulation depuis le 21 août ont été choisis par la version d'août du moteur, avant sa correction."

function Cell({
  label, value, sub, note, className = '',
}: { label: string; value: number; sub?: string | null; note?: string; className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-mono tabular-nums">{nf.format(value)}</dd>
      {sub && <dd className="text-xs text-muted mt-0.5">{sub}</dd>}
      {note && <dd className="text-xs text-muted leading-relaxed mt-2">{note}</dd>}
    </div>
  )
}

export default function EngineBand({
  live, paper, counts,
}: { live: number; paper: number; counts: FunnelCounts | null }) {
  const ratio = counts ? heroRatio(counts.n_go, counts.n_judged) : null

  return (
    <section data-testid="engine-band" className="bg-card border border-border rounded-lg p-6 text-left">
      <p data-testid="fleet-counters" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span><strong className="text-foreground font-mono">{live + paper}</strong> bots en service</span>
        <span className="text-border">·</span>
        <span><strong className="text-foreground font-mono">{live}</strong> en argent réel</span>
        <span className="text-border">·</span>
        {/* « simulation », pas « laboratoire » : c'est le mot de StatusBadge,
            et « le labo » reste le nom de l'outil. */}
        <span><strong className="text-foreground font-mono">{paper}</strong> en simulation</span>
        <span className="text-border">·</span>
        <span>données mises à jour chaque heure</span>
      </p>

      {/* Rendering nothing beats rendering a zero denominator. */}
      {counts && counts.n_swept > 0 && (
        <>
          <dl
            data-testid="funnel-counter"
            className="mt-5 pt-5 border-t border-border grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-5"
          >
            <Cell
              className="col-span-2 lg:col-span-1"
              label="Configurations balayées"
              value={counts.n_swept}
              note="Tout ce que le moteur a énuméré."
            />
            <Cell
              label="Jugées au gantelet"
              value={counts.n_judged}
              note="Passées devant le jury du moteur."
            />
            <Cell
              label="Recalées"
              value={counts.n_no_go}
              sub={shareOfJudged(counts.n_no_go, counts.n_judged)}
              note="Sur-optimisation, manque de robustesse, coûts qui mangent le gain."
            />
            <Cell
              label="En sursis"
              value={counts.n_marginal}
              sub={shareOfJudged(counts.n_marginal, counts.n_judged)}
              note="Elles tiennent, pas assez franchement pour passer."
            />
            {ratio !== null && (
              <Cell
                label="Candidates"
                value={counts.n_go}
                sub={`1 sur ${nf.format(ratio)} jugées`}
                note="Admises à la surveillance en simulation. Pas validées, pas branchées."
              />
            )}
          </dl>
          {/* The swept -> judged drop is the only step a visitor cannot infer.
              Said as what it is: the gauntlet costs compute, so it runs on part
              of the corpus. NOT "the best ones" -- the cap is a budget. */}
          <p className="mt-5 text-xs text-muted leading-relaxed">
            Tout ce qui est balayé n&apos;est pas jugé : le gantelet complet coûte du calcul,
            alors il ne passe qu&apos;une partie du corpus. Les plateformes qui vendent des
            stratégies publient leurs gagnantes, jamais le nombre de tentatives.{' '}
            {WAVE_GENERATION_NOTE}
          </p>
        </>
      )}
    </section>
  )
}
