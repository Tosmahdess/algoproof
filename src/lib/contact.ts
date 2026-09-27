// The private question form of a bot sheet (owner, 2026-09-26): the same form, the
// same API and the same table as lab.algoproof.fr/account, so a question asked here
// reaches the owner by the one channel he already reads (contact_messages, plus the
// mail the API sends on every insert).
//
// Twin of algolab web/lib/contact.ts and api/routes_contact.py: two repositories,
// so the cap and the address rule are copied on purpose. The API revalidates and
// has the last word; this check only saves the visitor a round trip.

/** The lab API route. algoproof.fr is in its CORS allow-list (api/main.py). */
export const CONTACT_API = 'https://api-lab.algoproof.fr/contact'

/** Message cap, twin of CONTACT_MAX in algolab api/routes_contact.py. */
export const CONTACT_MAX = 2000

export type ContactInput = { subject: 'question'; email: string; message: string }

export type ContactResult =
  | { ok: true; value: ContactInput }
  | { ok: false; error: string }

/** Permissive on purpose: it catches the typo that would make a reply impossible,
 *  it does not prove the address exists. Same pattern as the lab. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateQuestion(email: string, message: string): ContactResult {
  const address = email.trim().toLowerCase()
  if (!address) return { ok: false, error: 'Ton adresse email, pour que je puisse te répondre.' }
  if (!EMAIL.test(address)) return { ok: false, error: "Cette adresse a l'air incomplète : je ne pourrais pas y répondre." }
  const text = message.trim()
  if (!text) return { ok: false, error: "Écris ton message avant de l'envoyer." }
  if (text.length > CONTACT_MAX) {
    return { ok: false, error: `Message trop long : ${text.length} caractères pour ${CONTACT_MAX} maximum.` }
  }
  return { ok: true, value: { subject: 'question', email: address, message: text } }
}

const GENERIC = "Le message n'est pas parti. Réessaie dans un instant."

/** POST to the lab API. The API's refusal is shown when it is readable (« trop de
 *  messages »); a raw status or a network error never reaches the visitor. */
export async function sendQuestion(input: ContactInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(CONTACT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.ok) return { ok: true }
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body?.detail === 'string' && body.detail.trim()) return { ok: false, error: body.detail }
    } catch {
      // a refusal without a JSON body is still a refusal
    }
    return { ok: false, error: GENERIC }
  } catch {
    return { ok: false, error: GENERIC }
  }
}
