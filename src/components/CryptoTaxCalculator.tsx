'use client'
import { linkClass } from '@/lib/link-roles'
import { useId, useState } from 'react'
import { compare, parseAmount, TMI_BRACKETS, type ParsedAmount } from '@/lib/crypto-tax'

const TMI_LABELS: Record<string, string> = {
  '0': 'Non imposable (0 %)', '0.11': '11 %', '0.3': '30 %', '0.41': '41 %', '0.45': '45 %',
}
const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// The message shown next to a field the calculator cannot read. Nothing is computed
// until both fields read as positive amounts (audit 2026-10, n° 1 and 18).
function errorOf(p: ParsedAmount): string | null {
  if (p.ok || p.reason === 'empty') return null
  return p.reason === 'negative'
    ? 'Indique un montant positif.'
    : 'Indique un montant en euros, par exemple 15 000 ou 1 500,50.'
}

const INPUT_CLASS = 'mt-1 w-full rounded-lg border bg-bg px-3 py-2 text-sm text-foreground focus:border-accent'

export default function CryptoTaxCalculator() {
  const [invested, setInvested] = useState('')
  const [sold, setSold] = useState('')
  const [tmi, setTmi] = useState(0.3)
  const ids = useId()
  const investedErrorId = `${ids}-invested-error`
  const soldErrorId = `${ids}-sold-error`
  const pInvested = parseAmount(invested)
  const pSold = parseAmount(sold)
  const investedError = errorOf(pInvested)
  const soldError = errorOf(pSold)
  const values = pInvested.ok && pSold.ok ? { invested: pInvested.value, sold: pSold.value } : null
  const r = values ? compare(values.invested, values.sold, tmi) : null
  const isLoss = values !== null && values.sold < values.invested

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="text-sm">
          <label className="block">
            <span className="text-muted">Total investi</span>
            <input aria-label="Total investi (€)" inputMode="decimal" value={invested}
              onChange={e => setInvested(e.target.value)} placeholder="1 000"
              aria-invalid={investedError ? true : undefined}
              aria-describedby={investedError ? investedErrorId : undefined}
              className={`${INPUT_CLASS} ${investedError ? 'border-negative' : 'border-border-strong'}`} />
          </label>
          {investedError && <p id={investedErrorId} className="mt-1 text-xs text-negative">{investedError}</p>}
        </div>
        <div className="text-sm">
          <label className="block">
            <span className="text-muted">Valeur de revente</span>
            <input aria-label="Valeur de revente (€)" inputMode="decimal" value={sold}
              onChange={e => setSold(e.target.value)} placeholder="1 500"
              aria-invalid={soldError ? true : undefined}
              aria-describedby={soldError ? soldErrorId : undefined}
              className={`${INPUT_CLASS} ${soldError ? 'border-negative' : 'border-border-strong'}`} />
          </label>
          {soldError && <p id={soldErrorId} className="mt-1 text-xs text-negative">{soldError}</p>}
        </div>
        <label className="block text-sm">
          <span className="text-muted">Ta tranche (TMI)</span>
          <select aria-label="Tranche marginale d'imposition (TMI)" value={tmi}
            onChange={e => setTmi(parseFloat(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm text-foreground focus:border-accent">
            {TMI_BRACKETS.map(b => (
              <option key={b} value={b}>{TMI_LABELS[String(b)]}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Always mounted, so a screen reader announces the result when it appears;
          no gap of its own while empty. */}
      <div role="status" className="empty:!mt-0">
      {r && (
        <div className="space-y-2 border-t border-border pt-4 text-sm">
          {isLoss ? (
            <p className="text-muted">Tu es en moins-value : pas d&apos;impôt sur cette opération (les moins-values s&apos;imputent sur tes autres plus-values de l&apos;année).</p>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-muted">Plus-value</span><span data-testid="gain" className="tabular-nums text-foreground">{eur(r.gain)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Flat tax (31,4 %)</span><span className={`tabular-nums ${r.best === 'flat' ? 'text-positive' : 'text-muted'}`}>{eur(r.flat)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Au barème (TMI + 18,6 %)</span><span className={`tabular-nums ${r.best === 'bareme' ? 'text-positive' : 'text-muted'}`}>{eur(r.bareme)}</span></div>
              {r.exempt && <p className="text-foreground">Total des cessions ≤ 305 € → <strong>exonéré</strong> cette année.</p>}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-semibold text-foreground">Impôt estimé</span>
                <span data-testid="tax-due" className="tabular-nums font-bold text-foreground">{eur(r.taxDue)}</span>
              </div>
              <p data-testid="best" className="text-xs text-muted">Option la moins chère : {r.best === 'flat' ? 'la flat tax' : r.best === 'bareme' ? 'le barème progressif' : 'identique'}.</p>
            </>
          )}
        </div>
      )}
      </div>

      <p className="text-xs text-muted leading-relaxed border-t border-border pt-3">
        Estimation indicative, <strong className="text-foreground">pas un conseil fiscal</strong>. La méthode réelle (art. 150 VH bis)
        calcule par cession sur la valeur globale du portefeuille. Vérifie sur{' '}
        <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>impots.gouv.fr</a>.
      </p>
    </div>
  )
}
