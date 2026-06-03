import { getJournalEntries } from '@/lib/queries'
import { scopeLabel } from '@/lib/changelog'

export const revalidate = 3600

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function GET() {
  const entries = (await getJournalEntries()).slice(0, 50)
  const items = entries.map(e => `
    <item>
      <title>[${esc(scopeLabel(e))}] ${esc(e.summary)}</title>
      <link>https://algoproof.fr/journal</link>
      <guid isPermaLink="false">${e.id}</guid>
      <category>${esc(e.category)}</category>
      <pubDate>${new Date(e.entry_date + 'T12:00:00Z').toUTCString()}</pubDate>
      <description>${esc(e.detail ?? e.summary)}</description>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AlgoProof — Journal</title>
    <link>https://algoproof.fr/journal</link>
    <description>Les changements d'AlgoProof : flotte, intelligence, patrimoine.</description>
    <language>fr</language>${items}
  </channel>
</rss>`

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
