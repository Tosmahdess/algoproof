// src/components/__tests__/WaveExperiment.test.tsx
import { test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WaveExperiment from '../WaveExperiment'
import type { WaveMeasure } from '@/lib/types'

const m = (over: Partial<WaveMeasure> = {}): WaveMeasure => ({
  computed_at: '2026-08-19T00:00:00Z',
  paired_clusters: 21, head_trades: 40, median_trades: 35,
  marginal_trades: 12, head_pf: 1.8, median_pf: 1.2, marginal_pf: 0.9, ...over,
})

test('below 30 trades per cohort, the PF gap is withheld and says so', () => {
  render(<WaveExperiment waveBotCount={75} measure={m({ median_trades: 10 })} />)
  expect(screen.getByText(/trop tôt/i)).toBeInTheDocument()
  expect(screen.queryByText('1,8')).toBeNull()
})

test('at 30+ trades on both cohorts, the gap renders — derived, not asserted', () => {
  render(<WaveExperiment waveBotCount={75} measure={m({ head_trades: 30, median_trades: 30 })} />)
  expect(screen.getByText(/1,8/)).toBeInTheDocument()
  expect(screen.getByText(/1,2/)).toBeInTheDocument()
})

test('without a measure row, only the protocol renders', () => {
  render(<WaveExperiment waveBotCount={75} measure={null} />)
  expect(screen.getByText(/75/)).toBeInTheDocument()
  expect(screen.getByText(/39/)).toBeInTheDocument()   // the controls are named
})

// Controller ruling (plan Task 11): zero wave bots means nothing to show —
// the encart is not an empty shell, it renders null entirely.
test('with zero wave bots, the encart renders nothing at all', () => {
  const { container } = render(<WaveExperiment waveBotCount={0} measure={m()} />)
  expect(container).toBeEmptyDOMElement()
  expect(screen.queryByTestId('wave-experiment')).toBeNull()
})

// Pins the other half of the display gate the brief's own tests only pin
// from the median side: head under 30, median well past it.
test('below 30 head trades alone, the PF gap is still withheld', () => {
  render(<WaveExperiment waveBotCount={75} measure={m({ head_trades: 10, median_trades: 40 })} />)
  expect(screen.getByText(/trop tôt/i)).toBeInTheDocument()
  expect(screen.queryByText(/1,8/)).toBeNull()
})
