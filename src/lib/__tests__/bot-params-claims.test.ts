import { describe, it, expect } from 'vitest'
import { BOT_PARAMS } from '@/lib/bot-params'
import { getStrategyFiche } from '@/lib/strategy-library'

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

// vps_sync.py publishes keltner-xau-hl as {"status": "paper"} against a
// paper_state.db, so no public surface may present it as trading real money.
// This is the same defect class as the figure above (a claim the bot does not
// back) and the more severe one: a wrong PF misstates how well a bot did,
// "en réel" misstates whether the money exists at all.
//
// The regexes end on \b deliberately. "réel" + word char must NOT match, so
// legitimate copy like "taux réels" stays green while "en réel" fails.
const REAL_MONEY = /en (capital |argent )?r[eé]el\b/i

function ficheText(slug: string): string {
  const fiche = getStrategyFiche(slug)
  if (!fiche) throw new Error(`no strategy fiche for ${slug}`)
  return JSON.stringify(fiche)
}

describe('gold bot is never described as trading real money', () => {
  it('still points the Keltner fiche at the gold bot', () => {
    // Guard: the assertion below also passes on a fiche that stopped
    // mentioning the bot, which would "fix" the claim by deleting the link.
    const text = ficheText('keltner')
    expect(text).toMatch(/bot or/i)
    expect(text).toMatch(/XAU/)
  })

  it('does not claim real money on the Keltner strategy fiche', () => {
    expect(ficheText('keltner')).not.toMatch(REAL_MONEY)
  })

  it('labels the gold bot as running in simulation', () => {
    expect(ficheText('keltner')).toMatch(/simulation/i)
  })

  it('does not claim real money on the gold bot params fiche', () => {
    expect(allText('keltner-xau-hl')).not.toMatch(REAL_MONEY)
  })
})
