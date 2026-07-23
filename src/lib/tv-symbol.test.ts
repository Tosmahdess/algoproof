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
})

describe('assetToWidgetSymbol', () => {
  it('prefixes BINANCE:', () => {
    expect(assetToWidgetSymbol('BTC/USDC')).toBe('BINANCE:BTCUSDT')
  })
  it('returns null when unmappable', () => {
    expect(assetToWidgetSymbol('WEIRD')).toBeNull()
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
