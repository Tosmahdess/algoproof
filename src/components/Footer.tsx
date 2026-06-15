import Link from 'next/link'
import { TWITTER_URL } from '@/lib/constants'

const LAB_URL = 'https://lab.algoproof.fr'

const SITEMAP: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Mes bots',
    links: [
      { href: '/overview',    label: 'Vue d\'ensemble' },
      { href: '/strategies',  label: 'Les stratégies' },
      { href: '/performance', label: 'Performance' },
      { href: '/journal',     label: 'Ce qui a changé' },
    ],
  },
  {
    title: 'Investir',
    links: [
      { href: '/wealth',          label: 'Ma watchlist' },
      { href: '/wealth#analyses', label: 'Analyses par secteur' },
    ],
  },
  {
    title: 'Le marché',
    links: [
      { href: '/intelligence', label: 'Météo du marché' },
    ],
  },
  {
    title: 'Apprendre',
    links: [
      { href: '/blog',   label: 'Blog' },
      { href: '/preuve', label: 'Ma méthode' },
      { href: '/mica',   label: 'En règle — MiCA & fiscalité' },
      { href: '/start',  label: 'Démarrer' },
    ],
  },
  {
    title: 'Le labo',
    links: [
      { href: LAB_URL, label: 'Backtester', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
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
          <span className="text-sm text-muted">AlgoProof — Mon labo de trading algo, en public. Chaque trade, chaque perte.</span>
          <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-white transition-colors">X / Twitter</a>
        </div>
        <p className="mt-4 text-xs text-muted/50">
          Ceci n&apos;est pas un conseil financier. Toutes les performances sont en paper trading sauf mention contraire.
        </p>
      </div>
    </footer>
  )
}
