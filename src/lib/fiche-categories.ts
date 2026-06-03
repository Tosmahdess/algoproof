// src/lib/fiche-categories.ts
// Sector labels for equity fiche categories. Single source of truth
// for the fiche page and the /wealth/analyses directory.
export const CATEGORY_LABELS: Record<string, string> = {
  semiconductors: 'Semiconducteurs',
  tech_platform: 'Tech Platform / Cloud AI',
  tech_us_growth: 'Tech US Growth',
  luxury_eu: 'Luxe EU',
  pharma_growth: 'Pharma Croissance',
  pharma_defensive: 'Pharma Défensif',
  defense_aerospace: 'Défense / Aérospatial',
  energy_oil: 'Énergie Oil & Gas',
  energy_transition: 'Énergie Transition',
  commodities_metal: 'Métaux & Ressources',
  crypto_alt: 'Crypto',
  crypto_proxy: 'Proxies BTC',
  btc_proxy: 'Proxies BTC',
}

export function categoryLabel(category: string | null): string {
  if (!category) return 'Autres'
  return CATEGORY_LABELS[category] ?? category
}
