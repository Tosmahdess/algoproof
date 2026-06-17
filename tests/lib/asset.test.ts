import { describe, it, expect } from 'vitest'
import { toBaseAsset, assetOptionsFromTrades, type AssetOption } from '@/lib/asset'

describe('toBaseAsset', () => {
  it('strips hyphen quote', () => {
    expect(toBaseAsset('SOL-USDT')).toBe('SOL')
    expect(toBaseAsset('BTC-USDC')).toBe('BTC')
    expect(toBaseAsset('XAU-USDC')).toBe('XAU')
  })
  it('strips slash quote', () => {
    expect(toBaseAsset('BTC/USDT')).toBe('BTC')
    expect(toBaseAsset('EUR/USD')).toBe('EUR')
  })
  it('keeps bare base symbols', () => {
    expect(toBaseAsset('SOL')).toBe('SOL')
  })
  it('uppercases and trims', () => {
    expect(toBaseAsset(' btc-usdt ')).toBe('BTC')
  })
  it('strips 1000 perp prefix', () => {
    expect(toBaseAsset('1000SHIB/USDT')).toBe('SHIB')
    expect(toBaseAsset('1000PEPE-USDT')).toBe('PEPE')
  })
  it('is defensive on empty input', () => {
    expect(toBaseAsset('')).toBe('UNKNOWN')
    // @ts-expect-error runtime guard
    expect(toBaseAsset(undefined)).toBe('UNKNOWN')
  })
})

describe('assetOptionsFromTrades', () => {
  const trades = [
    { asset: 'SOL-USDT' }, { asset: 'SOL-USDT' }, { asset: 'SOL-USDC' },
    { asset: 'BTC-USDT' }, { asset: 'ETH/USDT' },
  ]
  it('distinct base symbols with counts', () => {
    const opts = assetOptionsFromTrades(trades)
    const sol = opts.find(o => o.value === 'SOL')
    expect(sol).toEqual<AssetOption>({ value: 'SOL', label: 'SOL (3)', count: 3 })
  })
  it('sorts by descending volume', () => {
    const opts = assetOptionsFromTrades(trades)
    expect(opts.map(o => o.value)).toEqual(['SOL', 'BTC', 'ETH'])
  })
  it('handles empty list', () => {
    expect(assetOptionsFromTrades([])).toEqual([])
  })
})
