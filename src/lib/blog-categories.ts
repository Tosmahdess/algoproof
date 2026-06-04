export type BlogCategory = 'journal' | 'weekly' | 'methode' | 'strategie' | 'bilan' | 'guide'

export const BLOG_CATEGORIES: Record<BlogCategory, { label: string; color: string; description: string }> = {
  journal:   { label: 'Journal de bord', color: 'text-muted border-muted/40 bg-muted/10',         description: 'Snapshot quotidien de la flotte' },
  weekly:    { label: 'Revue hebdo',     color: 'text-accent border-accent/40 bg-accent/10',       description: 'Performance de la semaine + insight' },
  methode:   { label: 'Méthode',         color: 'text-amber-400 border-amber-400/40 bg-amber-400/10', description: 'Walk-forward, backtests, validation' },
  strategie: { label: 'Stratégie',       color: 'text-positive border-positive/40 bg-positive/10', description: 'Comment fonctionne un bot' },
  bilan:     { label: 'Bilan',           color: 'text-sky-400 border-sky-400/40 bg-sky-400/10',    description: 'Bilan mensuel, transparence radicale' },
  guide:     { label: 'Guide',           color: 'text-violet-400 border-violet-400/40 bg-violet-400/10', description: 'Réglementation, fiscalité, pédagogie' },
}

export const CATEGORY_ORDER: BlogCategory[] = ['journal', 'weekly', 'methode', 'strategie', 'bilan', 'guide']
