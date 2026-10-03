// The instant paint for « La flotte ». /overview reads searchParams, so it is a
// dynamic route: without this shell a click produced no paint at all until the
// server finished (3.9 to 6.7 s measured in production on 2026-09-23).
//
// It mirrors page.tsx's own shell (same wrapper classes, same h1, same rhythm;
// the one <main> is the layout's) so nothing moves under the reader when the
// content streams in. Refonte « registre », lot 4 (2026-10-02): the two totals
// between rules, then ONE ledger, its rows in the three columns of the page
// (« Bot et marché », « État et décision », « Résultat depuis le départ »).
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-card-2 ${className}`} />
}

function Row() {
  return (
    <div data-testid="fleet-skeleton-row"
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-b border-border py-5 md:grid-cols-[42fr_33fr_25fr] md:gap-x-6">
      <div className="col-span-2 md:col-span-1">
        <Bar className="h-4 w-3/4" />
        <Bar className="mt-2 h-3 w-1/2" />
      </div>
      <div>
        <Bar className="h-5 w-24" />
        <Bar className="mt-2 h-3 w-36 max-w-full" />
      </div>
      <div className="flex flex-col items-end">
        <Bar className="h-5 w-24" />
        <Bar className="mt-2 h-3 w-16" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12" aria-busy="true">
      <header className="mb-8 sm:mb-10">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">La flotte</h1>
        <p className="text-base sm:text-lg text-muted mt-3 max-w-[60ch]">
          Ce qui tourne, avec quel argent, et ce que ça donne.
        </p>
      </header>

      <div role="status" aria-label="Chargement de la flotte" className="animate-pulse motion-reduce:animate-none space-y-10">
        {/* Les deux totaux, entre deux filets */}
        <div>
          <div className="grid grid-cols-2 border-y border-border">
            <div className="py-4 pr-4 sm:py-5 sm:pr-6">
              <Bar className="h-4 w-24" />
              <Bar className="mt-3 h-8 w-32 max-w-full sm:h-10" />
              <Bar className="mt-2 h-3 w-28 max-w-full" />
            </div>
            <div className="border-l border-border py-4 pl-4 sm:py-5 sm:pl-6">
              <Bar className="h-4 w-24" />
              <Bar className="mt-3 h-8 w-32 max-w-full sm:h-10" />
              <Bar className="mt-2 h-3 w-28 max-w-full" />
            </div>
          </div>
          <Bar className="mt-3 h-3 w-72 max-w-full" />
        </div>

        {/* La liste : titre, deux lignes, filtres, puis les lignes du registre */}
        <div className="border-t border-border pt-9">
          <Bar className="h-7 w-48" />
          <Bar className="mt-3 h-3 w-full max-w-[60ch]" />
          <Bar className="mt-2 h-3 w-2/3 max-w-[50ch]" />
          {/* Sur téléphone, la barre de filtres tient sur une ligne « Filtres ». */}
          <div className="mt-8 border-b border-border py-3 lg:hidden"><Bar className="h-6 w-20" /></div>
          <div className="mt-8 hidden border-b border-border pb-3 lg:block">
            <div className="grid max-w-4xl grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-10" />)}
            </div>
          </div>
          <div className="mt-6 hidden border-b border-border pb-2.5 md:grid md:grid-cols-[42fr_33fr_25fr] md:gap-x-6">
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-24" />
            <Bar className="h-3 w-32 justify-self-end" />
          </div>
          {Array.from({ length: 8 }, (_, i) => <Row key={i} />)}
        </div>
      </div>
    </div>
  )
}
