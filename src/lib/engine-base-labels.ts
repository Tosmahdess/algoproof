// French display names for the engine's strategy bases (the first segment of an
// engine_unit_key, verbatim). The per-strategy survival view (counter-audit
// 2026-09-26) prints every base the engine publishes, not only the ten that
// have a bot: raw keys like « VolumeSeqRetest » said nothing to a reader.
//
// The first ten are copied from ARMADA_BASE_FR in scripts/algoproof_sync.py (the
// names the synced bots carry, D067); keep the two in step. Indicator names stay
// as traders write them (RSI, MACD, Ichimoku), per the copy rule D-ALG-COPY-1.
// A base missing here prints its raw key: visible, and corrected by one line.

export const ENGINE_BASE_LABEL: Record<string, string> = {
  // Same as algoproof_sync.py ARMADA_BASE_FR
  EMAcross: 'Croisement EMA',
  HMAcross: 'Croisement HMA',
  TEMAcross: 'Croisement TEMA',
  KAMAcross: 'Croisement KAMA',
  HeikinAshiTrend: 'Tendance Heikin Ashi',
  DonchianBreakout: 'Cassure Donchian',
  KeltnerBreak: 'Cassure Keltner',
  WilliamsVolBreak: 'Cassure de volatilité (Williams)',
  ATRChannel: 'Canal ATR',
  ORB: "Cassure de range d'ouverture",
  // The other bases the engine judges
  ParabolicSAR: 'Parabolic SAR',
  VolumeSeqRetest: 'Retest après séquence de volume',
  TTMSqueeze: 'TTM Squeeze',
  ConnorsRSI: 'RSI de Connors',
  ChandelierExit: 'Chandelier Exit',
  CCIExtremes: 'Extrêmes du CCI',
  MACSimple: 'Croisement de moyennes simples',
  BBSqueeze: 'Compression de Bollinger',
  MACDVolume: 'MACD et volume',
  Ichimoku: 'Ichimoku',
  EMARibbon: "Ruban d'EMA",
  SupertrendADX: 'Supertrend et ADX',
  LiqSweep: 'Balayage de liquidité',
  InsideBarBreakout: "Cassure d'inside bar",
  ROC: 'ROC',
  TrendPullback: 'Repli dans la tendance',
  WilliamsPR: 'Williams %R',
  AwesomeOsc: 'Awesome Oscillator',
  IFVG: 'Fair Value Gap inversé',
  TSI: 'TSI',
  MSS: 'Rupture de structure (MSS)',
  RSI2: 'RSI 2 périodes',
  PinBarReversal: 'Retournement pin bar',
  ZScoreReversal: 'Retour à la moyenne (z-score)',
  Engulfing: 'Avalement (engulfing)',
  PremiumDiscount: 'Zones premium et discount',
  FVG: 'Fair Value Gap',
  OscDivergence: "Divergence d'oscillateur",
  OrderBlock: 'Order block',
  HurstRegime: 'Régime de Hurst',
  ADXRegime: 'Régime ADX',
  VolRegime: 'Régime de volatilité',
}

export function engineBaseLabel(base: string): string {
  return Object.hasOwn(ENGINE_BASE_LABEL, base) ? ENGINE_BASE_LABEL[base] : base
}
