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
import { pnlEur, fmtEur, fmtPfDisplay, fmtWinRateDisplay, fmtDrawdown, drawdownIsLoss } from '@/lib/display'

export interface EmbedFigures {
  stats: BotWithStats['stats']
  startCapital: number
}

const C = {
  bg: '#0d1117',
  border: '#30363d',
  text: '#e6edf3',
  muted: '#8b949e',
  pos: '#3fb950',
  neg: '#ff4444',
}
const FONT = '-apple-system, BlinkMacSystemFont, sans-serif'

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
    + `<style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:${C.bg}}</style>`
    + `</head><body>${body}</body></html>`
}

function card(inner: string): string {
  return `<div style="padding:16px;border:1px solid ${C.border};border-radius:10px;background:${C.bg};`
    + `max-width:480px;font-family:${FONT}">${inner}</div>`
}

export function renderEmbedCard(bot: BotWithStats, { stats, startCapital }: EmbedFigures): string {
  const eur = pnlEur(stats.latest_capital, startCapital)
  const isLive = bot.status === 'live'

  const metrics: Array<{ label: string; value: string; neutral?: boolean; pos?: boolean }> = [
    { label: 'WR', value: fmtWinRateDisplay(bot.family, stats.total_trades, stats.win_rate), neutral: true },
    { label: 'PF', value: fmtPfDisplay(bot.family, stats.total_trades, stats.profit_factor), pos: stats.profit_factor >= 1 },
    // Red only when there is a drawdown to show; « 0.0% » is neutral (display.ts).
    { label: 'DD', value: fmtDrawdown(stats.max_drawdown), neutral: !drawdownIsLoss(stats.max_drawdown), pos: false },
    { label: 'P&L', value: fmtEur(eur), pos: eur >= 0 },
  ]

  // Regime as a form and a word, not the gain colour (audit 2026-09-09):
  // same glyphs and words as StatusBadge on the site.
  const badge = `<span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:20px;white-space:nowrap;`
    + `color:${isLive ? C.text : C.muted};`
    + `background:${isLive ? 'rgba(230,237,243,0.1)' : 'rgba(139,148,158,0.1)'};`
    + `border:1px ${isLive ? 'solid rgba(230,237,243,0.4)' : 'dashed rgba(139,148,158,0.4)'}">`
    + `${isLive ? '● Argent réel' : '○ Simulation'}</span>`

  const header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:14px">`
    + `<div>`
    + `<p style="font-size:14px;font-weight:700;color:${C.text};margin:0">${esc(bot.name)}</p>`
    + `<p style="font-size:12px;color:${C.muted};margin:3px 0 0">${esc(bot.exchange)} · ${esc(bot.timeframe)}</p>`
    + `</div>${badge}</div>`

  const cells = metrics.map(m => `<div style="text-align:center">`
    + `<p style="font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;margin:0 0 2px">${esc(m.label)}</p>`
    + `<p style="font-size:13px;font-weight:700;font-family:monospace;margin:0;`
    + `color:${m.neutral ? C.text : m.pos ? C.pos : C.neg}">${esc(m.value)}</p>`
    + `</div>`).join('')
  const grid = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">${cells}</div>`

  const href = `https://algoproof.fr/strategies/bot/${encodeURIComponent(bot.slug)}`
  const footer = `<div style="text-align:right">`
    + `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" `
    + `style="font-size:12px;color:${C.muted};text-decoration:none">Publié sur algoproof.fr →</a></div>`

  return documentOf(`${bot.name} | AlgoProof`, card(header + grid + footer))
}

export function renderEmbedNotFound(): string {
  const body = `<p style="font-size:14px;font-weight:700;color:${C.text};margin:0">Bot introuvable</p>`
    + `<p style="font-size:12px;color:${C.muted};margin:6px 0 0">Ce bot n'est pas publié sur `
    + `<a href="https://algoproof.fr/overview" target="_blank" rel="noopener noreferrer" style="color:${C.muted}">algoproof.fr</a>.</p>`
  return documentOf('Bot introuvable | AlgoProof', card(body))
}
