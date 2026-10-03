'use client'
import { linkClass } from '@/lib/link-roles'
import { useId, useState } from 'react'
import {
  compare, EXEMPTION_CESSION_EUR, fmtRate, parseAmount, PFU_FLAT_RATE, SOCIAL_RATE, TMI_BRACKETS,
  type ParsedAmount,
} from '@/lib/crypto-tax'

// Every rate and threshold on screen is read from src/lib/crypto-tax.ts, the same
// constants the computation uses (brief: no number typed by hand).
const tmiLabel = (b: number) => (b === 0 ? `Non imposable (${fmtRate(0)})` : fmtRate(b))
const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// The message shown next to a field the calculator cannot read. Nothing is computed
// until both fields read as positive amounts (audit 2026-10, n° 1 and 18).
function errorOf(p: ParsedAmount): string | null {
  if (p.ok || p.reason === 'empty') return null
  return p.reason === 'negative'
    ? 'Indique un montant positif.'
    : 'Indique un montant en euros, par exemple 15 000 ou 1 500,50.'
}

const FIELD = 'mt-1.5 block min-h-11 w-full rounded-md border bg-bg px-3 text-sm text-foreground tabular-nums focus:border-accent'
const LABEL = 'block text-xs text-muted'
const LINE = 'flex items-baseline justify-between gap-4 border-t border-border py-2.5'

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
    <div className="rounded-lg border border-border bg-card p-4 sm:px-6 sm:py-5">
      <div className="grid gap-4 sm:grid-cols-3 sm:items-start">
        <div>
          <label className="block">
            <span className={LABEL}>Total investi (€)</span>
            <input inputMode="decimal" value={invested} autoComplete="off"
              onChange={e => setInvested(e.target.value)} placeholder="1 000"
              aria-invalid={investedError ? true : undefined}
              aria-describedby={investedError ? investedErrorId : undefined}
              className={`${FIELD} ${investedError ? 'border-negative' : 'border-border-strong'}`} />
          </label>
          {investedError && <p id={investedErrorId} className="mt-1.5 text-xs text-negative">{investedError}</p>}
        </div>
        <div>
          <label className="block">
            <span className={LABEL}>Valeur de revente (€)</span>
            <input inputMode="decimal" value={sold} autoComplete="off"
              onChange={e => setSold(e.target.value)} placeholder="1 500"
              aria-invalid={soldError ? true : undefined}
              aria-describedby={soldError ? soldErrorId : undefined}
              className={`${FIELD} ${soldError ? 'border-negative' : 'border-border-strong'}`} />
          </label>
          {soldError && <p id={soldErrorId} className="mt-1.5 text-xs text-negative">{soldError}</p>}
        </div>
        <label className="block">
          <span className={LABEL}>Ta tranche marginale (TMI)</span>
          <select value={tmi} onChange={e => setTmi(parseFloat(e.target.value))}
            className={`${FIELD} border-border-strong`}>
            {TMI_BRACKETS.map(b => (
              <option key={b} value={b}>{tmiLabel(b)}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Always mounted, so a screen reader announces the result when it appears
          (audit 2026-10, n° 18); empty, it takes no room. */}
      <div role="status" className="mt-5 empty:mt-0">
      {r && (
        <div className="text-sm">
          {isLoss ? (
            <p className="border-t border-border pt-3 text-muted">Tu es en moins-value : pas d&apos;impôt sur cette opération (les moins-values s&apos;imputent sur tes autres plus-values de l&apos;année).</p>
          ) : (
            <>
              <div className={LINE}><span className="text-muted">Plus-value</span><span data-testid="gain" className="tabular-nums text-foreground">{eur(r.gain)}</span></div>
              <div className={LINE}><span className="text-muted">Flat tax ({fmtRate(PFU_FLAT_RATE)})</span><span className={`tabular-nums ${r.best === 'flat' ? 'text-foreground' : 'text-muted'}`}>{eur(r.flat)}</span></div>
              <div className={LINE}><span className="text-muted">Au barème (TMI + {fmtRate(SOCIAL_RATE)})</span><span className={`tabular-nums ${r.best === 'bareme' ? 'text-foreground' : 'text-muted'}`}>{eur(r.bareme)}</span></div>
              {r.exempt && (
                <p className="border-t border-border py-2.5 text-foreground">
                  Total des cessions de l&apos;année inférieur ou égal à{' '}<span className="tabular-nums">{eur(EXEMPTION_CESSION_EUR)}</span>{' '}:{' '}<strong>exonéré</strong>.
                </p>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border-strong pt-3">
                <span className="font-semibold text-foreground">Impôt estimé</span>
                <span data-testid="tax-due" className="text-xl font-medium tabular-nums text-foreground">{eur(r.taxDue)}</span>
              </div>
              <p data-testid="best" className="mt-1 text-xs text-muted">Option la moins chère : {r.best === 'flat' ? 'la flat tax' : r.best === 'bareme' ? 'le barème progressif' : 'identique'}.</p>
            </>
          )}
        </div>
      )}
      </div>

      <p className="mt-5 border-t border-border pt-3 text-xs leading-relaxed text-muted">
        Estimation indicative, <strong className="font-semibold text-foreground">pas un conseil fiscal</strong>. La méthode réelle (art. 150 VH bis)
        calcule par cession sur la valeur globale du portefeuille. Vérifie sur{' '}
        <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>impots.gouv.fr</a>.
      </p>
    </div>
  )
}
