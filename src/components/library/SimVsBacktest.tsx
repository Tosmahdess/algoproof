// « Backtest contre simulation » on an idea page (chantier bibliotheque, lot 2c). The
// simulation of all the idea's launched variants, one observation per entry day
// (library-score.ts), set beside the selection backtest of the same variants in the same
// unit: gain per trade for 1 000 € committed.
//
// Two figures side by side, never a pass/fail verdict (Fable 04/10): the selection
// backtest is in-sample, so a gap downwards is the expected case, and calling it a
// broken promise would be the promise itself (Code de la consommation L121-2). Before
// 30 entry days there is no figure at all, only the count.
import type { IdeaScore } from '@/lib/library-score'
import { SCORE_MIN_DAYS } from '@/lib/library-score'
import { signedOneDecimal } from '@/lib/library'

const fr = (n: number) => n.toLocaleString('fr-FR')
const days = (n: number) => `${fr(n)} ${n > 1 ? 'journées' : 'journée'}`

/** Where the simulation sits against the backtest mean: the two-sided 80 % interval of
 *  the simulation (prudent gain = its lower end) below, around or above it. */
function placement(score: IdeaScore, backtest: number): string {
  const mean = score.mean as number
  const low = score.prudent as number
  const high = mean + (mean - low)
  if (high < backtest) return 'La simulation est en dessous du backtest, même en tenant compte de sa marge d’erreur.'
  if (low > backtest) return 'La simulation est au-dessus du backtest, même en tenant compte de sa marge d’erreur.'
  return 'La simulation est au niveau du backtest, dans la marge d’erreur.'
}

export default function SimVsBacktest({ launched, score, backtestMean }: {
  /** Variants launched at least once (simulation, real money or stopped). */
  launched: number
  score: IdeaScore | null
  /** Selection backtest of the launched variants, per trade for 1 000 €; null when
   *  not computed (only once ranked) or unreadable. */
  backtestMean: number | null
}) {
  if (launched === 0) return null
  return (
    <section data-testid="sim-vs-backtest" aria-labelledby="sim-vs-backtest-title" className="mt-10 border-t border-border pt-9">
      <h2 id="sim-vs-backtest-title" className="text-2xl font-semibold tracking-tight">Backtest contre simulation</h2>
      <div className="mt-3 max-w-[72ch] space-y-2 text-sm text-muted">
        {!score || score.days === 0 ? (
          <p>{`${launched > 1 ? `${fr(launched)} variantes sont lancées` : 'Une variante est lancée'}, aucune n’a encore fermé de trade en simulation. Je mettrai la simulation en face du backtest quand elles auront ${SCORE_MIN_DAYS} journées de trading.`}</p>
        ) : !score.ranked || score.prudent === null || score.mean === null ? (
          <p>{`Toutes variantes confondues, ${days(score.days)} de trading en simulation (${fr(score.trades)} ${score.trades > 1 ? 'trades' : 'trade'}). J’en attends ${SCORE_MIN_DAYS} avant de mettre la simulation en face du backtest de sélection : en dessous, l’écart ne voudrait rien dire.`}</p>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 py-2 text-foreground sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Backtest de sélection</dt>
                <dd className="text-xl font-medium tabular-nums">
                  {backtestMean === null ? '—' : `${signedOneDecimal(backtestMean)} € par trade`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Simulation</dt>
                <dd className="text-xl font-medium tabular-nums">{`${signedOneDecimal(score.mean)} € par trade`}</dd>
                <dd className="text-sm text-muted">{`gain prudent ${signedOneDecimal(score.prudent)} €, sur ${days(score.days)}`}</dd>
              </div>
            </dl>
            <p>Pour 1 000 € engagés, une journée de trading comptée une fois même quand plusieurs variantes y ont pris le même trade.</p>
            {backtestMean === null
              ? <p>Le chiffre du backtest de sélection n’est pas disponible pour l’instant.</p>
              : <p>{`${placement(score, backtestMean)} Le backtest de sélection est flatteur par construction : ce sont les jours sur lesquels mon moteur a choisi ces réglages, un écart vers le bas est donc attendu.`}</p>}
          </>
        )}
      </div>
    </section>
  )
}
