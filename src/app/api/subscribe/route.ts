import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { normalizeEmail, normalizeSource } from '@/lib/subscribe'

export const runtime = 'nodejs'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_COMMENTS_CHAT_ID

// lab.algoproof.fr posts to this route cross-origin (single shared list).
const ALLOWED_ORIGINS = ['https://lab.algoproof.fr', 'https://algoproof.fr']

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

async function notifyTelegram(email: string, source: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return
  const text = `📬 *Nouvel inscrit email AlgoProof*\n\n${email}\n_source : ${source}_`
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
  }).catch(() => {})
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)

  let body: { email?: string; source?: string; website?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  // Honeypot: bots fill every field. Pretend success, store nothing.
  if (body.website) return NextResponse.json({ ok: true }, { status: 201, headers })

  const email = normalizeEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400, headers })
  }
  const source = normalizeSource(body.source)

  const { error } = await supabaseServer
    .from('email_subscribers')
    .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500, headers })

  notifyTelegram(email, source)

  return NextResponse.json({ ok: true }, { status: 201, headers })
}
