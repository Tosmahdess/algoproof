'use client'
import { useState } from 'react'
import { compare, TMI_BRACKETS } from '@/lib/crypto-tax'

const TMI_LABELS: Record<string, string> = {
  '0': 'Non imposable (0 %)', '0.11': '11 %', '0.3': '30 %', '0.41': '41 %', '0.45': '45 %',
}
const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : 0 }

export default function CryptoTaxCalculator() {
  const [invested, setInvested] = useState('')
  const [sold, setSold] = useState('')
  const [tmi, setTmi] = useState(0.3)
  const r = compare(num(invested), num(sold), tmi)
  const hasInput = invested !== '' && sold !== ''
  const isLoss = hasInput && num(sold) < num(invested)

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-muted">Total investi</span>
          <input aria-label="Total investi (€)" inputMode="decimal" value={invested}
            onChange={e => setInvested(e.target.value)} placeholder="1000"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Valeur de revente</span>
          <input aria-label="Valeur de revente (€)" inputMode="decimal" value={sold}
            onChange={e => setSold(e.target.value)} placeholder="1500"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Ta tranche (TMI)</span>
          <select aria-label="Tranche marginale d'imposition (TMI)" value={tmi}
            onChange={e => setTmi(parseFloat(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none">
            {TMI_BRACKETS.map(b => (
              <option key={b} value={b}>{TMI_LABELS[String(b)]}</option>
            ))}
          </select>
        </label>
      </div>

      {hasInput && (
        <div className="space-y-2 border-t border-border pt-4 text-sm">
          {isLoss ? (
            <p className="text-muted">Tu es en moins-value : pas d&apos;impôt sur cette opération (les moins-values s&apos;imputent sur tes autres plus-values de l&apos;année).</p>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-muted">Plus-value</span><span data-testid="gain" className="font-mono text-text">{eur(r.gain)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Flat tax (31,4 %)</span><span className={`font-mono ${r.best === 'flat' ? 'text-positive' : 'text-muted'}`}>{eur(r.flat)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Au barème (TMI + 18,6 %)</span><span className={`font-mono ${r.best === 'bareme' ? 'text-positive' : 'text-muted'}`}>{eur(r.bareme)}</span></div>
              {r.exempt && <p className="text-positive">Total des cessions ≤ 305 € → <strong>exonéré</strong> cette année.</p>}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-text">Impôt estimé</span>
                <span data-testid="tax-due" className="font-mono font-bold text-text">{eur(r.taxDue)}</span>
              </div>
              <p data-testid="best" className="text-xs text-muted">Option la moins chère : {r.best === 'flat' ? 'la flat tax' : r.best === 'bareme' ? 'le barème progressif' : 'identique'}.</p>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-muted leading-relaxed border-t border-border pt-3">
        Estimation indicative, <strong className="text-text">pas un conseil fiscal</strong>. La méthode réelle (art. 150 VH bis)
        calcule par cession sur la valeur globale du portefeuille. Vérifie sur{' '}
        <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-accent">impots.gouv.fr</a>.
      </p>
    </div>
  )
}
