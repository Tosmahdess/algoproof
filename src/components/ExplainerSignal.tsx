'use client'

// bg/border are rgba mirrors of the warning/severe/negative tokens: a CSS
// variable can't carry a hex alpha suffix (`var(--warning)18` isn't valid
// CSS), so the tinted card background keeps the token's RGB spelled out.
const LEVELS = [
  {
    key: 'minor',
    label: 'MINEUR',
    color: 'var(--warning)',
    bg: 'rgba(245,158,11,0.09)',
    border: 'rgba(245,158,11,0.27)',
    condition: 'Recul ≥ seuil × 1.0',
    formula: 'Ex. NVIDIA : −25% atteint',
    action: '1ère tranche : position initiale',
  },
  {
    key: 'major',
    label: 'MAJEUR',
    color: 'var(--severe)',
    bg: 'rgba(255,107,53,0.09)',
    border: 'rgba(255,107,53,0.27)',
    condition: 'Recul ≥ seuil × 1.5',
    formula: 'Ex. NVIDIA : −37.5% atteint',
    action: '2e tranche : renforcement',
  },
  {
    key: 'crash',
    label: 'KRACH',
    color: 'var(--negative)',
    bg: 'rgba(248,113,113,0.09)',
    border: 'rgba(248,113,113,0.27)',
    condition: 'Recul ≥ seuil × 2.0',
    formula: 'Ex. NVIDIA : −50% atteint',
    action: 'Déploiement maximum',
  },
]

export function ExplainerSignal() {
  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-4">
      <p className="text-sm font-medium text-foreground mb-3">📖 Comment les signaux sont calculés</p>

      <p className="text-xs text-muted mb-4 leading-relaxed">
        Chaque actif a un <strong className="text-foreground">seuil de déclenchement</strong> calibré
        individuellement. Le signal se déclenche quand le prix recule de ce seuil par rapport au{' '}
        <strong className="text-foreground">plus haut des 180 derniers jours</strong> (6 mois),
        confirmé par au moins un indicateur technique (MA50 ou RSI-14).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {LEVELS.map(level => (
          <div
            key={level.key}
            className="rounded-lg p-3"
            style={{ background: level.bg, border: `1px solid ${level.border}` }}
          >
            <div className="text-xs font-bold mb-1" style={{ color: level.color }}>
              {level.label}
            </div>
            <div className="text-xs text-muted mb-1">{level.condition}</div>
            <div className="text-xs text-muted mb-2 font-mono">{level.formula}</div>
            <div className="text-xs font-medium" style={{ color: level.color }}>
              → {level.action}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted space-y-1.5 leading-relaxed">
        <p>
          🕐 <strong className="text-muted">Surveillance toutes les 4h</strong> ·
          Fenêtre 180 jours · Cooldown 14 jours après alerte
        </p>
        <p>
          📊 <strong className="text-muted">Régime MI ajuste le sizing</strong> :
          Bull (MI &gt; −15) → 150 à 600€ · Uncertain → 100 à 400€ · Bear (&lt; −50) → 50 à 300€
        </p>
        <p>
          🔼 <strong className="text-muted">Upgrade ATH</strong> : les compounders long terme
          bénéficient d&apos;un upgrade de niveau si leur recul depuis l&apos;ATH 2 ans est aussi
          significatif, garde-fou anti falling-knife intégré.
        </p>
      </div>
    </div>
  )
}
