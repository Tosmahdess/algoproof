import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchInput from '@/components/SearchInput'

describe('SearchInput', () => {
  it('renders placeholder and reports typed value', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="Chercher…" />)
    const input = screen.getByPlaceholderText('Chercher…')
    fireEvent.change(input, { target: { value: 'nvda' } })
    expect(onChange).toHaveBeenCalledWith('nvda')
  })
  it('shows count when provided', () => {
    render(<SearchInput value="x" onChange={() => {}} resultCount={3} totalCount={82} />)
    expect(screen.getByText('3 / 82')).toBeTruthy()
  })
  it('clear button resets to empty', () => {
    const onChange = vi.fn()
    render(<SearchInput value="abc" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /effacer/i }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
