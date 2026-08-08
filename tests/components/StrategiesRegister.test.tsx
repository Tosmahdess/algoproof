// tests/components/StrategiesRegister.test.tsx
//
// The fiche register of /strategies, with its search box. The library is 22
// fiches and the fleet behind it is about to grow, so a visitor must be able
// to reach one fiche by typing instead of scanning seven family sections.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StrategiesRegister, { type FicheGroup } from '@/components/StrategiesRegister'

const GROUPS: FicheGroup[] = [
  {
    family: 'trend',
    label: 'Suivi de tendance',
    description: 'Suivre le mouvement une fois lancé.',
    fiches: [
      { slug: 'ema-cross', title: 'EMA Cross', oneLiner: 'Deux moyennes mobiles, un croisement.', botCount: 2 },
      { slug: 'ichimoku', title: 'Ichimoku', oneLiner: 'Le nuage japonais complet.', botCount: 0 },
    ],
  },
  {
    family: 'breakout',
    label: 'Cassure',
    description: 'Entrer quand le prix sort de sa zone.',
    fiches: [
      { slug: 'orb', title: 'Opening Range Breakout', oneLiner: 'La cassure du range d’ouverture.', botCount: 1 },
    ],
  },
]

describe('StrategiesRegister — search', () => {
  it('renders every fiche when the search is empty', () => {
    render(<StrategiesRegister groups={GROUPS} />)
    expect(screen.getByText('EMA Cross')).toBeTruthy()
    expect(screen.getByText('Ichimoku')).toBeTruthy()
    expect(screen.getByText('Opening Range Breakout')).toBeTruthy()
  })

  it('narrows to matching fiches as the visitor types', () => {
    render(<StrategiesRegister groups={GROUPS} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ichimoku' } })
    expect(screen.getByText('Ichimoku')).toBeTruthy()
    expect(screen.queryByText('EMA Cross')).toBeNull()
    expect(screen.queryByText('Opening Range Breakout')).toBeNull()
  })

  it('matches without accents or case, on title and one-liner alike', () => {
    render(<StrategiesRegister groups={GROUPS} />)
    // « croisement » only appears in the EMA Cross one-liner; typed with a wrong
    // case and a spurious accent it must still match.
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'CROISÉMENT' } })
    expect(screen.getByText('EMA Cross')).toBeTruthy()
    expect(screen.queryByText('Ichimoku')).toBeNull()
  })

  it('drops a family section entirely when none of its fiches match', () => {
    render(<StrategiesRegister groups={GROUPS} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'nuage' } })
    expect(screen.queryByText('Cassure')).toBeNull()
    expect(screen.getByText('Suivi de tendance')).toBeTruthy()
  })

  it('offers to clear the search when nothing matches', () => {
    render(<StrategiesRegister groups={GROUPS} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz-aucune' } })
    expect(screen.getByText(/Aucune stratégie ne correspond/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tout réafficher/ }))
    expect(screen.getByText('EMA Cross')).toBeTruthy()
  })
})
