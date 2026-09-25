// The instant paint for « La flotte ». /overview reads searchParams, so it is a
// dynamic route: without this shell a click produced no paint at all until the
// server finished (3.9 to 6.7 s measured in production on 2026-09-23).
//
// It mirrors page.tsx's own shell (same <main> classes, same h1, same rhythm)
// so nothing moves under the reader when the content streams in. Lot 4 of the
// design audit (2026-09-25): two totals, three real-money cards, one register.
// The heights are those of the mock-up's blocks at 1280 px; the number of cards
// depends on the live fleet (three today) and drifts with it.
function Bar({ className }: { className: string }) {
  return <div className={`rounded-lg bg-border/60 ${className}`} />
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12" aria-busy="true">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">La flotte</h1>
        <p className="text-sm sm:text-base text-muted mt-2 max-w-[60ch]">
          Ce qui tourne, avec quel argent, et ce que ça donne.
        </p>
      </header>

      <div role="status" aria-label="Chargement de la flotte" className="animate-pulse space-y-10">
        {/* Les deux totaux */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Bar className="h-[104px]" />
          <Bar className="h-[104px]" />
        </div>

        {/* Argent réel : trois cartes */}
        <div>
          <Bar className="h-4 w-28 mb-3" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Bar className="h-[236px]" />
            <Bar className="h-[236px]" />
            <Bar className="h-[236px]" />
          </div>
        </div>

        {/* Le registre : une ligne par bot */}
        <div className="space-y-4">
          <Bar className="h-4 w-40" />
          <div className="rounded-lg border border-border divide-y divide-border">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} data-testid="fleet-skeleton-row" className="flex items-center gap-4 px-4 py-3">
                <Bar className="h-3 flex-1" />
                <Bar className="h-3 w-16 hidden lg:block" />
                <Bar className="h-3 w-16 hidden lg:block" />
                <Bar className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
