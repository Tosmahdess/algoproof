// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './content/**/*.mdx'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        card: '#111111',
        border: '#1e1e1e',
        muted: '#888888',
        positive: '#4ade80',
        negative: '#f87171',
        accent: '#818cf8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
