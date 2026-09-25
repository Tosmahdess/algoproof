// tests/lib/design-drift-guard.test.ts
//
// Visual-harmonisation pass of 2026-09-24: links were green, white or violet
// depending on the card, and prose paragraphs were white, grey or 80 % white
// depending on the page. The decision is two text colours (foreground, muted),
// one link system (src/lib/link-roles.ts) and green reserved for profit.
// This guard refuses the class spellings that produced the drift, anywhere in src/.
//
// Lot 1 of the design audit (2026-09-25, conception C3/C5/C9/C10, material in
// _ideas/Audit/design/04_PASS4_JETONS_ET_LOT1.md): the list grows with the rules
// the redesign rests on. Each rule may carry an allow-list of files, always with
// the reason: a data file that paints a gain, or chrome that a later lot rewrites.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..', '..', 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : walk(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

interface Rule {
  re: RegExp
  why: string
  /** A spelling the rule must fire on: an empty hit list proves nothing otherwise. */
  sample: string
  /** Files (relative to src/, forward slashes) where the spelling is legitimate, with why. */
  allow?: string[]
}

// Lot 2 (2026-09-25) rewrote the navigation and the footer: no chrome is exempt
// any more.
const CHROME_LOT_2: string[] = []

const RULES: Rule[] = [
  // C5: the brand green lives in the wordmark only. `text-brand` has the same
  // value as `text-positive`; its own name is what lets this rule exist.
  { re: /\btext-brand\b/, why: 'text-brand — the wordmark only (Nav.tsx)', sample: '<span className="text-brand">PROOF</span>', allow: ['components/Nav.tsx'] },
  { re: /(?<![\w:-])text-white\b/, why: 'text-white — use text-foreground', sample: 'className="text-white"' },
  { re: /hover:text-white\b/, why: 'hover:text-white — use a linkClass role or hover:text-foreground', sample: 'className="a hover:text-white"' },
  { re: /text-foreground\/\d+/, why: 'text-foreground/NN — prose is foreground or muted, nothing in between', sample: 'text-foreground/80' },
  { re: /\b(?:text|bg|border)-zinc-\d+/, why: 'zinc-* — use the site tokens (border, card, foreground, muted)', sample: 'border-zinc-800' },
  { re: /hover:border-positive/, why: 'hover:border-positive — green is profit, never a hover colour', sample: 'hover:border-positive/30' },
  { re: /(?:group-)?hover:text-positive/, why: 'hover:text-positive — green is profit, never a hover colour', sample: 'group-hover:text-positive' },
  // C9 / §3.2: the floor is 13 px (text-xs). 10 px joined the list on 2026-09-25.
  { re: /text-\[(?:9|10|11|13|15)px\]/, why: 'arbitrary text size — use text-xs / text-sm', sample: 'text-[10px]' },
  // §3.3: three radii. Cards and buttons are rounded-lg, pills rounded, dots rounded-full.
  { re: /\brounded-(?:xl|2xl|3xl)\b/, why: 'rounded-xl and up — cards and buttons are rounded-lg', sample: 'rounded-2xl' },
  // C5: the primary button is foreground on bg; green is a data colour.
  { re: /\btext-black\b/, why: 'text-black — a button on a light fill is text-bg', sample: 'bg-foreground text-black' },
  {
    re: /(?<![\w/-])bg-positive\b(?!\/)/, why: 'solid bg-positive — green is profit, never a button or a fill',
    sample: 'className="bg-positive text-bg"',
    allow: [
      'components/MiRegimeBadge.tsx', // the live pulse dot: a state, drawn as a dot
      'components/SyncBadge.tsx',     // freshness dot
      'components/PathToRealCard.tsx', // progress bar toward the real-money gate, a measure
      'components/ConformityCard.tsx', // envelope status colours, a measure
    ],
  },
  // C5: text-positive in a STATIC className is decoration (an eyebrow, a title line, a
  // success message). A gain is painted through a ternary on the figure's sign, which
  // this regex does not match. Sample: a static attribute.
  {
    re: /className="[^"]*\btext-positive\b[^"]*"/, why: 'static text-positive — green is a data colour, not an accent',
    sample: '<p className="text-xs text-positive mb-2">',
    allow: [
      ...CHROME_LOT_2,
      'components/ProofComparison.tsx', // comparison table, rewritten with /preuve in lot 7
    ],
  },
  // C9: uppercase tracked labels only in table headers.
  {
    // Order-insensitive (« tracking-widest uppercase » slipped through the first
    // spelling); a <th>, or a <tr> / <thead> header row, keeps its tracking.
    re: /^(?!.*<(?:th|tr|thead)\b)(?=.*\buppercase\b).*tracking-wid(?:er|est)/, why: 'uppercase tracking label outside a <th> — section labels are sentence case, 13 px, medium',
    sample: '<h2 className="text-xs tracking-wider uppercase text-muted">',
    allow: CHROME_LOT_2,
  },
  // §3.1: family colours belong to chart series, never to a text label.
  { re: /color:\s*familyColor\(/, why: 'family colour on a text label — families are text-muted outside charts', sample: 'style={{ color: familyColor(bot.family) }}' },
  // C3: one spelling per metric.
  { re: /T\. gain|F\. profit/, why: '« T. gain / F. profit » — the tables say WR and PF', sample: "label: 'T. gain'" },
  { re: /'∞'|"∞"|>∞</, why: '« ∞ » — a PF with no loss is an absent figure, «—»', sample: "return '∞'" },
  // C10: no icons. Pictographs in the UI render differently on every OS. ⚠ stays: it is
  // a typographic sign, and the low-sample tests pin it.
  {
    re: /[\u{1F300}-\u{1FAFF}\u{2705}\u{274C}\u{2714}\u{2728}\u{2B50}]/u, why: 'emoji — the site has no icons',
    sample: '<h2>💬 Discussion</h2>',
    allow: ['app/api/comments/route.ts', 'app/api/subscribe/route.ts'], // Telegram notifications to the owner, not the site
  },
]

describe('design drift guard', () => {
  const files = walk(SRC)
  it('scans a non-trivial tree', () => {
    expect(files.length).toBeGreaterThan(100)
  })
  // Witness: each pattern must fire on the spelling it bans, or an empty hit
  // list proves nothing.
  it.each(RULES.map((r) => [r.why.split(' — ')[0], r] as const))('pattern fires on its sample: %s', (_name, rule) => {
    expect(rule.re.test(rule.sample), rule.sample).toBe(true)
  })
  it('does not fire on the canonical spellings', () => {
    const ok = [
      'text-foreground', 'text-muted', 'group-hover:text-accent', 'text-xs', 'rounded-lg', 'rounded-full',
      'bg-positive/10', "className={`font-mono ${pct >= 0 ? 'text-positive' : 'text-negative'}`}",
      '<th className="text-xs uppercase tracking-wider text-muted">', '<tr className="text-muted uppercase tracking-wider border-b">',
      'stroke: familyColor(family)',
      'Échantillon faible ⚠', 'bg-foreground text-bg',
    ]
    for (const s of ok) expect(RULES.some((r) => r.re.test(s)), s).toBe(false)
  })
  for (const { re, why, allow = [] } of RULES) {
    it(`no ${why.split(' — ')[0]}`, () => {
      const hits = files
        .filter((f) => !allow.includes(f.slice(SRC.length + 1).replace(/\\/g, '/')))
        .flatMap((f) =>
          readFileSync(f, 'utf-8').split('\n')
            .map((line, i) => ({ line, i }))
            .filter(({ line }) => re.test(line) && !/^\s*(\/\/|\*)/.test(line))
            .map(({ i }) => `${f.slice(SRC.length + 1)}:${i + 1}`),
        )
      expect(hits, why).toEqual([])
    })
  }
  it('every allow-listed file still exists (a stale entry hides nothing)', () => {
    const known = new Set(files.map((f) => f.slice(SRC.length + 1).replace(/\\/g, '/')))
    for (const r of RULES) for (const a of r.allow ?? []) expect(known.has(a), a).toBe(true)
  })
})
