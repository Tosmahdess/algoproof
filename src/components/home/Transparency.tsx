// What I publish when it does not work (lot 3, conception §5.1, brief §14 and §27):
// the crossed rule of a real-money bot with the dated decision under it, and the
// market-weather measure that fails to prove the weather is useful. Failures are
// the proof of seriousness on this site, not a thing to hide under the fold.
import Link from 'next/link'
import { linkClass } from '@/lib/link-roles'
import type { BotWithStats } from '@/lib/types'
import { getBotExpectations } from '@/lib/bot-expectations'
import { assessConformity } from '@/lib/conformity'
import { fmtDrawdown, fmtPfDisplay } from '@/lib/display'
import { mediumDate } from '@/lib/format-date'
import { pct, type FleetImpact } from '@/lib/mi-fleet-impact'

function DecisionBlock({ bot }: { bot: BotWithStats }) {
  const exp = getBotExpectations(bot.slug)!
  const rule = exp.killCriteria.find(r => r.startsWith('Hors enveloppe')) ?? exp.killCriteria[0]
  const decision = exp.decisions?.filter(d => d.rule === rule).at(-1)
  return (
    <div data-testid="home-decision" className="bg-card border border-border rounded-lg p-5">
      <div className="border-l-2 border-severe pl-3.5 grid gap-2.5 text-sm">
        <div>
          <p className="text-xs text-muted font-medium">Règle publiée, fixée le {mediumDate(exp.registeredAt)}</p>
          <p><Link href={`/strategies/bot/${bot.slug}`} className={linkClass('record')}>{bot.name}</Link> : {rule}</p>
        </div>
        <div>
          <p className="text-xs text-muted font-medium">État mesuré</p>
          <p className="text-severe font-mono">DD {fmtDrawdown(bot.stats.max_drawdown)} · PF {fmtPfDisplay(bot.family, bot.stats.total_trades, bot.stats.profit_factor)} · {bot.stats.total_trades} trades. Règle franchie.</p>
        </div>
        <div>
          <p className="text-xs text-muted font-medium">Décision</p>
          <p>{decision ? decision.text : 'Je n’ai publié aucune décision à ce jour.'}{' '}<Link href={`/strategies/bot/${bot.slug}`} className={linkClass('inline')}>La fiche, tout l’historique</Link></p>
        </div>
      </div>
    </div>
  )
}

function WeatherMeasure({ impact }: { impact: FleetImpact }) {
  const better = impact.ddConstant > impact.ddBoth
  return (
    <div data-testid="home-weather-measure" className="bg-card border border-border rounded-lg p-5">
      <div className="border-l-2 border-negative pl-3.5 text-sm leading-relaxed">
        <p className="text-xs text-muted font-medium mb-1">Ma météo du marché, mesurée sur {impact.windowDays} jours</p>
        <p>
          Le blocage en régime rouge a refusé <span className="font-mono">{impact.blockedRed}</span> signal{impact.blockedRed > 1 ? 's' : ''} sur <span className="font-mono">{impact.nTrades}</span> trades rejoués.
          {better
            ? <> Couper l’exposition à plat, sans aucun timing, aurait fait mieux (<span className="font-mono">{pct(impact.ddConstant)}</span> de drawdown moyen contre <span className="font-mono">{pct(impact.ddBoth)}</span>). Je ne sais donc pas te prouver que le timing sert à quelque chose. Je la garde quand même, et je republie ce contrôle chaque semaine.</>
            : <> Avec la matrice de taille de position, le drawdown moyen passe de <span className="font-mono">{pct(impact.ddBaseline)}</span> à <span className="font-mono">{pct(impact.ddBoth)}</span>. Je republie ce contrôle chaque semaine.</>}
          {' '}<Link href="/intelligence" className={linkClass('inline')}>Pourquoi</Link>
        </p>
      </div>
    </div>
  )
}

export default function Transparency({ liveBots, impact }: { liveBots: BotWithStats[]; impact: FleetImpact | null }) {
  const crossed = liveBots.find(b => {
    const exp = getBotExpectations(b.slug)
    return exp ? assessConformity(exp, b.stats).status === 'breach' : false
  })
  if (!crossed && !impact) return null
  return (
    <section data-testid="home-transparency" aria-labelledby="home-transparency-title" className="mb-12">
      <h2 id="home-transparency-title" className="text-xl font-semibold mb-3">Ce que je publie aussi quand ça ne marche pas</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {crossed && <DecisionBlock bot={crossed} />}
        {impact && <WeatherMeasure impact={impact} />}
      </div>
    </section>
  )
}
