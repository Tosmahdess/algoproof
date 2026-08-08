/**
 * The shared "how a configuration reaches the gauntlet, and what the gauntlet does" copy,
 * rendered on all 22 concept pages by src/app/strategies/[concept]/page.tsx.
 *
 * Shared, not per-fiche, on purpose: this describes the ENGINE's process, which is identical
 * whatever the strategy. Writing it 22 times would guarantee 22 divergent explanations of the
 * same funnel, and the vocabulary here has to stay aligned with lab.algoproof.fr's
 * lib/engine-vocab.ts (« tamis », « épreuves finales », « gantelet », « les quatre épreuves »,
 * « candidate au test sans argent », « en sursis », « recalée »), which is the single place an
 * engine token becomes French.
 *
 * Numbers are the EMAcross D1 cell, labelled as such in the copy. They are not invented and not
 * per-strategy: the 9 bases in the engine matrix have param grids from 6 to 66 entries, so a
 * generic "36 million" claim on the Ichimoku page would be false. One honest worked example beats
 * nine approximations. Sources: DECISIONS.md D-APX-GATE-4 (the 20 000 cap and its disclosure),
 * D-APX-GATE-1/2 (measured cheap-gate pass rates 10 % D1 / 2,9 % H4 / 1,2 % H1),
 * 2026-08-05-apex-gauntlet-continuous-scaling-design.md §2 (gauntlet stages, walk-forward
 * carrying 94 % of hard rejects), and the EMAcross D1 report itself (66 params, 17 780 filter
 * configs, 31 exits, 2 782 865 distinct behaviours, 20 000 judged).
 *
 * Word choice is load-bearing (2026-08-02-filter-coverage-drilldown-design.md §6): the counts are
 * configurations ENUMERATED / SWEPT, never "backtested one by one" — the tamis and the behaviour
 * dedup remove most of them before any real computation.
 *
 * French, first person, reader is « tu », no em/en dashes.
 */

export const GAUNTLET_EXPLAINER_TITLE = 'Comment je décide qu’une stratégie mérite un bot'

export const GAUNTLET_FUNNEL: readonly string[] = [
  'Tester une stratégie, chez moi, ça veut dire tester toutes ses variantes, et pas un réglage que j’aurais choisi à l’avance. Prends l’EMA cross, celle que je fais tourner en argent réel : mon moteur y balaie 66 jeux de périodes, 17 780 combinaisons de filtres d’entrée et 31 façons de sortir, ce qui donne un peu plus de 36 millions de variantes pour un seul horizon de temps. Personne ne lit 36 millions de lignes.',
  'Le premier tri est bête et brutal, et c’est ce qu’on lui demande. Je l’appelle le tamis. Il jette tout ce qui perd de l’argent, et tout ce qui compte trop peu de trades pour qu’on puisse en dire quoi que ce soit, sans lancer le moindre calcul coûteux. En 4h il laisse passer 2,9 % des variantes. En 1h, 1,2 %.',
  'Parmi les survivantes, je classe par profit factor sur les douze derniers mois (PF : ce que la stratégie gagne divisé par ce qu’elle perd) et j’envoie les 20 000 premières au gantelet. Les suivantes ne sont pas recalées pour autant. Je ne les ai simplement pas jugées, elles restent non jugées sur le disque, et le nombre total est écrit dans chaque rapport à côté des 20 000. La première fois que j’ai voulu tout juger d’un coup, le noyau a tué ma machine à 11,4 Go de mémoire. Le plafond vient de là.',
]

export const GAUNTLET_TRIALS: readonly { readonly name: string; readonly plain: string }[] = [
  {
    name: 'Tenir sur du jamais-vu',
    plain:
      'Je découpe l’historique en tranches, je règle la configuration sur certaines, puis je la teste sur celles qu’elle n’a jamais vues. C’est là que ça meurt le plus : 94 % des rejets nets viennent de cette épreuve.',
  },
  {
    name: 'Battre le hasard, pas seulement le marché',
    plain:
      'Je rebats les cartes des milliers de fois pour fabriquer des versions fausses de la même stratégie, celles qu’elle aurait pu être par pure chance. Si la vraie ne sort pas nettement du lot, elle ne prouve rien.',
  },
  {
    name: 'Survivre à la perte de son meilleur marché',
    plain:
      'Je retire l’actif qui a porté le résultat, et je regarde ce qu’il reste. Si tout tenait sur un seul marché, ça ne compte pas.',
  },
  {
    name: 'Convaincre assez de marchés',
    plain:
      'Combien d’actifs sont réellement d’accord avec elle. Deux qui marchent et vingt qui traînent, ça ne suffit pas.',
  },
]

export const GAUNTLET_VERDICTS: readonly string[] = [
  'Au bout, trois issues. Recalée. En sursis, quand elle passe de justesse. Candidate au test sans argent réel, quand elle tient les quatre épreuves. Une candidate n’est pas une gagnante : elle a gagné le droit d’être surveillée.',
]

export const GAUNTLET_HONESTY: readonly string[] = [
  'Reste une limite que je préfère écrire noir sur blanc plutôt que de la laisser se découvrir. Après autant d’essais, prouver qu’une configuration ne doit rien à la chance demanderait une barre statistique plus haute que ce que mon test sait mesurer. Je te montre donc des candidates, et je publie combien j’en ai essayé. Les plateformes qui vendent des stratégies publient leurs gagnantes, jamais leur nombre de tentatives.',
  'Toutes les stratégies de cette bibliothèque ne sont pas encore passées par là : le moteur avance stratégie par stratégie, horizon par horizon, et publie au fil de l’eau. Ce qu’il a jugé jusqu’ici est public, et l’EMA cross est ouverte en entier pour que tu voies à quoi ressemble un dossier complet.',
]

// The access sentence closes the explainer. Structured (before / link / after)
// so the component can make the middle segment clickable while the copy tests
// keep asserting on the full sentence. The price mirrors what
// lab.algoproof.fr/membre actually displays (0 € / 29 € per month) — if the
// offer changes there, this label changes with it.
export const GAUNTLET_ACCESS = {
  before:
    'Les autres dossiers complets, réglages compris, se débloquent avec l’abonnement du labo : ',
  linkLabel: 'compare le compte gratuit (0 €) et l’offre membre (29 € par mois)',
  href: 'https://lab.algoproof.fr/membre',
  after: ' et prends ce qui te suffit.',
} as const
