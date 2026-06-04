import type { Metadata } from 'next'
import Link from 'next/link'
import FaqAccordion from '@/components/FaqAccordion'
import CryptoTaxCalculator from '@/components/CryptoTaxCalculator'
import ComplianceChecklist from '@/components/ComplianceChecklist'
import MicaCountdown from '@/components/MicaCountdown'
import { MICA_EXCHANGES } from '@/lib/mica-exchanges'

export const metadata: Metadata = {
  title: 'Crypto en règle : MiCA + fiscalité (France 2026) | AlgoProof',
  description:
    "MiCA s'applique le 1er juillet 2026. Ce qui change pour toi, les exchanges agréés, et un calculateur d'impôt sur tes plus-values crypto (flat tax 31,4 % ou barème).",
  openGraph: { url: 'https://algoproof.fr/mica' },
}

const MICA_POINTS = [
  ['Protection renforcée', "Livre blanc obligatoire, droit de rétractation, règles sur la publicité et les conflits d'intérêts."],
  ['Exchanges agréés', "Les plateformes doivent obtenir un agrément CASP pour opérer dans l'UE. Les non-agréés devront partir."],
  ['Stablecoins encadrés', "Les émetteurs de stablecoins doivent respecter des exigences de réserves et de transparence."],
  ['Ce qui ne change PAS', "La fiscalité reste française (art. 150 VH bis). MiCA ne touche pas tes impôts. Vois le calculateur plus bas."],
]

const FAQ = [
  { question: "Puis-je encore utiliser Binance en France ?", answer: "Oui pour le spot (Binance est agréé MiCA dans l'UE). Binance Futures reste bloqué aux résidents français depuis 2023 (restriction AMF). Vois la page Démarrer pour les alternatives." },
  { question: "Dois-je déclarer si je n'ai pas vendu en euros ?", answer: "Tu déclares tes comptes (formulaire 3916-bis) même sans vente. Les échanges crypto→crypto ne sont pas imposables : seule la conversion en monnaie fiat (ou achat d'un bien) déclenche l'impôt sur la plus-value." },
  { question: "Le VPN pour contourner une restriction, c'est risqué ?", answer: "Oui. Utiliser un VPN pour accéder à un produit bloqué expose ton compte au gel et t'engage juridiquement. Mieux vaut un exchange réellement agréé et disponible en France." },
  { question: "MiCA change-t-il combien je paie d'impôts ?", answer: "Non. MiCA encadre les plateformes et protège l'investisseur, mais la fiscalité des plus-values reste nationale : flat tax de 31,4 % (ou option pour le barème progressif)." },
  { question: "C'est quoi un exchange agréé CASP ?", answer: "CASP = Crypto-Asset Service Provider. C'est l'agrément européen créé par MiCA qu'une plateforme doit détenir pour proposer ses services dans l'UE. Tu peux vérifier le statut sur le registre de l'AMF/ESMA." },
]

export default function MicaPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({
      '@type': 'Question', name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* Hero */}
      <div>
        <span className="inline-block rounded-full bg-accent/10 border border-accent/30 px-3 py-1 text-xs font-medium text-accent">
          MiCA : <MicaCountdown />
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Crypto en règle : ce que MiCA change pour toi</h1>
        <p className="mt-3 text-muted leading-relaxed">
          Le règlement européen MiCA s&apos;applique pleinement le 1er juillet 2026. Voici ce qui change concrètement,
          comment rester en règle depuis la France, et combien tu paieras d&apos;impôts sur tes plus-values.
        </p>
      </div>

      {/* Ce que MiCA change */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Ce que MiCA change pour toi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MICA_POINTS.map(([title, body]) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-text mb-1">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Es-tu en règle ?</h2>
        <ComplianceChecklist />
      </section>

      {/* Exchanges */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Exchanges agréés MiCA</h2>
        <p className="text-sm text-muted mb-4">
          Statut indicatif, vérifie sur le{' '}
          <a href="https://www.amf-france.org" target="_blank" rel="noopener noreferrer" className="text-accent">registre AMF/ESMA</a>.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card/50 text-left text-muted">
                <th className="px-4 py-3 font-medium">Exchange</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">France</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MICA_EXCHANGES.map(e => (
                <tr key={e.name} className="hover:bg-card/30">
                  <td className="px-4 py-3 font-medium text-text">
                    {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:text-positive">{e.name} →</a> : e.name}
                  </td>
                  <td className="px-4 py-3 text-muted">{e.type}</td>
                  <td className="px-4 py-3 text-muted">{e.status}</td>
                  <td className="px-4 py-3 text-text">{e.franceOk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">Comment ouvrir un compte étape par étape → <Link href="/start" className="text-accent">page Démarrer</Link>.</p>
      </section>

      {/* Calculateur */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Calculateur d&apos;impôt sur tes plus-values</h2>
        <p className="text-sm text-muted mb-4">Régime du particulier. Compare la flat tax (31,4 %) à l&apos;option barème.</p>
        <CryptoTaxCalculator />
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Questions fréquentes</h2>
        <FaqAccordion items={FAQ} />
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link href="/start" className="rounded-lg bg-positive px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90">Ouvrir un compte en règle →</Link>
        <Link href="/strategies" className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text hover:border-positive hover:text-positive">Voir les stratégies →</Link>
      </div>
    </main>
  )
}
