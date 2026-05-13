import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FaqAccordion from '@/components/FaqAccordion'

const items = [
  { question: 'Puis-je utiliser depuis la France ?', answer: 'Oui, via Bybit ou Hyperliquid.' },
  { question: 'Faut-il du capital ?', answer: 'Minimum 50 USDT recommandé.' },
]

describe('FaqAccordion', () => {
  it('renders all questions', () => {
    render(<FaqAccordion items={items} />)
    expect(screen.getByText('Puis-je utiliser depuis la France ?')).toBeInTheDocument()
    expect(screen.getByText('Faut-il du capital ?')).toBeInTheDocument()
  })

  it('answers are hidden by default', () => {
    render(<FaqAccordion items={items} />)
    expect(screen.queryByText('Oui, via Bybit ou Hyperliquid.')).not.toBeInTheDocument()
  })

  it('shows answer when question is clicked', () => {
    render(<FaqAccordion items={items} />)
    fireEvent.click(screen.getByText('Puis-je utiliser depuis la France ?'))
    expect(screen.getByText('Oui, via Bybit ou Hyperliquid.')).toBeInTheDocument()
  })

  it('hides answer when clicked again', () => {
    render(<FaqAccordion items={items} />)
    fireEvent.click(screen.getByText('Puis-je utiliser depuis la France ?'))
    fireEvent.click(screen.getByText('Puis-je utiliser depuis la France ?'))
    expect(screen.queryByText('Oui, via Bybit ou Hyperliquid.')).not.toBeInTheDocument()
  })

  it('only one answer open at a time', () => {
    render(<FaqAccordion items={items} />)
    fireEvent.click(screen.getByText('Puis-je utiliser depuis la France ?'))
    fireEvent.click(screen.getByText('Faut-il du capital ?'))
    expect(screen.queryByText('Oui, via Bybit ou Hyperliquid.')).not.toBeInTheDocument()
    expect(screen.getByText('Minimum 50 USDT recommandé.')).toBeInTheDocument()
  })
})
