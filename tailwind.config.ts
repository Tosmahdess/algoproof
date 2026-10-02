// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './content/**/*.mdx'],
  theme: {
    extend: {
      colors: {
        // Refonte « Le registre des décisions », lot 1 (2026-10-02): Astra's dark
        // palette (docs/refonte-registre/PROPOSITION_ASTRA.md, « Palette sombre »).
        // The token NAMES are kept where the role is the same, so the call sites do
        // not move; only the values change. Ratios: tests/lib/design-contrast.test.ts.
        bg: '#101714',
        // Surface: the decision panel, inputs, Direct.
        card: '#17211c',
        // Active surface: hover, selected control, a tile set on a card.
        'card-2': '#22332b',
        // Rule: decorative structure only (2,24:1 on bg), never the sole edge of a control.
        border: '#415449',
        // Control outline: fields, buttons, secondary focus (5,90:1 on bg).
        'border-strong': '#82988a',
        // Note: metadata and captions.
        muted: '#a8b6ab',
        // A gain is ordinary ink (owner, 2026-10-02): green no longer means profit,
        // it means the brand. A loss keeps its colour AND its sign.
        positive: '#edf1e8',
        negative: '#ff9c90',
        // Links (underlined) and focus.
        accent: '#abc8ec',
        foreground: '#edf1e8',
        // Reserve: insufficient data, an exception.
        warning: '#e9c17c',
        // Escalation tier between `warning` and `negative` (risk regime STRESS,
        // dip-signal MAJEUR, "major" severity elsewhere), named for what it means.
        severe: '#ff6b35',
        // The primary button: a dark slate fill with ink text and a link-blue edge.
        button: '#263f55',
        // The word Proof in the wordmark, nothing else (C5).
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
