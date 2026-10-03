// The picture of an idea: HOW it enters, never a result (D079: the user chose a
// sketch of the principle over a "representative" curve, which would be a post-hoc
// pick among variants). One drawing per site family; the caption says it is a
// sketch. Colours come from declared tokens through currentColor.
//
// Refonte « registre » (2026-10-03): it left the index, where every card of one
// family repeated it (audit n° 41), for the top of the idea page. The drawing holds
// no text any more: « entrée » was SVG text at 10 units, scaled under the 13 px floor
// on a phone (n° 76). The caption says it in HTML, beside a drawn dot.

const W = 300
const H = 64

function Dot({ x, y }: { x: number; y: number }) {
  return (
    <g className="text-accent">
      <circle cx={x} cy={y} r="4" fill="currentColor" />
    </g>
  )
}

const Line = ({ d, dash, width = 1.5 }: { d: string; dash?: string; width?: number }) => (
  <path d={d} fill="none" stroke="currentColor" strokeWidth={width} strokeDasharray={dash}
    vectorEffect="non-scaling-stroke" />
)

function sketch(family: string) {
  switch (family) {
    case 'breakout':
      return (<>
        <g className="text-muted"><Line d="M0 20 H200" dash="4 3" width={1} /><Line d="M0 50 H200" dash="4 3" width={1} /></g>
        <g className="text-foreground"><Line d="M0 36 L20 28 L40 44 L60 30 L80 46 L100 26 L120 42 L140 32 L160 44 L180 28 L200 24 L220 12 L250 8 L300 4" /></g>
        <Dot x={208} y={18} />
      </>)
    case 'mean-reversion':
      return (<>
        <g className="text-muted"><Line d="M0 32 H300" dash="4 3" width={1} /><Line d="M0 54 H300" dash="2 3" width={1} /></g>
        <g className="text-foreground"><Line d="M0 30 L30 22 L60 38 L90 26 L120 44 L140 56 L160 46 L190 34 L220 30 L250 36 L300 32" /></g>
        <Dot x={140} y={56} />
      </>)
    case 'momentum':
      return (<>
        <g className="text-muted"><Line d="M0 44 H300" width={1} /></g>
        <g className="text-muted">
          {[8, 6, 10, 14, 12, 18].map((h, i) => <rect key={i} x={20 + i * 34} y={44 - h} width="18" height={h} fill="currentColor" opacity="0.5" />)}
        </g>
        <g className="text-accent">
          {[24, 30].map((h, i) => <rect key={i} x={224 + i * 34} y={44 - h} width="18" height={h} fill="currentColor" opacity="0.7" />)}
        </g>
        <Dot x={252} y={12} />
      </>)
    case 'price-action':
      return (<>
        <g className="text-muted"><Line d="M0 24 H300" dash="3 3" width={1} /></g>
        <g className="text-foreground">
          {[40, 74, 108, 142, 176].map((x, i) => <rect key={x} x={x} y={i % 2 ? 30 : 34} width="14" height={i % 2 ? 14 : 10} fill="none" stroke="currentColor" strokeWidth="1.2" />)}
          <rect x={210} y={22} width="14" height="26" fill="currentColor" opacity="0.6" />
          <Line d="M217 14 V22 M217 48 V56" width={1.2} />
        </g>
        <Dot x={238} y={22} />
      </>)
    case 'trend':
    default:
      return (<>
        <g className="text-foreground"><Line d="M0 54 L40 52 L70 56 L100 48 L140 50 L170 40 L210 38 L240 28 L270 26 L300 16" /></g>
        <g className="text-muted"><Line d="M0 60 L60 60 L60 58 L120 58 L120 54 L180 54 L180 46 L240 46 L240 36 L300 36" dash="5 3" /></g>
        <Dot x={100} y={48} />
      </>)
  }
}

export default function PrincipleSketch({ family }: { family: string }) {
  return (
    <figure className="rounded-lg border border-border p-4">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="block h-auto w-full">
        {sketch(family)}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 12 12" className="h-2.5 w-2.5 shrink-0 text-accent"><circle cx="6" cy="6" r="4" fill="currentColor" /></svg>
          l’entrée en position
        </span>
        <span>Schéma du principe, pas un résultat.</span>
      </figcaption>
    </figure>
  )
}
