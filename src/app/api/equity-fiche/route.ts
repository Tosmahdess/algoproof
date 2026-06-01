import { NextResponse } from 'next/server'
import { getCoveredFiches } from '@/lib/equity'

export const runtime = 'nodejs'
export const revalidate = 600

export async function GET() {
  const list = await getCoveredFiches()
  return NextResponse.json(list)
}
