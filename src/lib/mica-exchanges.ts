import { BYBIT_AFFILIATE_URL, HL_AFFILIATE_URL } from './affiliates'

export interface MicaExchange {
  name: string
  type: 'CEX' | 'DEX'
  status: string   // MiCA/CASP status, as read on MICA_EXCHANGES_READ_ON
  franceOk: 'Oui' | 'Non'
  url: string | null
  /** The link pays me a commission. /mica writes « lien affilié » beside it and
   *  gives it rel="sponsored" (audit 2026-10, n° 16). Same split as /start: the
   *  Bybit link is affiliated, the Hyperliquid one is not. */
  affiliate: boolean
}

// The day these rows were last revised (f79cf61, 12 July 2026: the Bybit and Binance
// rows were swapped and corrected). /mica prints it as « Statuts relevés le … »
// (audit 2026-10, n° 82). Change it only when the rows are checked again against
// the ESMA register.
export const MICA_EXCHANGES_READ_ON = '2026-07-12'

export const MICA_EXCHANGES: MicaExchange[] = [
  { name: 'Bybit',       type: 'CEX', status: 'Agrément MiCA (entité UE)',     franceOk: 'Oui', url: BYBIT_AFFILIATE_URL, affiliate: true },
  // No referral link on an exchange that no longer serves France.
  { name: 'Binance',     type: 'CEX', status: 'A cessé de servir la France le 1er juillet 2026', franceOk: 'Non', url: null, affiliate: false },
  { name: 'Kraken',      type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null, affiliate: false },
  { name: 'Coinbase',    type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null, affiliate: false },
  { name: 'Hyperliquid', type: 'DEX', status: 'Protocole non-custodial, hors du champ de l’agrément CASP', franceOk: 'Oui', url: HL_AFFILIATE_URL, affiliate: false },
]
