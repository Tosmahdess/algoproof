import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import BotQuestionForm from '@/components/BotQuestionForm'
import { CONTACT_API, CONTACT_MAX } from '@/lib/contact'

// Owner, 2026-09-26: the public « Discussion » of a bot sheet (pseudo + message,
// published unmoderated, 0 comment in two months) becomes the lab account page's
// form: an address to answer to, a message, a private reply. Same API, same
// table, same notification as lab.algoproof.fr/account.

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

const fill = (email: string, message: string) => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/message/i), { target: { value: message } })
}

describe('BotQuestionForm', () => {
  it('asks for an address and a message, never a pseudo', () => {
    render(<BotQuestionForm botName="Croisement EMA H4 Kraken Spot" slug="v1-spot" />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/pseudo/i)).toBeNull()
    expect(screen.queryByText(/pseudo/i)).toBeNull()
  })

  it('sends a question to the lab API, naming the bot it is about', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<BotQuestionForm botName="Croisement EMA H4 Kraken Spot" slug="v1-spot" />)
    fill('Lea@Example.com', 'Pourquoi 4 h ?')
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(CONTACT_API)
    const body = JSON.parse(init.body)
    expect(body.subject).toBe('question')
    expect(body.email).toBe('lea@example.com')
    expect(body.message).toMatch(/Croisement EMA H4 Kraken Spot/)
    expect(body.message).toMatch(/\/strategies\/bot\/v1-spot/)
    expect(body.message).toMatch(/Pourquoi 4 h \?/)
  })

  it('on success clears the message and keeps the address', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    render(<BotQuestionForm botName="B" slug="b" />)
    fill('a@b.fr', 'Question')
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    await screen.findByText(/c’est arrivé/i)
    expect((screen.getByLabelText(/message/i) as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('a@b.fr')
  })

  it('on failure keeps everything and shows the API’s own refusal when it has one', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ detail: 'Trop de messages, réessaie dans une heure.' }) })
    render(<BotQuestionForm botName="B" slug="b" />)
    fill('a@b.fr', 'Question')
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de messages, réessaie dans une heure.')
    expect((screen.getByLabelText(/message/i) as HTMLTextAreaElement).value).toBe('Question')
  })

  it('refuses before sending when the address or the message is missing', () => {
    render(<BotQuestionForm botName="B" slug="b" />)
    fill('', 'Question')
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/adresse/i)
    fill('a@b.fr', '   ')
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/message/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('caps the message so the bot line and the text fit the API limit', () => {
    render(<BotQuestionForm botName="B" slug="b" />)
    const max = Number(screen.getByLabelText(/message/i).getAttribute('maxLength'))
    expect(max).toBeGreaterThan(0)
    expect(max).toBeLessThan(CONTACT_MAX)
  })
})
