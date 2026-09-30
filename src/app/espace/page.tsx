import { redirect } from 'next/navigation'
import { labUrl, LAB_ORIGIN } from '@/lib/lab-links'

// Mon espace lives on the lab (chantier espace-direct, lot A, D075): the
// favorites are stored with the account, which the lab owns. The two domains
// share no session cookie, so nothing but the ref crosses: no token, ever.
export default function EspacePage(): never {
  redirect(labUrl(`${LAB_ORIGIN}/espace`, 'site-espace'))
}
