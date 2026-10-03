import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConformityCard from '@/components/ConformityCard'
import ThreeSentences from '@/components/ThreeSentences'
import type { BotExpectations } from '@/lib/bot-expectations'

const exp: BotExpectations = {
  source: 'gate test 730 j',
  registeredAt: '2026-01-01',
  pfFloor: 1.2,
  maxDrawdown: 0.15,
  killCriteria: ['DD > 15 % → gel du bot.'],
  threeSentences: {
    entry: 'Il achète au croisement.',
    exit: 'Il vend en paliers.',
    risk: '1 % par trade.',
  },
  dormancyNote: 'Bot tout neuf : historique en construction.',
}

// Refonte « Le registre des décisions », lot 3 (2026-10-02): the card became the body of
// « Ce que j'avais fixé. Ce qui s'est passé. ». Its state pill moved to the verdict panel
// under the title (tests/lib/bot-verdict.test.ts), so these tests read the values against
// their thresholds instead of the pill.
describe('ConformityCard', () => {
  it('shows each value against its published threshold when conforming', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    expect(screen.getByText('Pire baisse')).toBeInTheDocument()
    expect(screen.getByText('Facteur de profit')).toBeInTheDocument()
    expect(screen.getByText(/Attendu : au moins 1,2/)).toBeInTheDocument()
    expect(screen.getByText(/Limite publiée : 15/)).toBeInTheDocument()
  })

  it('paints a crossed drawdown in the loss colour', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.3, total_trades: 40 }} />)
    expect(screen.getByText(/^30,0/).className).toContain('text-negative')
  })

  it('below 20 trades the profit factor is not yet measurable: « — », uncoloured', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 0, max_drawdown: 0.01, total_trades: 3 }} />)
    const pf = screen.getByText('Facteur de profit').closest('[data-testid="rule-row"]')!
    expect(pf.textContent).toMatch(/pas encore mesurable/)
    expect(pf.querySelector('dd')!.textContent).toBe('—')
    expect(pf.querySelector('dd')!.className).not.toMatch(/text-negative|text-positive/)
  })

  it('always publishes the kill criteria and their registration date', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    expect(screen.getByText('Quand ce bot sera coupé')).toBeInTheDocument()
    expect(screen.getByText('DD > 15 % → gel du bot.')).toBeInTheDocument()
    expect(screen.getByText(/1er janv\. 2026/)).toBeInTheDocument()
  })

  // The dormancy note moved to the verdict panel, which prints it once at 0 trades
  // (tests/lib/bot-verdict.test.ts, « carries the dormancy note once »).
  it('leaves the dormancy note to the verdict panel', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 0, max_drawdown: 0, total_trades: 0 }} />)
    expect(screen.queryByText(/historique en construction/)).not.toBeInTheDocument()
  })

  // Audit 2026-10, constat 6: a bot without a trade validated « Drawdown 0,0 % » on nothing.
  it('zero trade: every value « — », not yet measurable, nothing coloured', () => {
    const { container } = render(<ConformityCard expectations={exp} stats={{ profit_factor: 0, max_drawdown: 0, total_trades: 0 }} />)
    const values = [...container.querySelectorAll('[data-testid="rule-row"] dd')].map(d => d.textContent)
    expect(values).toEqual(['—', '—'])
    expect(container.querySelectorAll('[data-testid="rule-row"] .text-negative, [data-testid="rule-row"] .text-warning')).toHaveLength(0)
  })
})

// C2.1 (audit 2026-09-15). ORB showed « DD > 20 % ou PF < 1,0 → bot gelé » beside a DD and
// a PF that both broke it, while the bot kept trading real money, and the card said « les
// critères d'arrêt ci-dessous s'appliquent ». A breached rule now always has something
// next to it: the dated decision, or the admission that none is published.
describe('ConformityCard never shows a breached rule alone', () => {
  const breached = { profit_factor: 0.9, max_drawdown: 0.3, total_trades: 40 }

  it('says once, and only that, that no decision is published when a breach has none', () => {
    render(<ConformityCard expectations={exp} stats={breached} />)
    const text = document.body.textContent ?? ''
    expect(text.match(/aucune décision à ce jour/gi)).toHaveLength(1)
    // Neither the old claim that the criteria were applied, nor a pointer to a decision
    // that does not exist (Fable review 2026-09-19: both sentences, 8 lines apart).
    expect(text).not.toMatch(/s’appliquent/)
    expect(text).not.toMatch(/décidé est écrit/)
  })

  it('shows the latest decision on a rule, not the first one written', () => {
    const twice: BotExpectations = {
      ...exp,
      decisions: [
        { rule: 'DD > 15 % → gel du bot.', date: '2026-09-19', status: 'pending',
          scope: 'x', text: 'Décision en suspens.' },
        { rule: 'DD > 15 % → gel du bot.', date: '2026-10-01', status: 'kept',
          scope: 'x', text: 'Je garde le bot.' },
      ],
    }
    render(<ConformityCard expectations={twice} stats={breached} />)
    expect(screen.getByText('Je garde le bot.')).toBeInTheDocument()
    expect(screen.queryByText('Décision en suspens.')).toBeNull()
  })

  it('prints the dated decision right under the rule it answers', () => {
    const withDecision: BotExpectations = {
      ...exp,
      decisions: [{
        rule: 'DD > 15 % → gel du bot.',
        date: '2026-09-19',
        status: 'pending',
        scope: 'tout l’historique affiché sur cette fiche',
        text: 'Je n’ai pas gelé le bot, la décision est en suspens.',
        reviewBy: '2026-09-22',
      }],
    }
    // `today` pinned before the review date: the guard (DecisionNote.test.tsx) is not under test here.
    render(<ConformityCard expectations={withDecision} stats={breached} today="2026-09-20" />)
    const rule = screen.getByText('DD > 15 % → gel du bot.').closest('li')!
    expect(rule.textContent).toMatch(/Décision du 19 sept\. 2026/)
    expect(rule.textContent).toMatch(/la décision est en suspens/)
    expect(rule.textContent).toMatch(/Réexamen le 22 sept\. 2026/)
    expect(rule.textContent).toMatch(/tout l’historique affiché sur cette fiche/)
    expect(screen.queryByText(/aucune décision à ce jour/i)).toBeNull()
    // The rule itself is not rewritten: the commitment stays readable beside what I did.
    expect(screen.getByText('DD > 15 % → gel du bot.')).toBeInTheDocument()
  })

  it('says nothing about decisions while the bot is inside its envelope', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    expect(screen.queryByText(/aucune décision à ce jour/i)).toBeNull()
  })
})

describe('ThreeSentences', () => {
  it('renders the three plain-FR rows', () => {
    render(<ThreeSentences data={exp.threeSentences!} />)
    expect(screen.getByText('Quand il achète')).toBeInTheDocument()
    expect(screen.getByText('Il vend en paliers.')).toBeInTheDocument()
    expect(screen.getByText('Ce qu’il peut perdre')).toBeInTheDocument()
  })
})

// Refonte lot 3 (2026-10-02): the card is no longer folded on a phone (D057 folded its
// table and rules). The verdict sits in the panel under the title and the evidence here
// stays in view, crossed rule and decision included. Constat 30: a value takes the colour
// of its threshold, never a default red.
describe('ConformityCard is never folded, and colours by threshold', () => {
  it('has no disclosure button: the rules and the decision are in the page', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 0.9, max_drawdown: 0.3, total_trades: 40 }} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('DD > 15 % → gel du bot.')).toBeVisible()
  })

  it('crossed in the loss colour, near in the reserve, held in ink', () => {
    const tone = (stats: { profit_factor: number; max_drawdown: number; total_trades: number }) => {
      const { container, unmount } = render(<ConformityCard expectations={exp} stats={stats} />)
      const cls = container.querySelector('[data-testid="rule-row"] dd')!.className
      unmount()
      return cls
    }
    expect(tone({ profit_factor: 1.5, max_drawdown: 0.3, total_trades: 40 })).toContain('text-negative')
    expect(tone({ profit_factor: 1.5, max_drawdown: 0.14, total_trades: 40 })).toContain('text-warning')
    const held = tone({ profit_factor: 1.5, max_drawdown: 0.022, total_trades: 40 })
    expect(held).toContain('text-foreground')
    expect(held).not.toMatch(/text-negative|text-positive/)
  })
})
