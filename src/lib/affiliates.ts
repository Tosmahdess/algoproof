export const BYBIT_AFFILIATE_URL =
  process.env.NEXT_PUBLIC_BYBIT_AFFILIATE_URL ?? 'https://www.bybit.eu/invite?ref=YY9GG3M'

// Hyperliquid is NOT an affiliate link, and /start and /mica both say so. It is a
// constant, not an environment variable: a referral URL set in the hosting settings
// would have made those two pages false without a line of code changing (2026-10-03).
// Binance has no link at all since it stopped serving France on 1 July 2026.
export const HYPERLIQUID_URL = 'https://app.hyperliquid.xyz'
