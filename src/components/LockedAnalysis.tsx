import Link from 'next/link'

/** What replaces the four analysis sections when the visitor is not entitled.
 *  It names what is missing rather than teasing it: the reader should be able
 *  to tell what they would get.
 *
 *  `verdictVisible` says whether this same visitor already sees the verdict
 *  and its reason above this block (true on a free-five ticker, false on a
 *  locked one) so the copy stays true in both cases. */
export function LockedAnalysis({ assetName, verdictVisible }: { assetName: string; verdictVisible: boolean }) {
  return (
    <div className="mt-10 rounded-lg border border-border bg-card/40 p-6">
      <p className="text-sm font-semibold mb-3">
        L&apos;analyse complète de {assetName} est réservée aux membres
      </p>
      <ul className="text-sm text-muted space-y-1 mb-5">
        <li>Fondamentaux, valorisation, momentum et risques, en détail</li>
        <li>Le même niveau de détail sur tout l&apos;univers que je suis</li>
      </ul>
      <p className="text-xs text-muted mb-5">
        Cinq sociétés restent ouvertes en permanence, choisies par la même règle que le reste.
        {verdictVisible
          ? ' Au-dessus, tu vois déjà mon verdict et sa raison en une ligne.'
          : ' Le verdict de ce titre est lui aussi réservé aux membres.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://lab.algoproof.fr/membre"
          className="rounded-lg bg-positive px-4 py-2 text-sm font-semibold text-bg hover:bg-positive/90"
        >
          Voir l&apos;abonnement
        </a>
        <Link href="/compte" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card/60">
          J&apos;ai déjà un compte
        </Link>
      </div>
    </div>
  )
}
