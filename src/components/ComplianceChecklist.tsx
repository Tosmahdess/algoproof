'use client'
import { useState } from 'react'

const ITEMS = [
  "J'utilise un exchange agréé MiCA / CASP",
  "J'ai déclaré mes comptes d'actifs numériques à l'étranger (formulaire 3916-bis)",
  "Je déclare mes plus-values de l'année",
  "Je garde l'historique complet de mes transactions",
]

export default function ComplianceChecklist() {
  const [checked, setChecked] = useState<boolean[]>(ITEMS.map(() => false))
  const toggle = (i: number) =>
    setChecked(c => c.map((v, j) => (j === i ? !v : v)))
  return (
    <ul className="space-y-2">
      {ITEMS.map((label, i) => (
        <li key={i}>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm cursor-pointer hover:border-muted">
            <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)}
              className="mt-0.5 accent-positive" />
            <span className={checked[i] ? 'text-muted line-through' : 'text-text'}>{label}</span>
          </label>
        </li>
      ))}
    </ul>
  )
}
