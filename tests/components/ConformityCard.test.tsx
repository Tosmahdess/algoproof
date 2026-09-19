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

describe('ConformityCard', () => {
  it('shows the in-envelope pill and both checks when conforming', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    expect(screen.getByText('Dans l’enveloppe')).toBeInTheDocument()
    expect(screen.getByText('Drawdown max')).toBeInTheDocument()
    expect(screen.getByText('≥ 1.2')).toBeInTheDocument()
  })

  it('shows the breach pill when DD blows the envelope', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.3, total_trades: 40 }} />)
    expect(screen.getByText('Hors enveloppe')).toBeInTheDocument()
  })

  it('shows insufficient-sample pill below 20 trades', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 0, max_drawdown: 0.01, total_trades: 3 }} />)
    expect(screen.getByText('Échantillon insuffisant')).toBeInTheDocument()
  })

  it('always publishes the kill criteria and their registration date', () => {
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    expect(screen.getByText('Quand ce bot sera coupé')).toBeInTheDocument()
    expect(screen.getByText('DD > 15 % → gel du bot.')).toBeInTheDocument()
    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument()
  })

  it('shows the dormancy note only at 0 trades', () => {
    const { rerender } = render(
      <ConformityCard expectations={exp} stats={{ profit_factor: 0, max_drawdown: 0, total_trades: 0 }} />,
    )
    expect(screen.getByText(/historique en construction/)).toBeInTheDocument()
    rerender(<ConformityCard expectations={exp} stats={{ profit_factor: 1.2, max_drawdown: 0.01, total_trades: 5 }} />)
    expect(screen.queryByText(/historique en construction/)).not.toBeInTheDocument()
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
      }],
    }
    render(<ConformityCard expectations={withDecision} stats={breached} />)
    const rule = screen.getByText('DD > 15 % → gel du bot.').closest('li')!
    expect(rule.textContent).toMatch(/Décision du 2026-09-19/)
    expect(rule.textContent).toMatch(/la décision est en suspens/)
    expect(rule.textContent).toMatch(/tout l’historique affiché sur cette fiche/)
    expect(screen.queryByText(/aucune décision à ce jour/i)).toBeNull()
    expect(document.body.textContent).toMatch(/sous la règle concernée/)
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
