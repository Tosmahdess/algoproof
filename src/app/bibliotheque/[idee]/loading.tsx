// The instant paint of an idea page while it renders on demand (dynamicParams): the
// way back, the title's place, the explanation beside the sketch, the counts, then the
// register's rows. Without it the index's own shell (../loading.tsx) would stand in.
function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-card-2 ${className}`} />
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8 pb-16" aria-busy="true">
      <div role="status" aria-label="Chargement de l’idée" className="animate-pulse motion-reduce:animate-none">
        <Bar className="mt-3 h-4 w-64 max-w-full" />
        <Bar className="mt-6 h-4 w-48" />
        <Bar className="mt-3 h-9 w-72 max-w-full" />
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-10">
          <div><Bar className="h-4 w-full" /><Bar className="mt-2 h-4 w-5/6" /><Bar className="mt-2 h-4 w-2/3" /></div>
          <Bar className="h-28" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border py-5 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i}><Bar className="h-7 w-16" /><Bar className="mt-2 h-4 w-28" /></div>)}
        </div>
        <div className="mt-10 border-t border-border pt-9">
          <Bar className="h-7 w-48" />
          <Bar className="mt-3 h-3 w-full max-w-[70ch]" />
          <Bar className="mt-2 h-3 w-2/3 max-w-[50ch]" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-4 border-b border-border py-4 md:grid-cols-[minmax(0,1fr)_10rem_8rem_10rem_8rem]">
              <div className="col-span-2 md:col-span-1"><Bar className="h-4 w-16" /><Bar className="mt-2 h-3 w-64 max-w-full" /></div>
              <Bar className="h-4 w-24" />
              <Bar className="h-4 w-16 md:justify-self-end" />
              <Bar className="h-4 w-20 md:justify-self-end" />
              <Bar className="hidden h-4 w-24 md:block md:justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
