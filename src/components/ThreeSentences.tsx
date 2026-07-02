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
    <section className="bg-card border border-border rounded-xl p-6 mb-8">
      <h2 className="font-semibold mb-3">Ce bot en 3 phrases</h2>
      <dl className="space-y-2.5">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="text-xs text-accent font-medium sm:w-36 shrink-0 sm:pt-0.5">{label}</dt>
            <dd className="text-sm text-muted">{data[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
