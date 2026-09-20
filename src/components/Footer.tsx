import Link from 'next/link'
import { TWITTER_URL } from '@/lib/constants'

const LAB_URL = 'https://lab.algoproof.fr'

const SITEMAP: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Mes bots',
    links: [
      { href: '/overview',    label: 'La flotte' },
      { href: '/strategies',  label: 'Les stratégies' },
    ],
  },
  {
    title: 'Investir',
    links: [
      { href: '/investir',        label: 'Les sociétés dont je lis les comptes' },
    ],
  },
  {
    title: 'Météo du marché',
    links: [
      { href: '/intelligence', label: 'Météo du marché' },
    ],
  },
  {
    title: 'Apprendre',
    links: [
      { href: '/blog',   label: 'Blog' },
      { href: '/preuve', label: 'Ma méthode' },
      { href: '/mica',   label: 'En règle : MiCA & fiscalité' },
      { href: '/start',  label: 'Démarrer' },
    ],
  },
  {
    title: 'Le labo',
    links: [
      // The tool opens the tool (D053); « Découvrir le labo » below keeps the landing.
      { href: `${LAB_URL}/lab`, label: 'Backtester', external: true },
      { href: `${LAB_URL}/apprendre`, label: 'Tutoriels', external: true },
      // "Bibliothèque des stratégies" dropped 2026-07-31: the library moved
      // here and is already linked as /strategies in the "Mes bots" group.
      { href: `${LAB_URL}/agents`, label: 'Agents IA (MCP)', external: true },
      { href: `${LAB_URL}/membre`, label: 'Mode gratuit & membres', external: true },
    ],
  },
  {
    title: 'Le projet',
    links: [
      { href: '/a-propos', label: 'À propos' },
      { href: LAB_URL,     label: 'Découvrir le labo', external: true },
      { href: '/lexique',  label: 'Lexique' },
      { href: '/faq',      label: 'FAQ' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {SITEMAP.map(col => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold tracking-widest uppercase text-muted mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-white transition-colors">{l.label}</a>
                    ) : (
                      <Link href={l.href} className="text-sm text-muted hover:text-white transition-colors">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm text-muted">AlgoProof : mes bots de trading et les comptes de sociétés que je lis, en public. Chaque trade, chaque perte.</span>
          <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-white transition-colors">X / Twitter</a>
        </div>
        {/* The site's default rule (« paper trading sauf mention contraire »)
            and its legal reserve were the least readable line of the site:
            text-xs at 50 % opacity, 2,20:1 measured (audit 2026-09-09). Full
            opacity, 13 px: 5,6:1 on this ground, computed in
            tests/lib/design-contrast.test.ts. */}
        <p className="mt-4 text-[13px] text-muted">
          Ceci n&apos;est pas un conseil financier. Toutes les performances sont en paper trading sauf mention contraire.
          Je ne touche jamais à ton argent : pas de dépôt, pas de clé d&apos;exchange, tout est en lecture seule.
        </p>

        {/* Legal links point at lab.algoproof.fr: same publisher, one set of legal
            pages for both sites, and algoproof.fr has none of its own yet. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <a href="https://lab.algoproof.fr/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Mentions légales
          </a>
          <span>·</span>
          <a href="https://lab.algoproof.fr/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Confidentialité
          </a>
          <span>·</span>
          <a href="https://lab.algoproof.fr/terms" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
            Conditions
          </a>
        </div>
      </div>
    </footer>
  )
}
