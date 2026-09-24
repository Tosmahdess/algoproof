// tests/lib/recipe-leak-guard.test.ts
//
// The fiche is static and the repo is public: a wave recipe may only travel
// through /api/bot/[slug]/recipe, after the entitlement check. The page and
// the client component must never import a privileged client or name the table.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf-8')

describe('recipe leak guard', () => {
  it('the fiche page never reads the recipe table itself', () => {
    const src = read('src/app/strategies/bot/[slug]/page.tsx')
    expect(src).not.toMatch(/supabase-privileged|bot_recipes/)
  })

  it('the gate component is a client component with no database access', () => {
    const src = read('src/components/RecipeGate.tsx')
    expect(src.trimStart().startsWith("'use client'")).toBe(true)
    expect(src).not.toMatch(/@\/lib\/supabase|bot_recipes/)
    expect(src).toMatch(/\/api\/bot\//)
  })

  it('only the route reads bot_recipes, and only through the privileged client', () => {
    const src = read('src/app/api/bot/[slug]/recipe/route.ts')
    expect(src).toMatch(/supabasePrivileged/)
    expect(src).not.toMatch(/@\/lib\/supabase-server/)
    // That the read happens only after a 'paid' verdict is pinned by behaviour
    // in tests/app/bot-recipe-route.test.ts (guest and free trigger no read).
  })
})
