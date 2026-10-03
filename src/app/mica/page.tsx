// /mica, refonte « Le registre des décisions » (2026-10-03). The page kept the old
// template after the palette changed: a countdown pill, four same-size cards, four
// checkboxes, a table scrolled sideways on a phone, an accordion and two buttons
// (audit 2026-10). It is now one reading page: the calculator first, as the one
// framed tool; then the exchanges as a register whose rows stack on a phone; what
// MiCA changes and what I check, as ruled lines; the questions in native
// <details>; one way forward.
//
// Audit 2026-10, settled here: n° 16 (an affiliate link with no mention), n° 18
// (the result in a status region, kept from fbba151), n° 55 (« au 10 septembre »
// read as current), n° 57 (double suffix, AMF home page link, countdown to a past
// date), n° 82 (impersonal voice, undated status).
import { linkClass } from '@/lib/link-roles'
import type { Metadata } from 'next'
import Link from 'next/link'
import CryptoTaxCalculator from '@/components/CryptoTaxCalculator'
import ComplianceChecklist from '@/components/ComplianceChecklist'
import { MICA_EXCHANGES, MICA_EXCHANGES_READ_ON, type MicaExchange } from '@/lib/mica-exchanges'
import { fmtRate, PFU_FLAT_RATE } from '@/lib/crypto-tax'
import { longDate } from '@/lib/format-date'

const FLAT = fmtRate(PFU_FLAT_RATE)

export const metadata: Metadata = {
  // The layout's template adds « | AlgoProof » (audit 2026-10, n° 57: it was there twice).
  title: 'Crypto en règle : MiCA et fiscalité (France 2026)',
  description:
    `MiCA s'applique en France depuis le 1er juillet 2026. Ce qui change, le statut des plateformes, et un calculateur d'impôt sur tes plus-values crypto (flat tax ${FLAT} ou barème).`,
  openGraph: { url: 'https://algoproof.fr/mica' },
}

// The ESMA page that hosts the interim MiCA register (the CASP list), not a home
// page (audit 2026-10, n° 57: the link opened amf-france.org).
const ESMA_REGISTER = 'https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica'

// The day the Binance answer was last read against its sources. The answer says
// only what was true that day and that the AMF's ruling was due before 1 October;
// it does not guess the ruling (audit 2026-10, n° 55). The guard in
// tests/lib/copy-guards.test.ts reads the date as written in this file.
const BINANCE_READ = { iso: '2026-09-10', label: '10 septembre 2026' }

const FAQ: { question: string; answer: string; readOn?: string }[] = [
  // Same sentence as the lab: Binance aims for a return through a new MiCA filing.
  // The sources are on /start (an answer is a string, also served as JSON-LD, so it
  // carries no link). Audit 2026-09-09, §10.
  {
    question: 'Puis-je encore utiliser Binance en France ?',
    answer: `Non, pas au ${BINANCE_READ.label}, date de ma dernière relecture. Binance a cessé de servir les résidents français le 1er juillet 2026, faute d'agrément MiCA, y compris pour le spot (les Futures étaient déjà bloqués depuis 2023, restriction AMF). Au ${BINANCE_READ.label}, rien n'a repris : Binance vise un retour par un nouveau dépôt auprès de l'AMF, qui devait se prononcer avant le 1er octobre 2026. Je n'ai pas relu cette réponse depuis : elle ne dit rien de la décision de l'AMF. La page Démarrer donne les sources et les plateformes que j'utilise (Kraken, Bybit, Hyperliquid).`,
    readOn: BINANCE_READ.iso,
  },
  { question: 'Dois-je déclarer si je n’ai pas vendu en euros ?', answer: "Tu déclares tes comptes (formulaire 3916-bis) même sans vente. Les échanges crypto contre crypto ne sont pas imposables : seule la conversion en monnaie fiat (ou l'achat d'un bien) déclenche l'impôt sur la plus-value." },
  { question: 'Le VPN pour contourner une restriction, c’est risqué ?', answer: "Oui. Utiliser un VPN pour accéder à un produit bloqué expose ton compte au gel et t'engage juridiquement. Mieux vaut une plateforme réellement agréée et disponible en France." },
  { question: 'MiCA change-t-il combien je paie d’impôts ?', answer: `Non. MiCA encadre les plateformes et protège l'investisseur, mais la fiscalité des plus-values reste nationale : flat tax de ${FLAT} (ou option pour le barème progressif).` },
  { question: 'C’est quoi une plateforme agréée CASP ?', answer: "CASP veut dire Crypto-Asset Service Provider. C'est l'agrément européen créé par MiCA qu'une plateforme doit détenir pour proposer ses services dans l'Union. Le statut se vérifie sur le registre MiCA de l'ESMA." },
]

const MICA_POINTS: [string, string][] = [
  ['Les plateformes', "Une plateforme doit détenir l'agrément CASP pour servir des clients dans l'Union. Celles qui ne l'ont pas ont dû cesser de servir la France."],
  ['L’investisseur', "Livre blanc obligatoire, droit de rétractation, règles sur la publicité et les conflits d'intérêts."],
  ['Les stablecoins', 'Leurs émetteurs doivent respecter des exigences de réserves et de transparence.'],
  ['L’impôt, qui ne change pas', "La fiscalité reste française (article 150 VH bis du CGI). C'est elle que le calculateur estime."],
]

const SECTION = 'border-t border-border pt-8 sm:pt-9'
const H2 = 'text-2xl font-semibold tracking-tight'
// A fixed last column, so the heads and the rows share their tracks.
const COLUMNS = 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_7.5rem] sm:gap-x-6'
const TYPE_LABEL: Record<MicaExchange['type'], string> = { CEX: 'Centralisée (CEX)', DEX: 'Décentralisée (DEX)' }

function ExchangeRow({ e }: { e: MicaExchange }) {
  return (
    <li data-testid="mica-row" data-name={e.name}
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-t border-border py-4 first:border-t-0 ${COLUMNS}`}>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          {e.url ? (
            <a href={e.url} target="_blank"
               rel={e.affiliate ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
               className={linkClass('record', 'inline-flex min-h-11 items-center sm:min-h-0')}>
              {e.name}<span className="sr-only">{' '}(nouvel onglet)</span>
            </a>
          ) : <span className="inline-flex min-h-11 items-center sm:min-h-0">{e.name}</span>}
          {/* The mention sits on the link's own line (audit 2026-10, n° 16). */}
          {e.affiliate && <>{' '}<span className="text-xs font-normal text-muted">· lien affilié</span></>}
        </p>
        <p className="text-xs text-muted">{TYPE_LABEL[e.type]}</p>
      </div>
      <p className="col-span-2 row-start-2 text-sm sm:col-span-1 sm:row-start-auto">
        <span className="sr-only">Statut MiCA :{' '}</span>{e.status}
      </p>
      <p className="col-start-2 row-start-1 text-right text-sm sm:col-start-auto sm:row-start-auto">
        <span className="text-muted sm:sr-only">France :{' '}</span>{e.franceOk}
      </p>
    </li>
  )
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
      fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

export default function MicaPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({
      '@type': 'Question', name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Crypto en règle : ce que MiCA change pour toi</h1>
        {/* A fixed, dated sentence: the countdown to 1 July ran three months past it
            (audit 2026-10, n° 57). */}
        <p className="mt-4 max-w-[68ch] text-muted leading-relaxed">
          En France, la période de transition du règlement européen MiCA a pris fin le 1er juillet 2026 :
          une plateforme sans agrément ne peut plus servir les résidents français. MiCA encadre les
          plateformes, pas l&apos;impôt. Je donne ici de quoi estimer l&apos;impôt sur une plus-value, ce que
          j&apos;ai relevé du statut des plateformes, et ce que je vérifie chaque année.
        </p>
      </header>

      <section aria-labelledby="mica-calcul" className={SECTION}>
        <h2 id="mica-calcul" className={H2}>Estimer l&apos;impôt sur une plus-value</h2>
        <p className="mt-2 mb-5 text-sm text-muted">
          Régime du particulier. Je compare la flat tax de{' '}<span className="tabular-nums">{FLAT}</span>{' '}à l&apos;option pour le barème, selon ta tranche.
        </p>
        <CryptoTaxCalculator />
      </section>

      <section aria-labelledby="mica-plateformes" className={SECTION}>
        <h2 id="mica-plateformes" className={H2}>Les plateformes et MiCA</h2>
        <p className="mt-2 mb-5 text-sm text-muted">
          Statuts relevés le{' '}<time dateTime={MICA_EXCHANGES_READ_ON}>{longDate(MICA_EXCHANGES_READ_ON)}</time>. Ils peuvent
          changer : je les vérifie sur le{' '}
          <a href={ESMA_REGISTER} target="_blank" rel="noopener noreferrer" className={linkClass('inline')}>registre MiCA de l&apos;ESMA</a>.
        </p>
        <div data-testid="mica-register">
          {/* Column heads for the eye: each cell says what it is to a screen reader. */}
          <div aria-hidden="true" className={`hidden border-y border-border py-2.5 text-xs text-muted sm:grid ${COLUMNS}`}>
            <span>Plateforme</span>
            <span>Statut MiCA</span>
            <span className="text-right">Sert la France</span>
          </div>
          <ul className="border-b border-border max-sm:border-t">
            {MICA_EXCHANGES.map(e => <ExchangeRow key={e.name} e={e} />)}
          </ul>
        </div>
        {/* Same disclosure as /start, and the same split. */}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Un lien affilié me rapporte une commission si tu ouvres un compte en passant par lui, sans
          surcoût pour toi. Les autres liens ne sont pas affiliés. Ça ne change pas les statuts relevés ici.
        </p>
      </section>

      <section aria-labelledby="mica-change" className={SECTION}>
        <h2 id="mica-change" className={H2}>Ce que MiCA change, et ce qu&apos;il ne change pas</h2>
        <dl className="mt-5 border-y border-border">
          {MICA_POINTS.map(([title, body]) => (
            <div key={title} className="grid gap-1 border-t border-border py-4 first:border-t-0 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-6">
              <dt className="font-semibold text-foreground">{title}</dt>
              <dd>{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="mica-verifie" className={SECTION}>
        <h2 id="mica-verifie" className={H2}>Ce que je vérifie chaque année</h2>
        <div className="mt-5">
          <ComplianceChecklist />
        </div>
      </section>

      <section aria-labelledby="mica-questions" className={SECTION}>
        <h2 id="mica-questions" className={H2}>Questions fréquentes</h2>
        <div className="mt-5 border-y border-border">
          {FAQ.map(f => (
            <details key={f.question} className="group border-t border-border first:border-t-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <span>{f.question}</span>
                <Chevron />
              </summary>
              <div className="pb-4">
                <p className="max-w-[68ch] leading-relaxed">{f.answer}</p>
                {f.readOn && (
                  <p className="mt-2 text-xs text-muted">
                    Relu le{' '}<time dateTime={f.readOn}>{longDate(f.readOn)}</time>.
                  </p>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      <p className={`${SECTION} text-muted`}>
        Pour ouvrir un compte pas à pas, avec les sources sur Binance :{' '}
        <Link href="/start" className={linkClass('inline')}>la page Démarrer</Link>.
      </p>
    </div>
  )
}
