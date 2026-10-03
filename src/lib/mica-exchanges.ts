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

// The day these rows were last checked against the ESMA register. /mica prints it as
// « Statuts relevés le … » (audit 2026-10, n° 82). Change it only when the rows are
// checked again.
//
// 3 October 2026, against CASPS.csv of the interim MiCA register (file of 30 September
// 2026): Bybit EU GmbH (AT, authorised 28/05/2025), Payward Europe Solutions, i.e.
// Kraken (IE, 25/06/2025), Coinbase Luxembourg (LU, 20/06/2025), each with no end
// date and FR among its host states. No Binance entity, no Hyperliquid entry.
export const MICA_EXCHANGES_READ_ON = '2026-10-03'

export const MICA_EXCHANGES: MicaExchange[] = [
  { name: 'Bybit',       type: 'CEX', status: 'Agrément MiCA (entité UE)',     franceOk: 'Oui', url: BYBIT_AFFILIATE_URL, affiliate: true },
  // No referral link on an exchange that no longer serves France.
  { name: 'Binance',     type: 'CEX', status: 'A cessé de servir la France le 1er juillet 2026', franceOk: 'Non', url: null, affiliate: false },
  { name: 'Kraken',      type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null, affiliate: false },
  { name: 'Coinbase',    type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null, affiliate: false },
  { name: 'Hyperliquid', type: 'DEX', status: 'Protocole non-custodial, hors du champ de l’agrément CASP', franceOk: 'Oui', url: HL_AFFILIATE_URL, affiliate: false },
]
