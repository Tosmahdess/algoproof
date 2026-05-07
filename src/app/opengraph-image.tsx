import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
      <span style={{ color: '#ff6b35', fontSize: '80px', fontWeight: 700 }}>AlgoProof</span>
      <span style={{ color: '#e6edf3', fontSize: '28px', textAlign: 'center', maxWidth: '700px' }}>
        Trading algo vérifié — chaque trade publié
      </span>
      <span style={{ color: '#8b949e', fontSize: '20px', marginTop: '8px' }}>
        33 bots · données live · zéro faux screenshot
      </span>
    </div>,
    { width: 1200, height: 630 }
  )
}
