import { describe, it, expect } from 'vitest'
import { assetToBinanceSymbol, assetToWidgetSymbol, timeframeToInterval } from './tv-symbol'

describe('assetToBinanceSymbol', () => {
  it('maps slash and dash separators, normalizes quote to USDT', () => {
    expect(assetToBinanceSymbol('BTC/USDC')).toBe('BTCUSDT')
    expect(assetToBinanceSymbol('BTC-USDC')).toBe('BTCUSDT')
    expect(assetToBinanceSymbol('SOL/USDT')).toBe('SOLUSDT')
    expect(assetToBinanceSymbol('ETH/USD')).toBe('ETHUSDT')
  })
  it('returns null for unmappable input', () => {
    expect(assetToBinanceSymbol('')).toBeNull()
    expect(assetToBinanceSymbol('WEIRD')).toBeNull()
  })
  it('maps bare major-crypto tickers to USDT pairs (case-insensitive)', () => {
    expect(assetToBinanceSymbol('SOL')).toBe('SOLUSDT')
    expect(assetToBinanceSymbol('btc')).toBe('BTCUSDT')
  })
  it('returns null for bare equity/unknown tickers', () => {
    expect(assetToBinanceSymbol('NVDA')).toBeNull()
    expect(assetToBinanceSymbol('MC.PA')).toBeNull()
    expect(assetToBinanceSymbol('S')).toBeNull()
  })
})

describe('assetToWidgetSymbol', () => {
  it('prefixes BINANCE:', () => {
    expect(assetToWidgetSymbol('BTC/USDC')).toBe('BINANCE:BTCUSDT')
  })
  it('returns null when unmappable', () => {
    expect(assetToWidgetSymbol('WEIRD')).toBeNull()
  })
  it('maps bare major-crypto tickers', () => {
    expect(assetToWidgetSymbol('SOL')).toBe('BINANCE:SOLUSDT')
  })
  it('returns null for bare equity tickers', () => {
    expect(assetToWidgetSymbol('NVDA')).toBeNull()
  })
})

describe('timeframeToInterval', () => {
  it('maps known timeframes and defaults to 4h', () => {
    expect(timeframeToInterval('H4')).toBe('4h')
    expect(timeframeToInterval('H1')).toBe('1h')
    expect(timeframeToInterval('D1')).toBe('1d')
    expect(timeframeToInterval('???')).toBe('4h')
  })
})
