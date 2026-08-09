/**
 * The shared "how a configuration reaches the gauntlet, and what the gauntlet does" copy,
 * rendered ONCE, at the top of src/app/strategies/page.tsx (the library index). It used
 * to repeat on all 22 concept pages; it moved on 2026-08-08 because repeating it punished
 * exactly the visitor who browses several fiches. The concept pages now import only
 * GAUNTLET_EXPLAINER_TITLE and link to #comment-je-decide.
 *
 * Shared, not per-fiche, on purpose: this describes the ENGINE's process, which is identical
 * whatever the strategy. Writing it 22 times would guarantee 22 divergent explanations of the
 * same funnel, and the vocabulary here has to stay aligned with lab.algoproof.fr's
 * lib/engine-vocab.ts (« tamis », « épreuves finales », « gantelet », « les quatre épreuves »,
 * « candidate au test sans argent », « en sursis », « recalée »), which is the single place an
 * engine token becomes French.
 *
 * Numbers are DERIVED, not written (changed 2026-08-09). `gauntletFunnel(space)` reads the
 * EMAcross D1 cell from `engine_search_space_public` and interpolates. They stay the numbers of
 * ONE named worked example rather than an average: the 9 bases have param grids from 6 to 66
 * entries, so a generic "36 million" claim on the Ichimoku page would be false. One honest
 * worked example beats nine approximations.
 *
 * Two figures were REMOVED the same day because no published artifact supports them, and one is
 * deliberately still frozen:
 *   - cheap-gate pass rates (2,9 % H4 / 1,2 % H1): there is no EMAcross H1 unit at all, and the
 *     H4 rate computed from `cheap_gate_kills` is 7,6 %. The old figures predate the `dd`
 *     criterion leaving the judge on 2026-08-06, which is why they no longer reproduce.
 *   - "94 % of net rejects come from walk-forward": lives in a design document and in no report
 *     field, so it cannot be derived at all.
 *   - "11,4 Go" STAYS frozen: it is a dated incident, not a measurement that moves.
 *
 * Word choice is load-bearing (2026-08-02-filter-coverage-drilldown-design.md §6): the counts are
 * configurations ENUMERATED / SWEPT, never "backtested one by one" — the tamis and the behaviour
 * dedup remove most of them before any real computation.
 *
 * French, first person, reader is « tu », no em/en dashes.
 */

import { fr, variantsPhrase, type SearchSpace } from '@/lib/engine-search-space'

export const GAUNTLET_EXPLAINER_TITLE = 'Comment je décide qu’une stratégie mérite un bot'

/** The funnel copy, DERIVED from the engine's published counts rather than written.
 *
 *  `space` null (no backfilled unit, or the read failed) → the same sentences without the
 *  figures. Never a stale constant: on a page whose argument is that its numbers can be
 *  trusted, a figure that quietly stops matching the engine is worse than no figure.
 *
 *  ⚠️ TWO SENTENCES WERE REMOVED HERE ON 2026-08-09, ON PURPOSE — do not restore them from
 *  an older revision without a source.
 *  1. « En 4h il laisse passer 2,9 % des variantes. En 1h, 1,2 %. » Not reproducible from
 *     any published artifact. There is no EMAcross H1 unit at all, and the H4 cheap-gate
 *     pass rate computed from `cheap_gate_kills` is 7,6 %, not 2,9 %. The written figures
 *     predate the removal of the `dd` criterion from the judge on 2026-08-06 — that
 *     criterion killed 99,95 % of behaviours, so the pass rate jumped when it left.
 *     Recomputing would mean guessing which denominator the original used.
 *  2. « 94 % des rejets nets viennent de cette épreuve » (in GAUNTLET_TRIALS). It exists in
 *     a design document and in NO report field, so it cannot be derived at all. Publishing
 *     it would be asserting a measurement nobody made. */
export function gauntletFunnel(space: SearchSpace | null): readonly string[] {
  const sweep = space
    ? `mon moteur y balaie ${fr(space.nParams)} jeux de périodes, ${fr(space.nFilterConfigs)} combinaisons de filtres d’entrée et ${fr(space.nExits)} façons de sortir, ce qui donne ${variantsPhrase(space)} de variantes pour un seul horizon de temps. Personne ne lit ça à la main.`
    : 'mon moteur y balaie toutes les périodes, toutes les combinaisons de filtres d’entrée et toutes les façons de sortir, ce qui donne des dizaines de millions de variantes pour un seul horizon de temps. Personne ne lit ça à la main.'

  const judged = space
    ? `j’envoie les ${fr(space.nJudged)} premières au gantelet`
    : 'j’envoie les mieux classées au gantelet'
  const total = space
    ? ` Le corpus complet, ${fr(space.nBehaviors)} comportements distincts pour cet exemple, est écrit dans chaque rapport à côté du nombre jugé.`
    : ' Le corpus complet est écrit dans chaque rapport à côté du nombre jugé.'

  return [
    `Tester une stratégie, chez moi, ça veut dire tester toutes ses variantes, et pas un réglage que j’aurais choisi à l’avance. Prends l’EMA cross, celle que je fais tourner en argent réel : ${sweep}`,
    'Le premier tri est bête et brutal, et c’est ce qu’on lui demande. Je l’appelle le tamis. Il jette tout ce qui perd de l’argent, et tout ce qui compte trop peu de trades pour qu’on puisse en dire quoi que ce soit, sans lancer le moindre calcul coûteux.',
    // « 11,4 Go » reste FIGÉ et c'est délibéré : c'est un incident daté, pas une mesure qui
    // évolue. Le dériver n'aurait aucun sens ; le laisser sans ce commentaire inviterait
    // quelqu'un à le « corriger » en compteur vivant.
    `Parmi les survivantes, je classe par profit factor sur les douze derniers mois (PF : ce que la stratégie gagne divisé par ce qu’elle perd) et ${judged}. Les suivantes ne sont pas recalées pour autant. Je ne les ai simplement pas jugées, elles restent non jugées sur le disque.${total} La première fois que j’ai voulu tout juger d’un coup, le noyau a tué ma machine à 11,4 Go de mémoire. Le plafond vient de là.`,
  ]
}

export const GAUNTLET_TRIALS: readonly { readonly name: string; readonly plain: string }[] = [
  {
    name: 'Tenir sur du jamais-vu',
    plain:
      'Je découpe l’historique en tranches, je règle la configuration sur certaines, puis je la teste sur celles qu’elle n’a jamais vues. C’est l’épreuve qui en tue le plus.',
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
