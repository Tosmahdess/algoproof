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
        <Link href="/strategies" className="text-accent hover:underline">Mes bots</Link>
        <Link href="/blog" className="text-accent hover:underline">Apprendre</Link>
      </div>
    </main>
  )
}
