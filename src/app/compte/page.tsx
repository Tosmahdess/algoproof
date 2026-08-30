import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { getEntitlement } from '@/lib/entitlement'
import { MagicLinkForm } from '@/components/MagicLinkForm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Mon compte' }

export default async function ComptePage() {
  const supabase = await createSupabaseAuthServer()
  const entitlement = await getEntitlement(supabase)

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Mon compte</h1>

      {entitlement === 'guest' && (
        <>
          <p className="text-sm text-muted mb-6">
            Je t&apos;envoie un lien de connexion par mail. Pas de mot de passe à retenir.
          </p>
          <MagicLinkForm redirectTo="/wealth" />
        </>
      )}

      {entitlement === 'free' && (
        <div className="space-y-4">
          <p className="text-sm">Tu es connecté, sans abonnement en cours.</p>
          <p className="text-sm text-muted">
            L&apos;abonnement ouvre les analyses complètes, sur tout l&apos;univers que je suis.
          </p>
          <a href="https://lab.algoproof.fr/membre" className="inline-block rounded-lg bg-positive px-4 py-2 text-sm font-semibold text-bg">
            Voir l&apos;abonnement
          </a>
        </div>
      )}

      {entitlement === 'paid' && (
        <div className="space-y-4">
          <p className="text-sm text-positive">Abonnement actif. Tout est ouvert.</p>
          <a href="/wealth" className="text-sm text-accent">Aller aux analyses</a>
        </div>
      )}
    </div>
  )
}
