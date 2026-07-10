// Pre-registered expectations ("envelope") + public kill criteria per bot slug.
// Same static pattern as bot-params.ts: git-versioned so every change is dated and
// auditable — that IS the "pre-registered, immutable" promise made to visitors.
//
// RULE: only numbers traceable to a backtest gate or risk config that existed BEFORE
// the observation period. A bot without verified numbers has NO entry here and the
// fiche simply shows no conformity card. Never invent an envelope.

export interface ThreeSentences {
  entry: string
  exit: string
  risk: string
}

export interface BotExpectations {
  /** Provenance of the numbers (which backtest / gate / risk config). Displayed. */
  source: string
  /** Date the criteria were pre-registered (YYYY-MM-DD). Displayed. */
  registeredAt: string
  /** Expected profit-factor floor (from the GO gate). Checked only at ≥ 20 trades. */
  pfFloor?: number
  /** Max acceptable drawdown as a fraction of capital (e.g. 0.15 = 15%). */
  maxDrawdown?: number
  /** Public kill criteria : "when this bot gets cut". Plain FR sentences. */
  killCriteria: string[]
  /** "Ce bot en 3 phrases" — plain-FR summary for the novice layer. */
  threeSentences?: ThreeSentences
  /** Optional note explaining an expected quiet period (regime dormancy, fresh bot…). */
  dormancyNote?: string
  /** Per-bot override of the standard paper→real gate (PF/WR/trades/DD). */
  liveGate?: Partial<import('./path-to-real').LiveGate>
  /** Date this bot started trading real money (YYYY-MM-DD). Verified, never guessed. */
  liveSince?: string
}

const BOT_EXPECTATIONS: Record<string, BotExpectations> = {
  'v1-spot': {
    source:
      'Critères GO pré-enregistrés avant le passage en live (backtests 730 j par actif : PF ≥ 1.2, DD ≤ 15 %) + règles de risque du bot.',
    registeredAt: '2026-05-08',
    // Verified 2026-07-04: MIN(timestamp) of the live-only DB (apex_live_trades.db).
    // orb-bf25 has NO liveSince on purpose: its DB mixes migrated paper history and
    // real trades with no marker — no verifiable real-money start date yet.
    liveSince: '2026-05-08',
    pfFloor: 1.2,
    maxDrawdown: 0.15,
    killCriteria: [
      'Drawdown journalier ≥ 5 % → kill switch automatique, aucune entrée jusqu’au lendemain.',
      '3 pertes consécutives → pause forcée de 4 h (circuit breaker).',
      'Drawdown mensuel > 10 % → arrêt du trading pour le mois.',
      'Hors enveloppe (DD > 15 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
    ],
    threeSentences: {
      entry:
        'Il achète quand l’EMA 21 croise au-dessus de l’EMA 55 en H4, uniquement si le prix est au-dessus de l’EMA 200 et qu’une tendance réelle est confirmée (ADX par actif).',
      exit:
        'Il vend en trois paliers (50 / 30 / 20 %) avec passage au breakeven puis stop suiveur ; jamais de vente à découvert (spot uniquement).',
      risk:
        '1 % du capital risqué par trade (0,5 % en drawdown), stop initial à ATR × 2, kill switch automatique à −5 % sur une journée.',
    },
  },

  'funding-rev-long': {
    source:
      'Critères de mort pré-enregistrés le 2026-06-30 (avant tout run) ; backtest 2022-2026 univers HL∩Binance top-100 : PF 2.04, DD 13.8 %, walk-forward OOS 2.25, 5/5 années positives.',
    registeredAt: '2026-06-30',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'PF net < 1.30 → mort du bot (critère pré-enregistré, non négociable).',
      'Drawdown > 20 % → mort du bot.',
      '40 trades paper minimum avant toute considération de passage en réel.',
      'Aucun passage en réel sans kill-switch de régime (coupe les longs si BTC < EMA200 daily) : le backtest n’a connu aucun vrai marché baissier.',
    ],
    threeSentences: {
      entry:
        'Il achète un perpétuel après une capitulation, quand son funding devient extrêmement négatif par rapport à son propre historique (z-score) : un pari contrarian où le funding reçu joue en sa faveur.',
      exit:
        'Il revend quand l’excès de funding se normalise ou quand le rebond atteint sa cible d’extension (multiple d’ATR), avec stop de protection.',
      risk:
        'Long uniquement, exposition brute plafonnée à 0,35 × le capital ; pire drawdown du backtest : 13,8 %.',
    },
    dormancyNote:
      'Bot lancé en paper le 2026-07-01 : l’historique se construit, les signaux extrêmes sont rares par conception.',
  },

  'hlperps-xsec-degross': {
    source:
      'Gate durci pré-enregistré (DD ≤ 10 %) : verdict GO 2026-06-23 sur backtest 2022-2026, 669 perps ; 6 variantes de réduction de risque testées ensuite, aucune ne bat cette config (agenda clos 2026-06-25).',
    registeredAt: '2026-06-23',
    maxDrawdown: 0.1,
    killCriteria: [
      'Drawdown > 10 % → hors gate, bot coupé.',
      '40 trades paper minimum avant toute considération de passage en réel.',
      'Aucun stop par jambe, par décision testée : les stops cassent la neutralité dollar et dégradent le résultat (verdict 2026-06-25). Si cette règle change, elle sera annoncée ici.',
    ],
    threeSentences: {
      entry:
        'Chaque semaine, il classe ~120 perpétuels par momentum relatif et ouvre un panier : long sur les plus forts, short sur les plus faibles, à parts égales (dollar-neutre).',
      exit:
        'Il ne garde rien d’une semaine sur l’autre : le panier est intégralement reconstruit à chaque rebalance hebdomadaire.',
      risk:
        'Exposition brute plafonnée à 0,35 × le capital, ~6 jambes pondérées inverse-volatilité ; le pari porte sur l’écart entre forts et faibles, pas sur la direction du marché.',
    },
  },

  'orb-bf25': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %). Le backtest d’origine (PF 1.41 sur 25 actifs) s’est révélé optimiste : c’est le live qui juge, et il est affiché ici sans filtre.',
    registeredAt: '2026-06-20',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Levier plafonné à ×2 et 6 positions simultanées maximum ; tout dépassement est une anomalie qui déclenche un arrêt immédiat.',
      'Chaque changement de configuration passe un checkpoint public (dernier : sortie 4R, verdict KEEP le 2026-06-25).',
    ],
    threeSentences: {
      entry:
        'Il trade la cassure du range d’ouverture (Opening Range Breakout) en H1 sur ~24 perpétuels Hyperliquid, long ou short selon le sens de la cassure.',
      exit:
        'Il sécurise au breakeven à +1R puis laisse courir avec un stop suiveur jusqu’à un objectif de 4R.',
      risk:
        'Levier ×2 maximum, 6 positions simultanées maximum, stop initial sur chaque trade ; c’est un bot en argent réel, chaque trade est publié.',
    },
  },

  // ——— Enveloppes étendues le 2026-07-10 (audit flotte du 09/07) aux 5 bots paper
  // les mieux classés. Chiffres = gate standard APEX (PF ≥ 1.30, DD ≤ 20 %) + config
  // de risque du bot — jamais le réalisé.

  'combobbrsi-bf9': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %) + règles de risque du bot (1 % par trade, stop ATR×2, kill switch −3 %/jour).',
    registeredAt: '2026-07-10',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Kill switch automatique à −3 % sur une journée ; 5 pertes consécutives → pause forcée de 4 h.',
      '40 trades paper minimum et PF ≥ 1.30 avant toute considération de passage en réel.',
    ],
    threeSentences: {
      entry:
        'Il entre sur la cassure d’une bande de Bollinger (20, 2.5σ) en H4, uniquement si le RSI(21) confirme un momentum net dans le même sens (> 55 pour un long, < 45 pour un short).',
      exit:
        'Stop initial à ATR × 2 depuis l’entrée, take profit au double de la distance du stop (R:R 1:2).',
      risk:
        '1 % du capital risqué par trade, 8 positions simultanées maximum, plafond de risque journalier à 3 % ; entrées bloquées quand le régime de marché est RED.',
    },
  },

  'combosupermacd-bf11': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %) + règles de risque du bot (1 % par trade, stop ATR×2, kill switch −3 %/jour).',
    registeredAt: '2026-07-10',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Kill switch automatique à −3 % sur une journée ; 5 pertes consécutives → pause forcée de 4 h.',
      '40 trades paper minimum et PF ≥ 1.30 avant toute considération de passage en réel.',
    ],
    threeSentences: {
      entry:
        'Il suit la tendance donnée par le SuperTrend (7, 2.0) et entre au moment précis où le MACD rapide (8/21/5) croise son signal dans le sens de cette tendance, en H4 sur 11 perpétuels.',
      exit:
        'Stop initial à ATR × 2 depuis l’entrée, take profit au double de la distance du stop (R:R 1:2).',
      risk:
        '1 % du capital risqué par trade, 8 positions simultanées maximum, plafond de risque journalier à 3 % ; entrées bloquées quand le régime de marché est RED.',
    },
  },

  'macsimple-bf10': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %) + règles de risque du bot (1 % par trade, stop ATR×2, kill switch −3 %/jour).',
    registeredAt: '2026-07-10',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Kill switch automatique à −3 % sur une journée ; 5 pertes consécutives → pause forcée de 4 h.',
      '40 trades paper minimum et PF ≥ 1.30 avant toute considération de passage en réel.',
    ],
    threeSentences: {
      entry:
        'Il entre sur un croisement de moyennes mobiles simples — long quand la SMA 10 passe au-dessus de la SMA 30, short quand elle passe en dessous — en H4 sur 10 perpétuels.',
      exit:
        'Stop initial à ATR × 2 depuis l’entrée, take profit au double de la distance du stop (R:R 1:2).',
      risk:
        '1 % du capital risqué par trade, 8 positions simultanées maximum, plafond de risque journalier à 3 % ; entrées bloquées quand le régime de marché est RED.',
    },
  },

  'ttmsqueeze-bf7': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %) + règles de risque du bot (1 % par trade, stop ATR×2, kill switch −3 %/jour).',
    registeredAt: '2026-07-10',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Kill switch automatique à −3 % sur une journée ; 5 pertes consécutives → pause forcée de 4 h.',
      '40 trades paper minimum et PF ≥ 1.30 avant toute considération de passage en réel.',
    ],
    threeSentences: {
      entry:
        'Il attend qu’une phase de compression de volatilité (TTM Squeeze : Bollinger à l’intérieur du Keltner) se relâche, puis entre dans la direction indiquée par le momentum, en H4 sur 7 perpétuels.',
      exit:
        'Stop initial à ATR × 2 depuis l’entrée, take profit au double de la distance du stop (R:R 1:2).',
      risk:
        '1 % du capital risqué par trade, 8 positions simultanées maximum, plafond de risque journalier à 3 % ; entrées bloquées quand le régime de marché est RED.',
    },
  },

  'hatrend-bf28': {
    source:
      'Gate standard APEX pré-enregistré (PF ≥ 1.30, DD ≤ 20 %) + règles de risque du bot (1 % par trade, stop ATR×2, kill switch −3 %/jour).',
    registeredAt: '2026-07-10',
    pfFloor: 1.3,
    maxDrawdown: 0.2,
    killCriteria: [
      'Hors enveloppe (DD > 20 % ou PF < 1.0 après 20 trades) → bot gelé, autopsie publiée au journal.',
      'Kill switch automatique à −3 % sur une journée ; 5 pertes consécutives → pause forcée de 4 h.',
      '40 trades paper minimum et PF ≥ 1.30 avant toute considération de passage en réel.',
    ],
    threeSentences: {
      entry:
        'Il lisse les bougies H4 en HeikinAshi et entre après 3 bougies consécutives dans le même sens — long après 3 haussières, short après 3 baissières — sur 28 perpétuels.',
      exit:
        'Stop initial à ATR × 2 depuis l’entrée, take profit au double de la distance du stop (R:R 1:2).',
      risk:
        '1 % du capital risqué par trade, 8 positions simultanées maximum, plafond de risque journalier à 3 % ; entrées bloquées quand le régime de marché est RED.',
    },
  },
}

export function getBotExpectations(slug: string): BotExpectations | null {
  return BOT_EXPECTATIONS[slug] ?? null
}
