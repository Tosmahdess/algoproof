export interface GlossaryTerm {
  id: string
  term: string
  definition: string
}

export const GLOSSARY: GlossaryTerm[] = [
  { id: 'profit-factor', term: 'Profit factor (PF)', definition: 'Le rapport entre l\'argent gagné et l\'argent perdu. Un PF de 1,3 signifie 1,30 € gagné pour 1 € perdu. Au-dessus de 1, la stratégie est globalement gagnante.' },
  { id: 'win-rate', term: 'Win rate (WR)', definition: 'Le pourcentage de trades gagnants. 60 % = 6 trades gagnants sur 10. Un WR élevé ne suffit pas : ce qui compte est combien on gagne quand on gagne vs combien on perd quand on perd (voir profit factor).' },
  { id: 'drawdown', term: 'Drawdown (DD)', definition: 'La baisse du capital depuis son plus haut. Un drawdown de 15 % veut dire qu\'on a perdu 15 % par rapport au sommet avant de repartir. Mesure le pire moment à traverser.' },
  { id: 'atr', term: 'ATR (Average True Range)', definition: 'Une mesure de la volatilité d\'un actif : l\'amplitude moyenne de ses mouvements de prix. Sert notamment à dimensionner les stops en fonction de l\'agitation du marché.' },
  { id: 'stop-loss', term: 'Stop-loss (SL)', definition: 'Un seuil de sortie automatique qui ferme un trade pour limiter la perte si le prix va dans le mauvais sens.' },
  { id: 'regime', term: 'Régime de marché', definition: 'L\'humeur d\'ensemble du marché — calme, tendu ou en stress — calculée à partir de plusieurs signaux agrégés (volatilité, sentiment, dérivés, macro).' },
  { id: 'dca', term: 'DCA (Dollar Cost Averaging)', definition: 'Acheter une somme fixe à intervalle régulier, peu importe le prix, pour lisser son point d\'entrée dans le temps et réduire l\'impact du timing.' },
  { id: 'walk-forward', term: 'Walk-forward', definition: 'Un test de robustesse : on règle une stratégie sur une période, puis on la teste sur une période suivante jamais vue. Si elle ne tient plus, c\'est probablement de l\'overfit.' },
  { id: 'overfit', term: 'Overfit (surapprentissage)', definition: 'Quand une stratégie colle tellement au passé qu\'elle ne marche plus sur des données nouvelles. Le walk-forward sert à le détecter — et à rejeter la stratégie.' },
  { id: 'paper-trading', term: 'Paper trading', definition: 'Trading simulé : les ordres sont passés sur de vraies données de marché mais sans argent réel. Sert à valider une stratégie avant de risquer du capital.' },
  { id: 'funding', term: 'Funding rate', definition: 'Sur les contrats perpétuels (perps), un paiement périodique entre acheteurs et vendeurs. Selon le sens de la position, c\'est un coût ou un revenu.' },
  { id: 'slippage', term: 'Slippage', definition: 'L\'écart entre le prix attendu et le prix réellement obtenu lors de l\'exécution d\'un ordre — surtout quand le marché bouge vite ou manque de liquidité.' },
]
