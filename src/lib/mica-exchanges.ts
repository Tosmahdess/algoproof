import { BYBIT_AFFILIATE_URL, BINANCE_AFFILIATE_URL, HL_AFFILIATE_URL } from './affiliates'

export interface MicaExchange {
  name: string
  type: 'CEX' | 'DEX'
  status: string   // MiCA/CASP status (indicatif)
  franceOk: string
  url: string | null
}

// Statut indicatif au 2026-06 — vérifier sur le registre AMF/ESMA.
export const MICA_EXCHANGES: MicaExchange[] = [
  { name: 'Bybit',       type: 'CEX', status: 'Agrément MiCA (entité UE)',     franceOk: 'Oui', url: BYBIT_AFFILIATE_URL },
  { name: 'Binance',     type: 'CEX', status: 'Agrément MiCA (entité UE)',     franceOk: 'Spot oui · Futures non', url: BINANCE_AFFILIATE_URL },
  { name: 'Kraken',      type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null },
  { name: 'Coinbase',    type: 'CEX', status: 'Agrément MiCA',                 franceOk: 'Oui', url: null },
  { name: 'Hyperliquid', type: 'DEX', status: 'DEX non-custodial (hors champ CASP)', franceOk: 'Oui', url: HL_AFFILIATE_URL },
]
