import { linkClass } from '@/lib/link-roles'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { getEntitlement } from '@/lib/entitlement'
import { MagicLinkForm } from '@/components/MagicLinkForm'
import { labUrl } from '@/lib/lab-links'
import { safeNext } from '@/lib/safe-redirect'
import { redirect } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Mon compte' }

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // The favorite star sends a guest here with ?next=<the bot page> so the
  // magic link brings them back to it (espace-direct lot A). Relative paths
  // only: safeNext turns anything else into the old landing page.
  const rawNext = (await searchParams).next
  const next = safeNext(typeof rawNext === 'string' ? rawNext : null, '/investir')
  const supabase = await createSupabaseAuthServer()
  const entitlement = await getEntitlement(supabase)
  // Already signed in (the star saw an expired token, the session has been
  // refreshed since): straight back to the page the reader came from.
  if (entitlement !== 'guest' && typeof rawNext === 'string') redirect(next)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Mon compte</h1>

      {entitlement === 'guest' && (
        <>
          <p className="text-sm text-muted mb-6">
            Je t&apos;envoie un lien de connexion par mail. Pas de mot de passe à retenir.
          </p>
          {/* /wealth only redirects to /investir (next.config.ts): the sign-in
              lands on the page itself. auth/callback's safeNext accepts it. */}
          <MagicLinkForm redirectTo={next} />
        </>
      )}

      {entitlement === 'free' && (
        <div className="space-y-4">
          <p className="text-sm">Tu es connecté, sans abonnement en cours.</p>
          {/* Cette ligne promettait l'accès à « cette page », sur laquelle le
              lecteur est déjà, connecté et sans abonnement. Ce que l'adhésion
              ouvre sur ce site, ce sont les deux paragraphes des fiches société
              (la route /api/investir/[slug]/recit ne les sert qu'à `paid`).
              Même phrase que /preuve, la FAQ et RecitInvestir (audit 2026-09-09). */}
          <p className="text-sm text-muted">
            L&apos;adhésion au labo ouvre les quotas de backtest et les dossiers de validation
            complets. Sur ce site, elle donne aussi accès à deux paragraphes d&apos;analyse par
            société : ce que ses chiffres veulent dire pour son métier, et ce qui peut mal tourner.
          </p>
          <a href={labUrl('https://lab.algoproof.fr/membre', 'compte')} className="inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-bg">
            Voir l&apos;abonnement
          </a>
        </div>
      )}

      {entitlement === 'paid' && (
        <div className="space-y-4">
          <p className="text-sm text-foreground">Abonnement actif. Tout est ouvert.</p>
          <a href="/investir" className={linkClass('inline', 'text-sm')}>Aller aux analyses</a>
        </div>
      )}
    </div>
  )
}
