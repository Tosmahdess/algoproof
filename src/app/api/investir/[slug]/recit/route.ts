import { NextResponse } from 'next/server'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { supabasePrivileged } from '@/lib/supabase-privileged'
import horsPerimetreBrut from '@/data/investir-hors-perimetre.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Le récit d'une fiche Investir : la partie que l'abonnement vend.
 *
 * POURQUOI UNE ROUTE ET PAS LA PAGE. Les 1 408 pages sont générées
 * statiquement, ce qui les rend rapides et référençables — et interdit tout
 * paywall : leur HTML est le même pour tout le monde. Le gratuit reste donc
 * statique, et seul le récit passe par ici, rendu à la requête, après que
 * `getEntitlement` a lu l'abonnement.
 *
 * LA PORTE EST LA REQUÊTE, PAS LE COMPOSANT. Un visiteur sans abonnement ne
 * reçoit rien : la lecture de Supabase n'a pas lieu. Rendre le texte puis le
 * masquer le livrerait quand même dans la charge servie au navigateur, ce que
 * ce dépôt a déjà appris à ses dépens sur les fiches payantes de /wealth.
 *
 * La table n'a AUCUNE policy de lecture : ni `anon` ni `authenticated` n'y
 * accèdent, quelle que soit la requête. Seule la clé de service, qui ne quitte
 * jamais le serveur, la lit — et seulement après le verdict ci-dessous.
 *
 * AUCUNE RÉPONSE N'EST MISE EN CACHE. Elles dépendent toutes de la session
 * (sauf la branche hors périmètre), et une réponse membre qu'un CDN garderait
 * serait servie au visiteur suivant : `private, no-store` sur chacune.
 */
const SANS_CACHE = { 'Cache-Control': 'private, no-store' }

/**
 * Les sociétés que la règle ne note pas, lues depuis le JSON du dépôt, jamais
 * depuis la requête : c'est cette liste, et elle seule, qui ouvre la lecture.
 *
 * DÉCISION USER DU 11/09/2026, TEMPORAIRE (« le temps de trouver une
 * solution »). Ces 27 fiches vendaient « deux paragraphes » alors qu'elles
 * n'ont au mieux que `risques` en table. Tant qu'aucune offre n'existe pour
 * elles, ce qu'elles ont est servi à tout le monde. À retirer avec la solution.
 */
const HORS_PERIMETRE: ReadonlySet<string> = new Set(
  (horsPerimetreBrut as { fiches: { slug: string }[] }).fiches.map(f => f.slug),
)

async function lireBlocs(slug: string) {
  const client = supabasePrivileged()
  if (!client) {
    // La clé de service manque sur l'hébergeur. Le lecteur ne voit rien, et le
    // log dit pourquoi — plutôt qu'un texte vide sans explication.
    console.error('[investir] SUPABASE_SERVICE_ROLE_KEY absente : récit non servi')
    return { indisponible: true as const }
  }
  const { data, error } = await client
    .from('investir_recits')
    .select('lecture,risques')
    .eq('slug', slug)
    .limit(1)
  if (error || !data || data.length === 0) return { blocs: {} }
  return { blocs: data[0] }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  if (HORS_PERIMETRE.has(slug)) {
    // Même lecture privilégiée que le chemin membre, sans regarder l'abonnement.
    return NextResponse.json(
      { horsPerimetre: true, ...(await lireBlocs(slug)) },
      { status: 200, headers: SANS_CACHE },
    )
  }

  const entitlement = await getEntitlement(await createSupabaseAuthServer())
  if (entitlement !== 'paid') {
    return NextResponse.json({ entitlement }, { status: 200, headers: SANS_CACHE })
  }
  return NextResponse.json(
    { entitlement, ...(await lireBlocs(slug)) },
    { status: 200, headers: SANS_CACHE },
  )
}
