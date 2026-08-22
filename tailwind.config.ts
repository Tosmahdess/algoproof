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
        foreground: '#f5f5f5',
        warning: '#f59e0b',
        // Escalation tier between `warning` and `negative` (risk regime STRESS,
        // dip-signal MAJEUR, "major" severity elsewhere) — named for what it
        // means, not its orange hue. Added while unifying the design system
        // (2026-08-22): the one new token task 4 allowed for the three
        // theme-less hexes found in src/.
        severe: '#ff6b35',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
