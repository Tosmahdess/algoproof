export type BlogCategory = 'journal' | 'methode' | 'strategie' | 'bilan' | 'guide'

export const BLOG_CATEGORIES: Record<BlogCategory, { label: string; color: string; description: string }> = {
  journal:   { label: 'Journal de bord', color: 'text-muted border-muted/40 bg-muted/10',         description: 'Snapshot quotidien de la flotte' },
  methode:   { label: 'Méthode',         color: 'text-muted border-muted/40 bg-muted/10', description: 'Walk-forward, backtests, validation' },
  strategie: { label: 'Stratégie',       color: 'text-muted border-muted/40 bg-muted/10', description: 'Comment fonctionne un bot' },
  bilan:     { label: 'Bilan',           color: 'text-muted border-muted/40 bg-muted/10',    description: 'Bilan mensuel, transparence radicale' },
  guide:     { label: 'Guide',           color: 'text-muted border-muted/40 bg-muted/10', description: 'Réglementation, fiscalité, pédagogie' },
}

export const CATEGORY_ORDER: BlogCategory[] = ['journal', 'methode', 'strategie', 'bilan', 'guide']
