// "Ce bot en 3 phrases" — plain-FR summary for the novice layer: when it buys,
// when it sells, what it can lose. Sits right under the fiche header.
import type { ThreeSentences as ThreeSentencesData } from '@/lib/bot-expectations'

const ROWS: { key: keyof ThreeSentencesData; label: string }[] = [
  { key: 'entry', label: 'Quand il achète' },
  { key: 'exit', label: 'Quand il vend' },
  { key: 'risk', label: 'Ce qu’il peut perdre' },
]

export default function ThreeSentences({ data }: { data: ThreeSentencesData }) {
  return (
    // Refonte lot 3 (2026-10-02): a block inside « Comment je fais tourner ce bot », with
    // rules between its rows, no card of its own (nested cards are out).
    <div data-testid="three-sentences" className="mb-8">
      <h3 className="text-lg font-semibold mb-2">Ce bot en 3 phrases</h3>
      <dl className="border-t border-border">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:gap-4">
            <dt className="text-sm font-semibold text-muted sm:w-40 shrink-0">{label}</dt>
            <dd className="text-sm leading-relaxed max-w-[68ch]">{data[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
