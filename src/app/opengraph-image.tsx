import { ImageResponse } from 'next/og'
import { getFunnelCounts } from '@/lib/funnel'
import { SITE_COLORS as C } from '@/lib/site-colors'
import { Wordmark } from '@/lib/share-image'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// La marque, en clair plutôt que lue depuis public/logo.svg : cette route tourne
// à l'Edge et ne lit pas le disque. Les deux copies sont tenues ensemble par
// tests/app/opengraph-image.test.tsx, qui compare les chemins du check.
// Le halo du check vaut le fond de cette carte, le fond du site (#101714 depuis la
// refonte « registre des décisions ») : un halo à la mauvaise couleur se verrait
// comme un liseré sombre.
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <line x1="12.5" y1="30" x2="12.5" y2="54" stroke="#f87171" stroke-width="2.5"/>
  <rect x="8" y="34" width="9" height="16" rx="2" fill="#f87171"/>
  <line x1="26.5" y1="24" x2="26.5" y2="48" stroke="#9aa0aa" stroke-width="2.5"/>
  <rect x="22" y="28" width="9" height="16" rx="2" fill="#9aa0aa"/>
  <line x1="40.5" y1="17" x2="40.5" y2="42" stroke="#4ade80" stroke-width="2.5"/>
  <rect x="36" y="21" width="9" height="17" rx="2" fill="#4ade80"/>
  <path d="M36 22 L45 32 L60 9" stroke="${C.bg}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M36 22 L45 32 L60 9" stroke="#4ade80" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`
const MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(MARK).toString('base64')}`

export default async function Image() {
  // An OG image route must never throw. A card that fails to render is worse
  // than a card without a count. getFunnelCounts() already resolves to null on
  // error rather than throwing, but wrap it anyway and fall back to wording
  // with no number at all if the fetch fails for any reason.
  let botLine = 'résultats mis à jour · aucun résultat fabriqué'
  try {
    const funnel = await getFunnelCounts()
    if (funnel && Number.isFinite(funnel.n_promoted)) {
      botLine = `${funnel.n_promoted} bots · résultats mis à jour · aucun résultat fabriqué`
    }
  } catch {
    // keep the numberless fallback
  }

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: C.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MARK_SRC} alt="" width={96} height={96} />
        <Wordmark fontSize={80} />
      </div>
      <span style={{ color: C.text, fontSize: '30px', textAlign: 'center', maxWidth: '700px' }}>
        Des stratégies testées, des comptes de sociétés examinés
      </span>
      <span style={{ color: C.muted, fontSize: '20px', marginTop: '8px' }}>
        {botLine}
      </span>
    </div>,
    { width: 1200, height: 630 }
  )
}
