const ROWS: { label: string; algoproof: boolean; botshop: boolean }[] = [
  { label: 'Track record live vérifiable',                  algoproof: true,  botshop: false },
  { label: 'Chaque trade perdant montré',                   algoproof: true,  botshop: false },
  { label: 'Paper trading avant le live',                   algoproof: true,  botshop: false },
  { label: 'Résultats publics (pas de faux screenshots)',   algoproof: true,  botshop: false },
  { label: 'Sans paywall',                                  algoproof: true,  botshop: false },
  { label: 'Français natif',                                algoproof: true,  botshop: false },
  { label: 'Rejette publiquement ses backtests ratés',      algoproof: true,  botshop: false },
]

function Cell({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-positive font-bold" aria-label="oui">✓</span>
    : <span className="text-negative font-bold" aria-label="non">✗</span>
}

export default function ProofComparison() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/50 text-left">
            <th className="px-4 py-3 font-medium text-muted"></th>
            <th className="px-4 py-3 text-center font-semibold text-positive">AlgoProof</th>
            <th className="px-4 py-3 text-center font-medium text-muted">Bot-shop / signal-shop typique</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROWS.map(r => (
            <tr key={r.label} className="hover:bg-card/30">
              <td className="px-4 py-3 text-text">{r.label}</td>
              <td className="px-4 py-3 text-center"><Cell ok={r.algoproof} /></td>
              <td className="px-4 py-3 text-center"><Cell ok={r.botshop} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
