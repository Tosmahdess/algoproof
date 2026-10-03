// The one framed panel of a company fiche (refonte « Le registre des
// décisions », pages Sociétés, 2026-10-03; audit 2026-10, n° 53). It sits right
// under the title, never folded, and holds what the reading found: how many
// controls were read, and the seven, each with its state (alerte, sans alerte,
// non lu) and the engine's sentence for it.
//
// What it never is: a stamp or a grade. No state has a status colour, the
// title is the same on every fiche, and the panel keeps the neutral rule
// whatever it counts. A state is told by its word and by a drawn mark that also
// reads in black and white: a full disc for an alert, a ring for a control read
// without one, a dashed ring for a control not read (the regime badge's
// grammar: plain, dashed).
import { ETAT_LIBELLE, type EtatControle, type LectureControle } from '@/lib/investir-controles'

function MarqueEtat({ etat }: { etat: EtatControle }) {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
      {etat === 'alerte' ? (
        <circle cx="6" cy="6" r="5" fill="currentColor" />
      ) : (
        <circle
          cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeDasharray={etat === 'non-lu' ? '2.2 2' : undefined}
        />
      )}
    </svg>
  )
}

export default function ConstatsLecture({ resume, controles, reserve = null, className = '' }: {
  /** The engine's sentence, « 5 alertes sur 7 contrôles lus. » */
  resume: string
  controles: LectureControle[]
  /** The engine's reserve: a more recent annual report it could not read. */
  reserve?: string | null
  className?: string
}) {
  return (
    <section
      data-testid="constats"
      aria-labelledby="constats-titre"
      className={`rounded-lg border border-border bg-card p-4 sm:px-6 sm:py-5 ${className}`}
    >
      <h2 id="constats-titre" className="text-2xl font-semibold leading-tight">Constats de lecture</h2>
      <p data-testid="constats-resume" className="mt-1.5 text-base">{resume}</p>
      {/* The reserve before the list and the figures, not under the balance
          sheet: it is the only place a reader learns these are not the latest
          accounts the company published. */}
      {reserve && (
        <p role="note" className="mt-3 max-w-[68ch] text-sm">
          <strong className="font-semibold">Réserve :</strong>{' '}{reserve}
        </p>
      )}

      <div aria-hidden="true" className="mt-4 hidden md:grid md:grid-cols-[minmax(0,15rem)_8.5rem_minmax(0,1fr)] md:gap-x-6 border-b border-border pb-2 text-xs text-muted">
        <span>Contrôle</span>
        <span>État</span>
        <span>Ce que j’ai relevé</span>
      </div>
      <ol aria-label="Les sept contrôles et leur état" className="mt-4 border-t border-border md:mt-0 md:border-t-0">
        {controles.map(c => (
          <li
            key={c.cle}
            data-etat={c.etat}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0 last:pb-0
                       md:grid-cols-[minmax(0,15rem)_8.5rem_minmax(0,1fr)] md:gap-x-6"
          >
            <div className="min-w-0">
              <p className="font-semibold">{c.nom}</p>
              <p className="text-xs text-muted">{c.regle}</p>
            </div>
            <p className={`flex items-center gap-2 self-start text-sm ${c.etat === 'alerte' ? 'font-semibold text-foreground' : 'text-muted'}`}>
              <MarqueEtat etat={c.etat} />
              {ETAT_LIBELLE[c.etat]}
            </p>
            {c.fait && (
              <p className={`col-span-2 md:col-span-1 text-sm ${c.etat === 'non-lu' ? 'text-muted' : ''}`}>{c.fait}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
