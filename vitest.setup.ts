// vitest.setup.ts
import '@testing-library/jest-dom'

// Vitest does not load .env.local into process.env the way `next dev`/`next build` do.
// src/lib/supabase.ts calls createClient(url, key) at module load time and throws if
// either is empty, which crashes ANY test file that imports a lib module transitively
// pulling in the real supabase client (e.g. src/lib/screening.ts) — even tests that never
// call a query function and never mock supabase. These are placeholder values, never used
// for a real network call in unit tests; they only satisfy supabase-js's constructor guard.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://placeholder.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'placeholder-anon-key'
