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
    expect(screen.getByText('≥ 1,2')).toBeInTheDocument()
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
    expect(screen.getByText(/1 janv\. 2026/)).toBeInTheDocument()
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

// 2026-09-19 (D057): on a phone the card took 772 px of v1-spot. Its table,
// kill criteria and source fold; its title, status and verdict sentence do
// not, so a folded card never shows a bare « Dans l'enveloppe ».
describe('ConformityCard folds its detail on a phone, never its verdict', () => {
  const ok = { profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }

  it('turns its title into a closed disclosure button, anchored #conformite', () => {
    render(<ConformityCard expectations={exp} stats={ok} />)
    const bouton = screen.getByRole('button', { name: /Conformité au backtest/ })
    expect(bouton.getAttribute('aria-expanded')).toBe('false')
    expect(bouton.className).toContain('sm:hidden')
    expect(document.getElementById('conformite')!.tagName).toBe('H2')
  })

  it('keeps the status and the verdict sentence outside the folded body', () => {
    render(<ConformityCard expectations={exp} stats={ok} />)
    const corps = document.getElementById('conformite-corps')!
    const verdict = screen.getByText('Le réalisé reste dans l’enveloppe attendue du backtest.')
    expect(corps.contains(verdict)).toBe(false)
    expect(corps.contains(screen.getByText('Dans l’enveloppe'))).toBe(false)
    // Said once: not repeated in the phone button.
    expect(screen.getByRole('button').textContent).not.toContain('Dans l’enveloppe')
  })

  it('folds the table, the kill criteria and the source', () => {
    render(<ConformityCard expectations={exp} stats={ok} />)
    const corps = document.getElementById('conformite-corps')!
    expect(corps.contains(screen.getByText('Drawdown max'))).toBe(true)
    expect(corps.contains(screen.getByText('Quand ce bot sera coupé'))).toBe(true)
    expect(corps.contains(screen.getByText(/1 janv\. 2026/))).toBe(true)
  })
})

describe('ConformityCard header on a phone', () => {
  it('stacks the badge under the title below sm, and keeps the computer row', () => {
    // At 390 px the badge (123 px) shared the row with the title, which kept
    // 158 px: « 📏 » alone on a line, the title broken in two (capture 19/09).
    render(<ConformityCard expectations={exp} stats={{ profit_factor: 1.5, max_drawdown: 0.05, total_trades: 40 }} />)
    const rangee = document.getElementById('conformite')!.parentElement!
    expect(rangee.className).toContain('flex-col')
    for (const c of ['sm:flex-row', 'sm:items-center', 'sm:justify-between']) expect(rangee.className).toContain(c)
    expect(screen.getByText('Dans l’enveloppe').closest('span.inline-flex')!.className).toContain('self-start')
  })
})

// Final review 2026-09-19: in breach, the verdict sentence points at the rule
// (« écrit sous la règle concernée ») or admits there is no decision — and the
// rules sit in the folded body. ORB is in exactly this state in production. A
// breached card therefore opens by itself, on a phone too.
describe('ConformityCard in breach opens by itself', () => {
  const breached = { profit_factor: 0.9, max_drawdown: 0.3, total_trades: 40 }
  const decided: BotExpectations = {
    ...exp,
    decisions: [{ rule: 'DD > 15 % → gel du bot.', date: '2026-09-19', status: 'pending',
      scope: 'x', text: 'Décision en suspens.' }],
  }

  for (const [nom, attentes] of [['with a decision', decided], ['without one', exp]] as const) {
    it(`opens, badge and verdict outside the body, ${nom}`, () => {
      render(<ConformityCard expectations={attentes} stats={breached} />)
      expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
      const corps = document.getElementById('conformite-corps')!
      expect(corps.className).not.toContain('max-sm:hidden')
      expect(corps.contains(screen.getByText('Hors enveloppe'))).toBe(false)
      expect(corps.contains(screen.getByText(/^Le réalisé sort de l’enveloppe/))).toBe(false)
      expect(corps.contains(screen.getByText('DD > 15 % → gel du bot.'))).toBe(true)
    })
  }

  it('stays folded on a phone when it is only under watch or too early', () => {
    for (const stats of [{ profit_factor: 1.25, max_drawdown: 0.14, total_trades: 40 },
                         { profit_factor: 0, max_drawdown: 0.01, total_trades: 3 }]) {
      const { unmount } = render(<ConformityCard expectations={exp} stats={stats} />)
      expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('false')
      unmount()
    }
  })
})
