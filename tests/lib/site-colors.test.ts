// tests/lib/site-colors.test.ts
//
// SITE_COLORS writes the DESIGN.md tokens out for the embed and the Satori images,
// which have no Tailwind. Each value must be the config's.
import { describe, it, expect } from 'vitest'
import tailwindConfig from '../../tailwind.config'
import { SITE_COLORS } from '@/lib/site-colors'

const T = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<string, string>
const TOKEN: Record<keyof typeof SITE_COLORS, string> = {
  bg: 'bg', card: 'card', border: 'border', borderStrong: 'border-strong', text: 'foreground',
  muted: 'muted', accent: 'accent', neg: 'negative', brand: 'brand',
}

describe('SITE_COLORS mirrors tailwind.config.ts', () => {
  it.each(Object.entries(TOKEN))('%s is the « %s » token', (key, token) => {
    expect(SITE_COLORS[key as keyof typeof SITE_COLORS].toLowerCase()).toBe(T[token].toLowerCase())
  })
})
