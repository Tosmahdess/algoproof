// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './content/**/*.mdx'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        card: '#111111',
        // Lot 1 of the design audit (2026-09-25, §3.1): a tile nested in a card.
        // BotCard used bg-bg for its metric tiles, which cut four black holes in
        // a dark card.
        'card-2': '#161616',
        border: '#1e1e1e',
        // Hover of a clickable card, table separators. Replaces the three
        // hover borders the cards used (muted/50, accent/30, positive/30).
        'border-strong': '#2a2a2a',
        muted: '#8a8a8a',
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
        // The word PROOF in the wordmark and the glyph, nothing else (C5): same
        // value as `positive`, its own name so the drift guard can tell a brand
        // green from a gain green.
        brand: '#4ade80',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      // §3.2: a closed scale with a 13 px floor. `xs` is the caption size and the
      // smallest thing the site sets; the display size (home h1) is 4xl.
      fontSize: {
        xs: ['13px', { lineHeight: '1.4' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.55' }],
        lg: ['17px', { lineHeight: '1.55' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.25' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['40px', { lineHeight: '1.15' }],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
