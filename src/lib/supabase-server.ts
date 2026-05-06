// Server-only Supabase client — never imported in 'use client' files.
// Uses non-public env vars so credentials are never embedded in the browser bundle.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_ANON_KEY!

export const supabaseServer = createClient(url, key)
