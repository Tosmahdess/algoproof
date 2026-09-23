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
        {/* Le bandeau d'entonnoir */}
        <Bar className="h-16 w-full" />

        {/* Argent réel : deux cartes */}
        <div className="space-y-4">
          <Bar className="h-3 w-28" />
          <div className="grid gap-4 md:grid-cols-2">
            <Bar className="h-32" />
            <Bar className="h-32" />
          </div>
        </div>

        {/* Le bilan */}
        <Bar className="h-24 w-full" />

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
