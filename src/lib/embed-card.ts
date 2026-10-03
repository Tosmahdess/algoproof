// src/lib/embed-card.ts
//
// The card served at /embed/<slug>, the iframe every bot fiche offers to paste
// on another site. Written as one standalone HTML document, not a React page:
// the page it replaced lived under the site's root layout and shipped two
// <html>, two <body>, the nav and the footer inside a 480 px iframe (audit
// 2026-10, n° 2). A route handler answering this string cannot inherit any of
// that, needs no script, and a second root layout would have meant moving the
// whole site into a route group. Every value from the database goes through
// `esc`, since nothing here is escaped for us the way JSX would.
import type { BotWithStats } from '@/lib/types'
import {
  pnlEur, fmtEur, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss, frNumber, NARROW_NBSP,
} from '@/lib/display'
import { longDateOrdinal } from '@/lib/format-date'
import { regimeMarkSvg } from '@/lib/regime-mark'
import { SITE_COLORS } from '@/lib/site-colors'

export interface EmbedFigures {
  stats: BotWithStats['stats']
  startCapital: number
  /** First day of the simulation when the bot has a backtest segment (the fiche's
   *  « Simulation depuis le … »), else absent: the card reads the bot's own dates. */
  simStart?: string | null
}

// The site's tokens (src/lib/site-colors.ts), written out because this document has
// no Tailwind. Until 2026-10-03 the card wore GitHub's dark palette and painted a gain
// green.
export const EMBED_COLORS = SITE_COLORS
const C = EMBED_COLORS
// A standalone document on someone else's site: the system face, not a web font.
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
// Relative: the card is always served by the site, and the CSP's img-src is 'self'
// (an absolute algoproof.fr URL is refused on a preview or a local server).
const ICON = '/icon.svg'

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function documentOf(title: string, body: string): string {
  return '<!DOCTYPE html>'
    + '<html lang="fr"><head>'
    + '<meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta name="robots" content="noindex">'
    + `<title>${esc(title)}</title>`
    + `<link rel="icon" href="${ICON}" type="image/svg+xml">`
    + `<style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:${C.bg};color-scheme:dark}</style>`
    + `</head><body><main>${body}</main></body></html>`
}

function card(inner: string): string {
  return `<div style="padding:16px;border:1px solid ${C.border};border-radius:8px;background:${C.card};`
    + `max-width:480px;font-family:${FONT};color:${C.text};line-height:1.4">${inner}</div>`
}

/** « 1 000 € », « 1 234,50 € »: the base as the fiche writes it, cents only when there are some. */
function money(n: number): string {
  return `${frNumber(n, Number.isInteger(n) ? 0 : 2)}${NARROW_NBSP}€`
}

function day(iso: string | null | undefined): string | null {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return null
  return longDateOrdinal(iso)
}

/** What the P&L is measured from, said beside it: « depuis le 17 avril 2026, base 1 000 € »
 *  for real money (bots.live_since and the base of comparison), the simulation's period
 *  and start otherwise. A backtest segment takes precedence, as on the fiche. */
export function periodOf(bot: Pick<BotWithStats, 'status' | 'live_since' | 'paper_since'>, startCapital: number, simStart: string | null | undefined): string {
  if (bot.status === 'live' && !simStart) {
    const since = day(bot.live_since)
    return `${since ? `depuis le ${since}` : 'depuis le départ'}, base ${money(startCapital)}`
  }
  const since = day(simStart ?? bot.paper_since)
  return `${since ? `en simulation depuis le ${since}` : 'en simulation'}, départ ${money(startCapital)}`
}

const REGIME: Record<BotWithStats['status'], { word: string; edge: string }> = {
  live: { word: 'Argent réel', edge: 'solid' },
  paper: { word: 'Simulation', edge: 'dashed' },
  backtest: { word: 'Backtest', edge: 'dotted' },
  frozen: { word: 'Gelé', edge: 'solid' },
  archived: { word: 'Archivé', edge: 'solid' },
}

export function renderEmbedCard(bot: BotWithStats, { stats, startCapital, simStart }: EmbedFigures): string {
  const eur = pnlEur(stats.latest_capital, startCapital)
  // A gain is ordinary ink; a loss keeps its sign and takes the loss colour.
  const tone = (loss: boolean) => (loss ? C.neg : C.text)

  // Regime as a form and a word, not the gain colour (audit 2026-09-09): the same
  // drawn mark, border and word as StatusBadge's registre variant on the fiche.
  const regime = REGIME[bot.status]
  const badge = `<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;`
    + `padding:2px 8px;border-radius:2px;white-space:nowrap;color:${C.text};`
    + `border:1px ${regime.edge} ${C.borderStrong}">${regimeMarkSvg(bot.status, 10)}${regime.word}</span>`

  const header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px">`
    + `<div style="min-width:0">`
    + `<h1 style="font-size:15px;font-weight:600;margin:0;color:${C.text}">${esc(bot.name)}</h1>`
    + `<p style="font-size:13px;color:${C.muted};margin:2px 0 0">${esc(bot.exchange)} · ${esc(bot.timeframe)}</p>`
    + `</div>${badge}</div>`

  // The result first, with what it is measured from beside it.
  const result = `<div style="margin-bottom:14px">`
    + `<p style="font-size:13px;color:${C.muted};margin:0">P&amp;L</p>`
    + `<p style="margin:2px 0 0;display:flex;flex-wrap:wrap;align-items:baseline;column-gap:10px;row-gap:2px">`
    + `<span style="font-size:24px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;color:${tone(eur < 0)}">${esc(fmtEur(eur))}</span>`
    + `<span style="font-size:13px;color:${C.muted}">${esc(periodOf(bot, startCapital, simStart))}</span>`
    + `</p></div>`

  const metrics: Array<{ label: string; value: string; loss: boolean }> = [
    { label: 'WR', value: fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate), loss: false },
    { label: 'PF', value: fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor), loss: stats.total_trades > 0 && stats.profit_factor < 1 },
    // Red only when there is a drawdown to show; « 0.0% » is neutral (display.ts).
    { label: 'DD', value: fmtDrawdown(stats.max_drawdown), loss: drawdownIsLoss(stats.max_drawdown) },
  ]
  const cells = metrics.map(m => `<div>`
    + `<p style="font-size:13px;color:${C.muted};margin:0">${esc(m.label)}</p>`
    + `<p style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;margin:2px 0 0;color:${tone(m.loss)}">${esc(m.value)}</p>`
    + `</div>`).join('')
  const grid = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding-top:12px;`
    + `border-top:1px solid ${C.border};margin-bottom:14px">${cells}</div>`

  const href = `https://algoproof.fr/strategies/bot/${encodeURIComponent(bot.slug)}`
  const footer = `<p style="text-align:right;margin:0;font-size:13px">`
    + `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" `
    + `style="color:${C.accent};text-decoration:underline;text-underline-offset:2px">Publié sur algoproof.fr →</a></p>`

  return documentOf(`${bot.name} | AlgoProof`, card(header + result + grid + footer))
}

export function renderEmbedNotFound(): string {
  const body = `<h1 style="font-size:15px;font-weight:600;color:${C.text};margin:0">Bot introuvable</h1>`
    + `<p style="font-size:13px;color:${C.muted};margin:6px 0 0">Ce bot n'est pas publié sur `
    + `<a href="https://algoproof.fr/overview" target="_blank" rel="noopener noreferrer" `
    + `style="color:${C.accent};text-underline-offset:2px">algoproof.fr</a>.</p>`
  return documentOf('Bot introuvable | AlgoProof', card(body))
}
