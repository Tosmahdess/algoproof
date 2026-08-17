import { describe, it, expect } from 'vitest'
import { BOT_PARAMS } from '@/lib/bot-params'

// A published performance figure must describe the parameters the bot is
// actually running. The gold bot's figure came from a run at SL 1.5xATR /
// TP 3xATR (Wilder-EWM ATR) while the deployed bot runs SL 2xATR / TP 4xATR
// (rolling-mean ATR), measured on the VPS on 2026-08-17. Until it is
// requalified, its fiche must carry no performance figure at all.
function allText(slug: string): string {
  const entry = BOT_PARAMS[slug]
  if (!entry) throw new Error(`no BOT_PARAMS entry for ${slug}`)
  return JSON.stringify(entry)
}

describe('gold bot fiche carries no unbacked performance figure', () => {
  it('still describes the strategy at all', () => {
    // Guard: every not.toMatch below passes vacuously on an emptied entry, so
    // pin the copy that must survive the removal of the figure.
    const text = allText('keltner-xau-hl')
    expect(text).toMatch(/Keltner/)
    expect(text).toMatch(/XAU/)
  })

  it('mentions no profit factor, trade count or Sharpe', () => {
    const text = allText('keltner-xau-hl')
    expect(text).not.toMatch(/Profit Factor/i)
    expect(text).not.toMatch(/Sharpe/i)
    expect(text).not.toMatch(/1[.,]31/)
    expect(text).not.toMatch(/1[.,]94/)
    expect(text).not.toMatch(/262\s*trades/i)
  })

  it('says instead that the bot is not qualified yet', () => {
    expect(allText('keltner-xau-hl')).toMatch(/pas encore qualifi/i)
  })
})
