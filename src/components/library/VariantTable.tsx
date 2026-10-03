'use client'
// The variants of one idea (lot 2, D079), a register in the fleet's grammar since the
// refonte « registre » (2026-10-03). What varies is shown by NAME (filters); the
// values are the lab's. The order is said above the register by the page (state,
// then number), never by a result.
//
// Audit 2026-10:
//  - n° 42: the « n° k » was printed alone, unexplained. It is the end of the
//    variant's name, so the page says what it is, and a variant without one shows
//    its name.
//  - n° 77: « Réglages dans le labo » 51 times, a link out of the site with no sign of
//    it. Each link now names its variant (« Réglages n° 12 »), carries ↗ and opens a
//    new tab; the page says once, above, that the settings are the lab's.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { RegimeMark } from '@/components/icons'
import { linkClass } from '@/lib/link-roles'
import type { BotStatus } from '@/lib/types'

export interface VariantRow {
  slug: string
  /** The « n° k » of the name, null for a name without one. */
  number: number | null
  name: string
  status: 'live' | 'paper' | 'archived' | 'backtest'
  state: string
  waitLabel: string
  filters: string[]
  mtfCaveat: boolean
  nAssets: number
  pfBacktest: string | null
  tradesBacktest: number | null
  simTrades: number
  simSign: 'up' | 'down' | 'young' | null
  href: string | null
  external: boolean
}

export const VARIANT_PAGE = 50

const fr = (n: number) => n.toLocaleString('fr-FR')
const BUTTON = 'inline-flex min-h-11 items-center rounded border border-border-strong px-4 text-sm font-semibold text-foreground transition-colors hover:bg-card-2'

// Real money is labelled as such and never mixed with the simulation (rule R1). Counted
// on closed trades since the launch: the bot fiche adds the backtest replay, so its
// figures can differ, and the page says which is which.
function Sim({ v }: { v: VariantRow }) {
  if (v.simSign === null) {
    return <><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Pas lancée</span></>
  }
  const what = v.status === 'live' ? 'Argent réel' : v.status === 'archived' ? 'Avant l’arrêt' : 'Simulation'
  const verdict = v.simSign === 'young' ? 'trop jeune pour conclure'
    : v.simSign === 'up' ? 'au-dessus de zéro' : 'à zéro ou en dessous'
  return (
    <>
      <span className="block tabular-nums">{`${fr(v.simTrades)} ${v.simTrades > 1 ? 'trades' : 'trade'}`}</span>
      <span className={`mt-0.5 block text-xs ${v.simSign === 'down' ? 'text-negative' : 'text-muted'}`}>{`${what}, ${verdict}`}</span>
    </>
  )
}

function Open({ v }: { v: VariantRow }) {
  if (!v.href) return null
  const who = v.number != null ? `n° ${v.number}` : v.name
  const cls = linkClass('inline', 'inline-flex min-h-11 items-center whitespace-nowrap text-sm')
  return v.external ? (
    <a href={v.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {`Réglages ${who} `}<span aria-hidden="true">↗</span><span className="sr-only">{' dans le labo, nouvel onglet'}</span>
    </a>
  ) : (
    <Link href={v.href} className={cls}>{`Fiche ${who}`}</Link>
  )
}

function Row({ v }: { v: VariantRow }) {
  const meta = [
    v.filters.length ? `Filtres : ${v.filters.join(', ')}` : 'Sans filtre',
    `${v.nAssets} ${v.nAssets > 1 ? 'marchés' : 'marché'}`,
  ].join(' · ')
  return (
    <tr data-testid="variant-row"
      className="border-b border-border max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-3 max-md:py-4">
      <td className="align-top max-md:col-span-2 max-md:block md:py-4 md:pr-6">
        <p className="font-semibold">{v.number != null ? `n° ${v.number}` : v.name}</p>
        <p className="mt-1 max-w-[60ch] text-xs text-muted">{meta}</p>
        {v.mtfCaveat && (
          <p className="mt-0.5 max-w-[60ch] text-xs text-muted">
            Filtre sur les unités de temps supérieures : léger écart possible entre le backtest et le marché réel.
          </p>
        )}
      </td>
      <td className="align-top max-md:col-span-2 max-md:block md:py-4 md:pr-6">
        <p className={`inline-flex items-center gap-1.5 text-sm font-semibold ${v.status === 'backtest' || v.status === 'archived' ? 'text-muted' : ''}`}>
          <RegimeMark status={v.status as BotStatus} />
          {v.state}
        </p>
        {v.waitLabel && <p className="mt-0.5 text-xs text-muted">{v.waitLabel}</p>}
      </td>
      <td className="align-top max-md:block md:py-4 md:pl-4 md:text-right">
        <span className="block text-xs text-muted md:sr-only">Backtest de sélection</span>
        {v.pfBacktest != null ? (
          <>
            <span className="block tabular-nums">{`PF ${v.pfBacktest}`}</span>
            {v.tradesBacktest != null && <span className="mt-0.5 block text-xs tabular-nums text-muted">{`${fr(v.tradesBacktest)} trades`}</span>}
          </>
        ) : (
          <><span aria-hidden="true" className="text-muted">—</span><span className="sr-only">Pas de chiffre publié</span></>
        )}
      </td>
      <td data-testid="variant-sim" className="align-top max-md:block md:py-4 md:pl-4 md:text-right">
        <span className="block text-xs text-muted md:sr-only">Depuis le lancement</span>
        <Sim v={v} />
      </td>
      <td className="align-top max-md:col-span-2 max-md:-mt-2 max-md:block md:py-4 md:pl-6 md:text-right">
        <span className="inline-block md:-my-2.5"><Open v={v} /></span>
      </td>
    </tr>
  )
}

export default function VariantTable({ rows, caption = 'Les variantes de cette idée' }: { rows: VariantRow[]; caption?: string }) {
  const [shown, setShown] = useState(VARIANT_PAGE)
  const listRef = useRef<HTMLTableSectionElement>(null)
  const focusRow = useRef<number | null>(null)
  const visible = rows.slice(0, shown)
  const remaining = rows.length - visible.length
  const next = Math.min(VARIANT_PAGE, remaining)

  useEffect(() => {
    if (focusRow.current === null) return
    const row = listRef.current?.querySelectorAll('[data-testid="variant-row"]')[focusRow.current]
    focusRow.current = null
    row?.querySelector<HTMLAnchorElement>('a')?.focus()
  }, [shown])

  return (
    <div>
      <table data-testid="variant-register" className="w-full border-collapse text-left max-md:block">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-md:sr-only">
          <tr className="border-b border-border text-xs text-muted">
            <th scope="col" className="pb-2.5 pr-6 font-normal">Variante et filtres</th>
            <th scope="col" className="pb-2.5 pr-6 font-normal">État</th>
            <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal">Backtest de sélection</th>
            <th scope="col" className="whitespace-nowrap pb-2.5 pl-4 text-right font-normal">Depuis le lancement</th>
            <th scope="col" className="pb-2.5 pl-6 text-right font-normal"><span className="sr-only">Lien</span></th>
          </tr>
        </thead>
        <tbody ref={listRef} className="max-md:block">
          {visible.map(v => <Row key={v.slug} v={v} />)}
        </tbody>
      </table>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <p className="text-xs tabular-nums text-muted" aria-live="polite">
          {remaining > 0
            ? `${fr(visible.length)} variantes affichées sur ${fr(rows.length)}.`
            : `${fr(rows.length)} ${rows.length > 1 ? 'variantes affichées' : 'variante affichée'}, toute la liste.`}
        </p>
        {remaining > 0 && (
          <button type="button" onClick={() => { focusRow.current = visible.length; setShown(s => s + VARIANT_PAGE) }} className={BUTTON}>
            {next > 1 ? `Voir les ${fr(next)} suivantes` : 'Voir la dernière'}
          </button>
        )}
      </div>
    </div>
  )
}
