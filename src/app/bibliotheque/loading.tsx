// The instant paint for the library. /bibliotheque reads searchParams, so it is a
// dynamic route: without this shell a click painted nothing until the server
// answered (the fleet measured 3.9 to 6.7 s, 2026-09-23). It mirrors page.tsx (same
// wrapper, same h1 and lead, the counts between rules, then the register's rows) so
// nothing moves under the reader when the content streams in.
//
// It also stands in while an idea page (/bibliotheque/[idee]) renders on demand; that
// page has its own loading.tsx, closer, which wins.
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-card-2 ${className}`} />
}

function Row() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border py-4 md:grid-cols-[minmax(0,1fr)_32%_6rem_6rem] md:gap-x-4">
      <div className="col-span-2 md:col-span-1">
        <Bar className="h-4 w-48 max-w-full" />
        <Bar className="mt-2 h-3 w-32" />
      </div>
      <div className="md:flex md:flex-col md:items-end"><Bar className="h-5 w-10" /><Bar className="mt-2 h-3 w-36 max-w-full" /></div>
      <div className="md:flex md:justify-end"><Bar className="h-5 w-10" /></div>
      <div className="hidden md:flex md:justify-end"><Bar className="h-5 w-10" /></div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-12 pb-16" aria-busy="true">
      <header className="mb-8 sm:mb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">La bibliothèque des stratégies</h1>
        <p className="mt-3 max-w-[64ch] text-base text-muted sm:text-lg">
          Chaque variante que mon moteur a trouvée et qui a passé mes épreuves de backtest est ici,
          lancée ou pas encore. Je les range par idée : une stratégie sur un horizon, avec toutes ses
          variantes derrière.
        </p>
        <Bar className="mt-3 h-4 w-full max-w-[60ch]" />
      </header>

      <div role="status" aria-label="Chargement de la bibliothèque" className="animate-pulse motion-reduce:animate-none">
        <div className="mb-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-5 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i}><Bar className="h-7 w-20" /><Bar className="mt-2 h-4 w-24" /><Bar className="mt-2 h-3 w-36 max-w-full" /></div>
          ))}
        </div>
        <div className="border-t border-border pt-9">
          <Bar className="h-7 w-56 max-w-full" />
          <Bar className="mt-3 h-3 w-full max-w-[60ch]" />
          <Bar className="mt-8 h-11 w-full max-w-md" />
          <div className="mt-4 border-b border-border py-3 lg:hidden"><Bar className="h-6 w-20" /></div>
          <div className="mt-4 hidden border-b border-border pb-3 lg:block">
            <div className="grid max-w-4xl grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-11" />)}
            </div>
          </div>
          <Bar className="mt-6 h-4 w-72 max-w-full" />
          {Array.from({ length: 8 }, (_, i) => <Row key={i} />)}
        </div>
      </div>
    </div>
  )
}
