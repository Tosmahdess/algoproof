import { NextResponse } from 'next/server'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { supabasePrivileged } from '@/lib/supabase-privileged'

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
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const entitlement = await getEntitlement(await createSupabaseAuthServer())
  if (entitlement !== 'paid') {
    return NextResponse.json({ entitlement }, { status: 200 })
  }

  const client = supabasePrivileged()
  if (!client) {
    // La clé de service manque sur l'hébergeur. Le membre ne voit rien, et le
    // log dit pourquoi — plutôt qu'un texte vide sans explication.
    console.error('[investir] SUPABASE_SERVICE_ROLE_KEY absente : récit non servi')
    return NextResponse.json({ entitlement, indisponible: true }, { status: 200 })
  }

  const { data, error } = await client
    .from('investir_recits')
    .select('lecture,risques')
    .eq('slug', slug)
    .limit(1)

  if (error || !data || data.length === 0) {
    return NextResponse.json({ entitlement, blocs: {} }, { status: 200 })
  }
  return NextResponse.json({ entitlement, blocs: data[0] }, { status: 200 })
}
