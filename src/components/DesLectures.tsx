// « Des lectures, pas des conseils », under the title of /investir and of every
// company fiche (audit 2026-10, n° 52: the sentence the site promised was on
// no page, and the fiches' warning sat at their foot). One copy, so the index
// and the fiches say it word for word the same. Not folded, not small: it is
// read before the figures, not after them.
//
// `horsPerimetre`: a company whose accounts I do not read. Its analysis was
// written from market data, so « je relève ce que disent les comptes » and « je
// ne lis aucun cours » would both be false there; the promise that stays is the
// one about advice.
export function DesLectures({ className = '', horsPerimetre = false }: { className?: string; horsPerimetre?: boolean }) {
  return (
    <p data-testid="des-lectures" className={`max-w-[68ch] text-base ${className}`}>
      <strong className="font-semibold">Des lectures, pas des conseils.</strong>{' '}
      <span className="text-muted">
        {horsPerimetre
          ? 'Rien ici ne dit si un titre est cher, ni s’il faut l’acheter.'
          : 'Je relève ce que disent les comptes. Je ne lis aucun cours de bourse : rien ici ne dit si un titre est cher, ni s’il faut l’acheter.'}
      </span>
    </p>
  )
}
