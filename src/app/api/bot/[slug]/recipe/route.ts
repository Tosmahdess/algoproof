import { NextResponse } from 'next/server'
import { getEntitlement } from '@/lib/entitlement'
import { createSupabaseAuthServer } from '@/lib/supabase-auth'
import { supabasePrivileged } from '@/lib/supabase-privileged'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The exact recipe of a wave bot: what the labo membership sells.
 *
 * Same shape as /api/investir/[slug]/recit. The fiche is static (ISR) and its
 * HTML is the same for everyone, so it cannot carry a paywall: the recipe
 * travels only through here, after getEntitlement has read the subscription.
 * A visitor who does not pay triggers no read at all.
 *
 * bot_recipes has NO read policy: neither anon nor authenticated reach it.
 * Only the service key, which never leaves the server, reads it. No answer is
 * cacheable: a member's response kept by a CDN would be served to the next
 * visitor.
 */
const NO_CACHE = { 'Cache-Control': 'private, no-store' }

async function readRecipe(slug: string) {
  const client = supabasePrivileged()
  if (!client) {
    console.error('[bot-recipe] SUPABASE_SERVICE_ROLE_KEY missing: recipe not served')
    return { indisponible: true as const }
  }
  try {
    const { data, error } = await client
      .from('bot_recipes')
      .select('recipe')
      .eq('slug', slug)
      .limit(1)
    if (error) {
      console.error('[bot-recipe] read failed:', error)
      return {}
    }
    if (!data || data.length === 0) return {}
    return { recipe: (data[0] as { recipe: unknown }).recipe }
  } catch (e) {
    console.error('[bot-recipe] read threw:', e)
    return {}
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const entitlement = await getEntitlement(await createSupabaseAuthServer())
  if (entitlement !== 'paid') {
    return NextResponse.json({ entitlement }, { status: 200, headers: NO_CACHE })
  }
  return NextResponse.json(
    { entitlement, ...(await readRecipe(slug)) },
    { status: 200, headers: NO_CACHE },
  )
}
