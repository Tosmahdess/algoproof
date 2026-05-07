import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TechnicalArticle from '@/components/TechnicalArticle'
import type { TechnicalSection } from '@/lib/bot-params'

vi.mock('@/components/CodeSnippet', () => ({
  default: ({ code }: { code: string }) => <pre data-testid="code-snippet">{code}</pre>,
}))

const sections: TechnicalSection[] = [
  {
    title: 'Signal',
    body: 'EMA cross logic description.',
    code: "return 'BUY'",
  },
  {
    title: 'Risk',
    body: 'ATR stop loss description.',
  },
]

describe('TechnicalArticle', () => {
  it('renders all section titles', () => {
    render(<TechnicalArticle sections={sections} />)
    expect(screen.getByText('Signal')).toBeDefined()
    expect(screen.getByText('Risk')).toBeDefined()
  })

  it('renders all section body text', () => {
    render(<TechnicalArticle sections={sections} />)
    expect(screen.getByText('EMA cross logic description.')).toBeDefined()
    expect(screen.getByText('ATR stop loss description.')).toBeDefined()
  })

  it('renders CodeSnippet when section has code', () => {
    render(<TechnicalArticle sections={sections} />)
    expect(screen.getByTestId('code-snippet')).toBeDefined()
  })

  it('does not render CodeSnippet when section has no code', () => {
    const noCodeSections: TechnicalSection[] = [
      { title: 'Only prose', body: 'No code here.' },
    ]
    render(<TechnicalArticle sections={noCodeSections} />)
    expect(screen.queryByTestId('code-snippet')).toBeNull()
  })
})
