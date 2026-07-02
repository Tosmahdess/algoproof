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

describe('ThreeSentences', () => {
  it('renders the three plain-FR rows', () => {
    render(<ThreeSentences data={exp.threeSentences!} />)
    expect(screen.getByText('Quand il achète')).toBeInTheDocument()
    expect(screen.getByText('Il vend en paliers.')).toBeInTheDocument()
    expect(screen.getByText('Ce qu’il peut perdre')).toBeInTheDocument()
  })
})
