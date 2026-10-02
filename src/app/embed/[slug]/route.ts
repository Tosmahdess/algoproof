// /embed/<slug>: the card a reader pastes on their own site as an iframe.
// A route handler, not a page, so the answer is one standalone HTML document
// with none of the site's root layout (see src/lib/embed-card.ts). The framing
// headers that let any site show it live in next.config.ts.
import { getBotSlugs, getBotWithStats } from '@/lib/queries'
import { getBotSimulation } from '@/lib/bot-simulation'
import { renderEmbedCard, renderEmbedNotFound } from '@/lib/embed-card'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const slugs = await getBotSlugs()
    return slugs.map(slug => ({ slug }))
  } catch {
    return []
  }
}

const HTML = { 'Content-Type': 'text/html; charset=utf-8' }

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // getBotWithStats is also the guard: an engine candidate that never ran has
  // no public card (tests/app/bot-slug-routes.test.tsx).
  const bot = await getBotWithStats(slug)
  if (!bot) return new Response(renderEmbedNotFound(), { status: 404, headers: HTML })

  // Same figures as the fiche that offers this share (D072): the simulation since the
  // freeze when the bot has a backtest segment, its P&L read from the simulation's start.
  const simulation = await getBotSimulation(bot)
  const html = renderEmbedCard(bot, {
    stats: simulation?.stats ?? bot.stats,
    startCapital: simulation ? simulation.timeline.simStartCapital : bot.start_capital,
  })
  return new Response(html, { status: 200, headers: HTML })
}
