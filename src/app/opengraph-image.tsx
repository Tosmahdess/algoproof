import { ImageResponse } from 'next/og'
import { getFunnelCounts } from '@/lib/funnel'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  // An OG image route must never throw. A card that fails to render is worse
  // than a card without a count. getFunnelCounts() already resolves to null on
  // error rather than throwing, but wrap it anyway and fall back to wording
  // with no number at all if the fetch fails for any reason.
  let botLine = 'données live · zéro faux screenshot'
  try {
    const funnel = await getFunnelCounts()
    if (funnel && Number.isFinite(funnel.n_promoted)) {
      botLine = `${funnel.n_promoted} bots · données live · zéro faux screenshot`
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
        backgroundColor: '#0d1117',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: '80px', fontWeight: 700 }}>
        <span style={{ color: '#f5f5f5' }}>Algo</span>
        <span style={{ color: '#4ade80' }}>Proof</span>
      </div>
      <span style={{ color: '#e6edf3', fontSize: '28px', textAlign: 'center', maxWidth: '700px' }}>
        Trading algo vérifié, chaque trade publié
      </span>
      <span style={{ color: '#8b949e', fontSize: '20px', marginTop: '8px' }}>
        {botLine}
      </span>
    </div>,
    { width: 1200, height: 630 }
  )
}
