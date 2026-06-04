'use client'
import { useEffect, useState } from 'react'

const MICA_DATE = new Date('2026-07-01T00:00:00Z')

export default function MicaCountdown() {
  const [days, setDays] = useState<number | null>(null)
  useEffect(() => {
    const ms = MICA_DATE.getTime() - Date.now()
    setDays(Math.ceil(ms / 86_400_000))
  }, [])
  if (days === null) return <span>application le 1er juillet 2026</span>
  if (days > 0) return <span>dans {days} jour{days > 1 ? 's' : ''} — le 1er juillet 2026</span>
  return <span>en vigueur depuis le 1er juillet 2026</span>
}
