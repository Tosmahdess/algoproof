import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_COMMENTS_CHAT_ID

async function notifyTelegram(bot_slug: string, pseudo: string, message: string) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return
  // Plain text, no parse_mode: user-controlled pseudo/message must never be parsed as
  // Telegram Markdown, or a comment like [x](https://evil) injects a live link / breaks
  // the message in the operator chat.
  const text = `💬 Nouveau message AlgoProof\n\nBot : ${bot_slug}\nPseudo : ${pseudo}\n\n${message}`
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(() => {})
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json([])

  const { data, error } = await supabaseServer
    .from('comments')
    .select('id, pseudo, message, created_at')
    .eq('bot_slug', slug)
    .eq('hidden', false)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  let body: { bot_slug?: string; pseudo?: string; message?: string; website?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: bots fill hidden fields. Pretend success, store nothing (mirror /api/subscribe).
  if (body.website) return NextResponse.json({ ok: true }, { status: 201 })

  const { bot_slug, pseudo, message } = body
  if (!bot_slug || !pseudo?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (pseudo.trim().length > 50 || message.trim().length > 1000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('comments')
    .insert({ bot_slug, pseudo: pseudo.trim(), message: message.trim() })

  if (error) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  notifyTelegram(bot_slug, pseudo.trim(), message.trim())

  return NextResponse.json({ ok: true }, { status: 201 })
}
