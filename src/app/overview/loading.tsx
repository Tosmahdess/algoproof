// The instant paint for « La flotte ».
//
// /overview reads searchParams, so it is a dynamic route: without this file
// Next has no shell to prefetch and a click produced NO paint at all until the
// server finished. Measured in production on 2026-09-23, that was 3.9-6.7 s of
// dead page — long enough that visitors clicked the link again, which is the
// symptom that put this on the list.
//
// It deliberately mirrors `page.tsx`'s own shell (same <main> classes, same h1,
// same rhythm) rather than being a centred spinner: the title and the frame are
// known before the data is, so rendering them here means nothing moves under
// the reader when the real content streams in.
//
// THE HEIGHTS ARE MEASURED, NOT GUESSED, and that is the whole point of the
// second pass on this file. The first version reserved 64 px where the market
// banner is 141, ~156 where « Argent réel » is 488, and 96 where the balance
// sheet is 449 — about 760 px short in total, so the page lurched downwards the
// moment the content replaced it. Chrome scored that CLS 0.17, "needs
// improvement", on an element above the fold. A shell that is the wrong height
// trades a blank screen for a jump, which is not obviously a better deal.
//
// The one thing here that depends on DATA is the number of real-money cards:
// three today, at 220 px each, which lands on 488 px both in the two-column
// desktop grid and stacked on a phone. Change the live fleet and this drifts.
//
// It does NOT cost the page its indexability: loading.tsx is a streaming
// fallback, and the finished document still carries the register. The served
// DOM is checked for its /strategies/bot/ links after every change to this
// route, because this page's whole point is being crawled (FAQ JSON-LD, the
// per-bot links) and a fallback that replaced them has happened here before.
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-border/60 ${className}`} />
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12" aria-busy="true">
      <h1 className="text-3xl font-semibold tracking-tight mb-3">La flotte</h1>
      <p className="text-sm text-muted max-w-2xl mb-8">
        Ce qui tourne en ce moment, avec quel argent, et ce que ça donne au total.
      </p>

      <div role="status" aria-label="Chargement de la flotte" className="animate-pulse space-y-12">
        {/* La météo du marché : 141 px mesurés */}
        <Bar className="h-[141px] w-full" />

        {/* Argent réel : 488 px mesurés — trois cartes de 220 */}
        <div className="space-y-4">
          <Bar className="h-3 w-28" />
          <div className="grid gap-4 md:grid-cols-2">
            <Bar className="h-[220px]" />
            <Bar className="h-[220px]" />
            <Bar className="h-[220px]" />
          </div>
        </div>

        {/* Le bilan : 449 px mesurés */}
        <Bar className="h-[449px] w-full" />

        {/* Le registre : une ligne par stratégie */}
        <div className="space-y-4">
          <Bar className="h-3 w-40" />
          <div className="rounded border border-border divide-y divide-border">
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
