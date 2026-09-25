import { linkClass } from '@/lib/link-roles'
import Link from 'next/link'
import { TWITTER_URL } from '@/lib/constants'
import { labUrl } from '@/lib/lab-links'

const LAB_URL = 'https://lab.algoproof.fr'

// Lot 2 of the design audit (conception §2.4): four columns instead of six, the
// five words of the bar under « Le site », the lab under one heading that says it
// leaves the domain. « Découvrir le labo » (the landing) stays: the landing is the
// pitch for cold traffic (D051), the app is where the nav sends warm traffic (D053).
const SITEMAP: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Le site',
    links: [
      { href: '/overview',     label: 'La flotte' },
      { href: '/strategies',   label: 'Stratégies' },
      { href: '/investir',     label: 'Sociétés' },
      { href: '/intelligence', label: 'Météo' },
      { href: '/blog',         label: 'Articles' },
    ],
  },
  {
    title: 'Comprendre',
    links: [
      { href: '/preuve',  label: 'Ma méthode' },
      { href: '/lexique', label: 'Lexique' },
      { href: '/faq',     label: 'FAQ' },
      { href: labUrl(`${LAB_URL}/cockpit/cimetiere`, 'footer'), label: 'Cimetière ↗', external: true },
    ],
  },
  {
    title: 'Le labo ↗',
    links: [
      { href: labUrl(`${LAB_URL}/lab`, 'footer'),       label: 'Tester une stratégie', external: true },
      { href: labUrl(`${LAB_URL}/apprendre`, 'footer'), label: 'Tutoriels',            external: true },
      { href: labUrl(`${LAB_URL}/agents`, 'footer'),    label: 'Agents IA (MCP)',      external: true },
      { href: labUrl(`${LAB_URL}/membre`, 'footer'),    label: 'Abonnement',           external: true },
      { href: labUrl(`${LAB_URL}/account`, 'footer'),   label: 'Compte',               external: true },
      { href: labUrl(LAB_URL, 'footer'),                label: 'Découvrir le labo',    external: true },
    ],
  },
  {
    title: 'Le projet',
    links: [
      { href: '/a-propos', label: 'À propos' },
      { href: '/start',    label: 'Démarrer (plateformes)' },
      { href: '/mica',     label: 'MiCA & fiscalité' },
      { href: TWITTER_URL, label: 'X / Twitter', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {SITEMAP.map(col => (
            <div key={col.title}>
              <h3 className="text-xs font-medium text-muted mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass('nav', 'text-sm')}>{l.label}</a>
                    ) : (
                      <Link href={l.href} className={linkClass('nav', 'text-sm')}>{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-sm text-muted">AlgoProof : mes bots de trading et les comptes de sociétés que je lis, en public. Chaque trade, chaque perte.</p>
        </div>
        {/* The site's default rule and its legal reserve, at full opacity and
            13 px (5,6:1 on this ground, tests/lib/design-contrast.test.ts). « en
            simulation » is the word of the badges (C2); « paper trading » lives in
            the lexicon. */}
        <p className="mt-4 text-xs text-muted">
          Ceci n&apos;est pas un conseil financier. Toutes les performances sont en simulation sauf mention « Argent réel ».
          Je ne touche jamais à ton argent : pas de dépôt, pas de clé d&apos;exchange, tout est en lecture seule.
        </p>

        {/* Legal links point at lab.algoproof.fr: same publisher, one set of legal
            pages for both sites (D039). */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <a href={labUrl(`${LAB_URL}/mentions-legales`, 'footer')} target="_blank" rel="noopener noreferrer" className={linkClass('nav')}>
            Mentions légales
          </a>
          <span>·</span>
          <a href={labUrl(`${LAB_URL}/privacy`, 'footer')} target="_blank" rel="noopener noreferrer" className={linkClass('nav')}>
            Confidentialité
          </a>
          <span>·</span>
          <a href={labUrl(`${LAB_URL}/terms`, 'footer')} target="_blank" rel="noopener noreferrer" className={linkClass('nav')}>
            Conditions
          </a>
        </div>
      </div>
    </footer>
  )
}
