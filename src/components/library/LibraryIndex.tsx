'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import StickyFilterBar from '@/components/StickyFilterBar'
import SearchInput from '@/components/SearchInput'
import PrincipleSketch from '@/components/library/PrincipleSketch'
import { sortIdeas, simSplit, type IdeaSort, type LibraryIdea } from '@/lib/library'
import { linkClass } from '@/lib/link-roles'

// The library index (lot 2, D079): one card per idea, a sketch of the principle,
// how many variants it holds and in which state. No PF and no curve on a card: a
// "representative" figure would be a pick among variants, made after the fact.
// The grammar is Investir's (D076): search alone on its line, filters as lists
// behind one button on a phone, 20 cards at a time.

export interface IdeaCardData extends LibraryIdea {
  slug: string
  label: string
  familyLabel: string
}

const PAGE = 20
const CIBLE = 'min-h-10'
const LISTE = `w-full min-w-0 rounded-md border border-border bg-card px-2 ${CIBLE} text-base sm:text-sm
               text-foreground focus:outline-none focus:border-accent`
const TF_WORD: Record<string, string> = { D1: '1 jour', H4: '4 heures', H1: '1 heure', M30: '30 minutes' }

function Champ({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function SimBar({ idea }: { idea: IdeaCardData }) {
  const s = simSplit(idea)
  if (s.total === 0) {
    return <p className="text-xs text-muted">Aucune variante en simulation pour l&apos;instant.</p>
  }
  const w = (n: number) => `${(100 * n) / s.total}%`
  return (
    <div className="grid gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-card-2" role="img"
        aria-label={`${s.up} au-dessus de zéro, ${s.down} à zéro ou en dessous, ${s.young} trop jeunes`}>
        <span className="block h-full bg-positive/70" style={{ width: w(s.up) }} />
        <span className="block h-full bg-negative/70" style={{ width: w(s.down) }} />
        <span className="block h-full bg-border-strong" style={{ width: w(s.young) }} />
      </div>
      <p className="text-xs text-muted">
        Simulation depuis le lancement : <span className="text-foreground">{s.up}</span> au-dessus de zéro,{' '}
        <span className="text-foreground">{s.down}</span> à zéro ou en dessous,{' '}
        <span className="text-foreground">{s.young}</span> trop jeunes pour dire quoi que ce soit
      </p>
    </div>
  )
}

function Pill({ children, tone }: { children: ReactNode; tone?: 'run' | 'stop' }) {
  const t = tone === 'run' ? 'border-positive/40 text-positive'
    : tone === 'stop' ? 'border-negative/40 text-negative' : 'border-border-strong text-muted'
  return <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${t}`}>{children}</span>
}

export function IdeaCard({ idea }: { idea: IdeaCardData }) {
  return (
    <Link href={`/bibliotheque/${idea.slug}`} className={`${linkClass('card')} grid min-w-0 gap-3 bg-card p-4`}>
      <PrincipleSketch family={idea.family} />
      <h3 className="text-base font-semibold text-foreground">{idea.label} {idea.tf}</h3>
      <p className="text-xs text-muted">{idea.familyLabel} · {TF_WORD[idea.tf] ?? idea.tf} · Binance Futures</p>
      <div className="flex flex-wrap gap-1.5">
        <Pill>{plural(idea.n_variants, 'variante', 'variantes')}</Pill>
        {idea.n_live > 0 && <Pill tone="run">{idea.n_live} en argent réel</Pill>}
        {idea.n_paper > 0 && <Pill tone="run">{idea.n_paper} en simulation</Pill>}
        {idea.n_backtest > 0 && <Pill>{idea.n_backtest} backtest seul</Pill>}
        {idea.n_stopped > 0 && <Pill tone="stop">{plural(idea.n_stopped, 'arrêtée', 'arrêtées')}</Pill>}
      </div>
      <SimBar idea={idea} />
    </Link>
  )
}

export default function LibraryIndex({ ideas }: { ideas: IdeaCardData[] }) {
  const [q, setQ] = useState('')
  const [tf, setTf] = useState('')
  const [family, setFamily] = useState('')
  const [state, setState] = useState('')
  const [sort, setSort] = useState<IdeaSort>('recent')
  const [shown, setShown] = useState(PAGE)

  const tfs = useMemo(() => [...new Set(ideas.map(i => i.tf))].sort(), [ideas])
  const families = useMemo(() => [...new Map(ideas.map(i => [i.family, i.familyLabel])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])), [ideas])

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    const kept = ideas.filter(i =>
      (!tf || i.tf === tf) && (!family || i.family === family) &&
      (!state || (state === 'running' ? i.n_running > 0 : i.n_backtest === i.n_variants)) &&
      words.every(w => norm(`${i.label} ${i.base} ${i.tf} ${i.familyLabel}`).includes(w)))
    return sortIdeas(kept, sort) as IdeaCardData[]
  }, [ideas, q, tf, family, state, sort])

  const active = [tf, family, state].filter(Boolean).length
  const reset = () => { setTf(''); setFamily(''); setState(''); setShown(PAGE) }
  const set = (f: (v: string) => void) => (e: { target: { value: string } }) => { f(e.target.value); setShown(PAGE) }
  const variants = list.reduce((n, i) => n + i.n_variants, 0)

  return (
    <div>
      <SearchInput value={q} onChange={v => { setQ(v); setShown(PAGE) }}
        placeholder="Rechercher : Donchian, RSI, H4, cassure…" resultCount={list.length} totalCount={ideas.length} />
      <StickyFilterBar activeCount={active} onReset={reset}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Champ label="Unité de temps">
            <select className={LISTE} value={tf} onChange={set(setTf)}>
              <option value="">Toutes</option>
              {tfs.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Champ>
          <Champ label="Type d'idée">
            <select className={LISTE} value={family} onChange={set(setFamily)}>
              <option value="">Tous</option>
              {families.map(([f, l]) => <option key={f} value={f}>{l}</option>)}
            </select>
          </Champ>
          <Champ label="État">
            <select className={LISTE} value={state} onChange={set(setState)}>
              <option value="">Tous</option>
              <option value="running">Au moins une lancée</option>
              <option value="backtest">Aucune lancée (backtest seul)</option>
            </select>
          </Champ>
          <Champ label="Trier">
            <select className={LISTE} value={sort} onChange={e => setSort(e.target.value as IdeaSort)}>
              <option value="recent">Récentes</option>
              <option value="size">Plus de variantes</option>
              <option value="az">A-Z</option>
            </select>
          </Champ>
        </div>
      </StickyFilterBar>
      <p className="mb-4 text-sm text-muted">
        <span className="text-foreground">{plural(list.length, 'idée', 'idées')}</span>, {variants.toLocaleString('fr-FR')} variantes
      </p>
      {list.length === 0
        ? <p className="py-10 text-center text-sm text-muted">
            {ideas.length === 0 ? 'La bibliothèque est vide pour l’instant.' : 'Aucune idée ne correspond. Retire un filtre ou change la recherche.'}
          </p>
        : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, shown).map(i => <IdeaCard key={i.idea_key} idea={i} />)}
          </div>
        )}
      {list.length > shown && (
        <div className="mt-6 flex justify-center">
          <button type="button" onClick={() => setShown(s => s + PAGE)}
            className={`${CIBLE} rounded-md border border-border-strong bg-card px-5 text-sm text-foreground hover:border-accent`}>
            Afficher {Math.min(PAGE, list.length - shown)} de plus ({list.length - shown} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
