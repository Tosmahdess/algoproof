import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-5xl text-muted">404</p>
      <h1 className="text-xl font-semibold">Cette page n&apos;existe pas</h1>
      <p className="text-sm text-muted max-w-md">
        Le lien est peut-être périmé, ou la page a changé d&apos;adresse.
        Tout ce qui est publié reste accessible depuis l&apos;accueil.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-accent hover:underline">Accueil</Link>
        {/* FIX (final whole-branch review, I2): this pointed at /strategies,
            which is now 22 pedagogical concept pages with no trades on them.
            A visitor arriving from a dead bot URL wants the bots. Labelled
            « La flotte », the same name /overview carries in the nav and the
            footer. */}
        <Link href="/overview" className="text-accent hover:underline">La flotte</Link>
        <Link href="/blog" className="text-accent hover:underline">Apprendre</Link>
      </div>
    </main>
  )
}
