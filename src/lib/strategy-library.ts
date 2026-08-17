// src/lib/strategy-library.ts
// La Bibliothèque des stratégies : one honest fiche per Lab strategy — how it
// works, when it wins, when it dies, which knobs matter. Free SEO tier of the
// Académie plan (brainstorm 2026-07-11 §12.1). Ported from lab.algoproof.fr
// (Plan 3 Task 1): showcase content belongs on the showcase domain, so it
// carries the SEO instead of living behind the tooling subdomain.
//
// The link to a fleet bot used to be hand-written here (botSlug). It is now
// derived from the fleet at read time (see incarnations.ts) — a fiche no
// longer needs an edit every time the engine promotes a bot. Copy rules:
// French, first person, no em/en dashes.
import type { Family } from './families'
import { FAMILY_ORDER } from './families'

export interface StrategyParamNote {
  name: string;    // exact engine param name (credibility + copy-paste into the Lab)
  role: string;
  pitfall?: string;
}

export interface StrategyFiche {
  slug: string;         // URL slug, /strategies/<slug>
  strategyId: string;   // exact Lab strategy name (anti-drift tested)
  title: string;
  family: Family;
  oneLiner: string;
  // readonly, so `STRATEGY_FICHES` below can be `as const satisfies` this shape:
  // that is what turns `slug` from `string` into a union of the 22 literals and
  // lets strategy-keys.ts fail `tsc` on a mistyped fiche slug.
  logic: readonly string[];      // "comment ça marche", plain French paragraphs
  worksWhen: readonly string[];
  diesWhen: readonly string[];
  params: readonly StrategyParamNote[];
  labHref: string;      // "Tester cette stratégie dans le Lab"
  presetHref?: string;  // reproduce the real bot in one click, when a preset exists
}

// Declared `as const` so the slugs survive as literal types (see FicheSlug
// below), then re-exported through the wide `readonly StrategyFiche[]` alias so
// every consumer keeps seeing one uniform fiche shape rather than 22 narrowed
// object types (a fiche without `presetHref` would otherwise not even have the
// property to test for).
const FICHES = [
  {
    slug: "ema-cross",
    strategyId: "ema_cross",
    title: "EMA Cross",
    family: "trend",
    oneLiner:
      "Le suivi de tendance le plus simple qui existe : deux moyennes mobiles, un croisement, une direction.",
    logic: [
      "Deux moyennes mobiles exponentielles suivent le prix : une rapide, réactive, et une lente, qui donne la tendance de fond. Quand la rapide croise la lente vers le haut, le mouvement de fond est en train de tourner haussier : j'entre long. Croisement vers le bas : short, ou sortie quand le marché ne permet pas de shorter.",
      "Tout l'intérêt est dans le retard assumé : l'EMA cross n'attrape jamais le plancher ni le sommet. Elle vise le milieu du mouvement, quand il existe. C'est la stratégie que je fais tourner en argent réel sur mon bot V1 spot, en 4h.",
    ],
    worksWhen: [
      "Les marchés qui font de vraies tendances longues : crypto majors en régime directionnel, indices en bull run.",
      "Les timeframes 4h et au-delà : en dessous, le bruit multiplie les faux croisements.",
      "Quand tu acceptes un win rate bas (30 à 40 %) compensé par des gains nettement plus gros que les pertes.",
    ],
    diesWhen: [
      "Les marchés en range : chaque oscillation produit un croisement, chaque croisement un faux signal, et les frais font le reste.",
      "2026 en est l'exemple vivant : régime non directionnel, mes bots de tendance sont en dormance plutôt qu'en sur-trading. Zéro trade est parfois la bonne réponse.",
      "Les périodes trop proches l'une de l'autre : plus de signaux, plus de bruit, rarement plus de gain.",
    ],
    params: [
      {
        name: "fast_period",
        role: "La période de l'EMA rapide. Plus elle est courte, plus tu réagis vite et plus tu prends de faux signaux.",
        pitfall: "La descendre pour « rattraper » les entrées ratées : tu échanges du retard contre du bruit, et le bruit coûte des frais.",
      },
      {
        name: "slow_period",
        role: "La période de l'EMA lente : la tendance de fond contre laquelle la rapide se compare.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR : il respire avec la volatilité au lieu d'être un pourcentage arbitraire.",
        pitfall: "Trop serré (sous 1,5), la respiration normale du marché te sort juste avant le mouvement que tu attendais.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque. À 2, tu vises deux fois ta perte potentielle : c'est ce ratio qui rend un win rate de 35 % viable.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=ema_cross",
    // No presetHref: the only 1-click config is the PEDAGOGIC one (Binance
    // fees) while the real bot trades on Kraken — a "reproduire ma config
    // réelle" button on it would lie. Re-add when a true v1-spot preset
    // (Kraken fees, /USDC pairs) exists in fleet-presets.
  },
  {
    slug: "ichimoku",
    strategyId: "ichimoku",
    title: "Ichimoku",
    family: "trend",
    oneLiner:
      "Un système japonais complet : tendance, momentum et zones de contrôle dans un seul indicateur.",
    logic: [
      "L'Ichimoku superpose trois lectures. La Tenkan (moyenne courte) et la Kijun (moyenne longue) donnent le signal par leur croisement. Le nuage, projeté en avant, dit si le terrain est haussier, baissier ou indécis.",
      "La règle que j'utilise : un croisement Tenkan/Kijun DANS le sens du nuage. Le nuage sert de filtre : un signal long sous un nuage baissier est ignoré, peu importe sa netteté.",
      "Le Lab propose deux modes d'entrée : « cross » (le croisement exact, celui de mon bot réel) et « state » (l'entrée dès que l'état est aligné, plus robuste au bruit). Les deux se backtestent et se comparent.",
    ],
    worksWhen: [
      "Les tendances installées, où le nuage filtre une bonne partie des faux départs.",
      "Les timeframes 4h et journalier : l'indicateur a été pensé pour des horizons lents.",
      "Quand tu veux un système complet plutôt qu'un empilement d'indicateurs disparates.",
    ],
    diesWhen: [
      "Les ranges serrés : le prix traverse le nuage dans les deux sens et chaque traversée a l'air d'un début de tendance.",
      "Les retournements brutaux : tout l'Ichimoku est construit sur des moyennes, il arrive après la bataille.",
      "Les actifs jeunes ou peu liquides, où 52 périodes d'historique ne veulent pas encore dire grand-chose.",
    ],
    params: [
      {
        name: "tenkan_p",
        role: "La période de la Tenkan, la ligne rapide (9 en réglage classique).",
      },
      {
        name: "kijun_p",
        role: "La période de la Kijun, la ligne de fond (26 en classique) : c'est elle que la Tenkan doit croiser.",
      },
      {
        name: "senkou_b_p",
        role: "La période de la frontière lente du nuage (52 en classique) : elle fixe l'épaisseur et l'inertie du filtre.",
        pitfall: "Les réglages « classiques » 9/26/52 viennent de la bourse japonaise des années 70 (6 jours de cotation par semaine). Les garder par tradition sur de la crypto en 4h est déjà un choix de paramètres, pas une évidence.",
      },
      {
        name: "entry_mode",
        role: "« cross » entre au croisement exact (mon bot réel), « state » entre dès que l'alignement est là : moins précis, plus robuste.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=ichimoku",
    presetHref: "https://lab.algoproof.fr/lab?preset=ichimoku-bf25&run=1",
  },
  {
    slug: "rsi-divergence",
    strategyId: "rsi_divergence",
    title: "RSI Divergence",
    family: "mean-reversion",
    oneLiner:
      "Chercher le moment où le prix ment : il inscrit un nouvel extrême, mais le momentum n'y croit plus.",
    logic: [
      "Le RSI mesure la force du mouvement. Une divergence apparaît quand le prix fait un nouveau plus bas alors que le RSI, lui, remonte : les vendeurs poussent encore le prix, mais avec de moins en moins de conviction. C'est le signal d'un retournement possible, dans les deux sens.",
      "La stratégie scanne les dernières bougies à la recherche de cette contradiction et entre au retournement supposé, stop derrière l'extrême qui vient d'être inscrit.",
    ],
    worksWhen: [
      "Les fins de mouvements étirés, quand le marché a couru trop vite dans un sens.",
      "Les actifs liquides, où le RSI reflète un vrai rapport de force et pas trois ordres isolés.",
      "En complément d'un niveau (support, résistance) : la divergence date le retournement, le niveau le localise.",
    ],
    diesWhen: [
      "Les tendances puissantes : diverger contre un marché qui monte, c'est rattraper des couteaux qui tombent. Une divergence peut en cacher trois autres, chacune plus chère que la précédente.",
      "Les timeframes courts, où chaque micro-rebond dessine une fausse divergence.",
      "Les régimes de faible volatilité : le RSI oscille autour de 50 et les « extrêmes » n'en sont pas.",
    ],
    params: [
      {
        name: "rsi_period",
        role: "La période du RSI (14 en classique). Plus courte, plus nerveuse : plus de divergences détectées, moins fiables.",
      },
      {
        name: "divergence_lookback",
        role: "La fenêtre de détection, en bougies : la distance maximale entre les deux extrêmes comparés.",
        pitfall: "Trop courte, elle rate les divergences lentes ; trop longue, elle compare des extrêmes qui n'ont plus rien à voir entre eux et en invente.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque. Les retournements s'essoufflent vite : viser trop loin transforme des gagnants en perdants.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=rsi_divergence",
  },
  {
    slug: "ma-cross",
    strategyId: "ma_cross",
    title: "MA Cross",
    family: "trend",
    oneLiner:
      "Le croisement de moyennes générique : la même mécanique que l'EMA cross, avec le type de moyenne en paramètre.",
    logic: [
      "Même principe que l'EMA cross : une moyenne rapide croise une moyenne lente et donne la direction. La différence est le paramètre ma_type : simple (SMA), exponentielle (EMA), pondérée (WMA), de Hull (HMA) ou triple exponentielle (TEMA). Chaque type arbitre autrement entre réactivité et lissage.",
      "C'est la fiche à utiliser pour comparer les types de moyennes entre eux, à périodes égales : le Lab permet de mettre les cinq dans une même grille et de voir si la différence survit aux frais.",
    ],
    worksWhen: [
      "Les mêmes régimes que l'EMA cross : tendances longues, timeframes 4h et plus.",
      "La HMA et la TEMA réagissent plus vite dans les retournements francs : utile quand la tendance change de camp brutalement.",
      "En recherche : c'est un excellent banc d'essai pour comprendre ce que « lissage » veut dire concrètement.",
    ],
    diesWhen: [
      "Les ranges, comme tout croisement de moyennes : le bruit fabrique des signaux, les frais font le reste.",
      "Le piège du sur-choix : cinq types de moyennes multiplié par les périodes, c'est déjà une grille énorme. Plus tu testes de combinaisons, plus la meilleure est probablement un accident.",
      "Les moyennes très rapides (HMA courte) sur les petits timeframes : la réactivité devient de l'hyperactivité.",
    ],
    params: [
      {
        name: "ma_type",
        role: "Le type de moyenne : sma, ema, wma, hma ou tema. Change la vitesse de réaction à périodes égales.",
        pitfall: "Choisir le type qui a le mieux marché sur ta fenêtre de test, sans te demander pourquoi : c'est un paramètre d'overfit comme un autre.",
      },
      {
        name: "fast_period",
        role: "La période de la moyenne rapide.",
      },
      {
        name: "slow_period",
        role: "La période de la moyenne lente, la référence de tendance.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR, qui respire avec la volatilité.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=ma_cross",
  },
  {
    slug: "kama-cross",
    strategyId: "kama_cross",
    title: "KAMA Cross",
    family: "trend",
    oneLiner:
      "Une moyenne qui change de vitesse toute seule : rapide quand le marché est directionnel, lente quand il bruite.",
    logic: [
      "La KAMA (moyenne adaptative de Kaufman) mesure d'abord l'efficacité du mouvement : est-ce que le prix va quelque part, ou est-ce qu'il fait du surplace ? Quand le mouvement est efficace, la moyenne accélère et colle au prix ; quand c'est du bruit, elle ralentit et s'aplatit.",
      "Le signal est le passage du prix au-dessus ou en dessous de cette ligne adaptative. L'idée séduisante : une moyenne qui filtre les ranges d'elle-même, sans paramètre de période à deviner.",
    ],
    worksWhen: [
      "Les alternances nettes entre phases calmes et phases directionnelles : c'est exactement ce que la KAMA sait détecter.",
      "Les actifs qui font des tendances propres entrecoupées de consolidations plates.",
      "Quand tu veux moins de faux signaux qu'un croisement classique, au prix d'entrées un peu plus tardives.",
    ],
    diesWhen: [
      "Les ranges volatils : le prix bouge beaucoup sans aller nulle part, l'efficacité oscille, la ligne hésite et le signal aussi.",
      "Les retournements en V : la moyenne était en mode lent au moment du retournement, elle met du temps à ré-accélérer.",
      "L'illusion du « sans paramètre » : er_period, fast_sc et slow_sc sont bien trois paramètres, et ils s'overfittent comme les autres.",
    ],
    params: [
      {
        name: "er_period",
        role: "La fenêtre de calcul de l'efficacité du mouvement : le cœur de l'adaptativité.",
        pitfall: "Trop courte, la moyenne change de vitesse en permanence et le filtre ne filtre plus rien.",
      },
      {
        name: "fast_sc",
        role: "La constante de lissage en mode rapide : la vitesse maximale de la moyenne.",
      },
      {
        name: "slow_sc",
        role: "La constante de lissage en mode lent : la vitesse plancher, celle des marchés qui bruitent.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=kama_cross",
  },
  {
    slug: "ema-ribbon",
    strategyId: "ema_ribbon",
    title: "EMA Ribbon",
    family: "trend",
    oneLiner:
      "Quatre moyennes alignées comme un ruban : on n'entre que quand toutes racontent la même histoire.",
    logic: [
      "Quatre EMA de périodes croissantes forment un ruban. Quand elles sont parfaitement ordonnées (la plus rapide au-dessus, la plus lente en dessous), la tendance est propre et alignée sur tous les horizons : c'est le signal d'entrée.",
      "La sortie optionnelle sur cassure du ruban (exit_on_ribbon_break) referme la position dès que l'alignement se défait, sans attendre le stop : le ruban sert alors de trailing de tendance.",
    ],
    worksWhen: [
      "Les grandes tendances propres, où l'alignement des quatre horizons dure des semaines.",
      "Quand tu veux une confirmation forte et peu de trades : le ruban aligné est une condition exigeante.",
      "Avec la sortie sur cassure activée, pour laisser courir sans rendre tout le gain au retournement.",
    ],
    diesWhen: [
      "Les marchés hésitants : le ruban se tresse et se détresse, chaque alignement éphémère coûte une entrée.",
      "Les tendances en dents de scie : l'alignement casse à chaque pullback profond, la sortie sur cassure te fait descendre du train trop tôt.",
      "L'entrée tardive par construction : quand quatre moyennes sont alignées, une partie du mouvement est déjà consommée.",
    ],
    params: [
      {
        name: "ema_p1",
        role: "La période de l'EMA la plus rapide du ruban (puis ema_p2, ema_p3, ema_p4 en croissant).",
      },
      {
        name: "exit_on_ribbon_break",
        role: "Sortir dès que l'alignement se défait, au lieu d'attendre stop ou objectif. C'est le réglage de mon bot réel.",
        pitfall: "Désactivée, la stratégie garde ses positions à travers les retournements : le backtest peut sembler plus calme mais les drawdowns individuels grossissent.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR, filet de sécurité derrière la sortie de ruban.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque, si tu préfères une cible fixe au trailing.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=ema_ribbon",
  },
  {
    slug: "supertrend",
    strategyId: "supertrend",
    title: "Supertrend",
    family: "trend",
    oneLiner:
      "Une ligne unique sous ou sur le prix, calée sur la volatilité : au-dessus tu es long, en dessous tu es short.",
    logic: [
      "Le Supertrend trace une bande à une distance du prix proportionnelle à l'ATR. Tant que le prix reste du bon côté, la ligne suit le mouvement comme un trailing stop ; quand le prix la traverse, la tendance est déclarée retournée et la ligne saute de l'autre côté.",
      "C'est un indicateur binaire et lisible : une seule ligne, une seule couleur, pas d'interprétation. Sa popularité vient de là, ses limites aussi.",
    ],
    worksWhen: [
      "Les tendances soutenues avec des pullbacks modérés : la bande ATR absorbe la respiration sans lâcher la position.",
      "Les actifs volatils où un stop fixe en pourcentage serait toujours trop serré ou trop large : ici la distance s'adapte.",
      "En sortie de squeeze ou de range : la première traversée franche donne souvent la direction du vrai mouvement.",
    ],
    diesWhen: [
      "Les ranges : le prix traverse la ligne dans les deux sens et chaque traversée est un trade perdant. C'est LE point faible connu.",
      "Les mèches de volatilité : une seule bougie extrême suffit à faire basculer l'indicateur, même si le mouvement se renverse la bougie suivante.",
      "Un multiplicateur trop petit : la ligne colle au prix et le suivi de tendance devient un générateur d'allers-retours.",
    ],
    params: [
      {
        name: "st_atr_period",
        role: "La période de l'ATR qui fixe la distance de la bande.",
      },
      {
        name: "st_multiplier",
        role: "Le multiplicateur de cette distance : le vrai réglage de sensibilité du Supertrend.",
        pitfall: "En dessous de 2, l'indicateur bascule au moindre pullback ; c'est le paramètre le plus overfitté de la stratégie.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR, indépendant de la ligne Supertrend.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=supertrend",
  },
  {
    slug: "heikin-ashi",
    strategyId: "heikin_ashi",
    title: "Heikin Ashi Trend",
    family: "trend",
    oneLiner:
      "Des bougies lissées qui gomment le bruit : on entre après une série de bougies de la même couleur.",
    logic: [
      "Les bougies Heikin Ashi sont recalculées à partir de moyennes des bougies classiques : les petites hésitations disparaissent et les phases directionnelles ressortent en séries de bougies uniformes.",
      "La stratégie compte les bougies consécutives de même couleur (le paramètre consec) et entre quand la série atteint le seuil : une tendance assez têtue pour durer plusieurs bougies lissées mérite d'être suivie.",
    ],
    worksWhen: [
      "Les tendances régulières, sans cassures brutales : le lissage y est un avantage pur.",
      "Les timeframes intermédiaires (4h) où une série de 3 ou 4 bougies uniformes représente déjà un vrai engagement du marché.",
      "Pour les profils qui sur-tradent : le lissage impose mécaniquement de la patience.",
    ],
    diesWhen: [
      "Le lissage a un prix : les bougies Heikin Ashi sont EN RETARD sur le prix réel. L'entrée et la sortie se font toujours après coup.",
      "Les marchés nerveux qui alternent les couleurs : la série n'atteint jamais le seuil, ou l'atteint juste avant le retournement.",
      "Le piège du backtest : les bougies lissées donnent une impression de netteté que le prix réel exécuté n'a jamais eue.",
    ],
    params: [
      {
        name: "consec",
        role: "Le nombre de bougies Heikin Ashi consécutives de même couleur exigé avant d'entrer.",
        pitfall: "À 2, tu entres sur du bruit lissé ; à 6, tu entres quand le mouvement est déjà consommé. La sensibilité de ce seul entier fait toute la stratégie.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR, calculé sur les prix réels, pas sur les bougies lissées.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=heikin_ashi",
    presetHref: "https://lab.algoproof.fr/lab?preset=hatrend-bf28&run=1",
  },
  {
    slug: "chandelier-exit",
    strategyId: "chandelier",
    title: "Chandelier Exit",
    family: "trend",
    oneLiner:
      "Un trailing stop suspendu au plus haut du mouvement : la sortie est la stratégie.",
    logic: [
      "Le Chandelier Exit accroche un stop à une distance ATR sous le plus haut récent (ou au-dessus du plus bas pour un short). Le stop monte avec le mouvement, jamais l'inverse : tu rends une part fixe de volatilité, pas plus.",
      "Dans le Lab, l'entrée se fait sur cassure des extrêmes récents et la sortie optionnelle exit_on_chandelier applique le trailing : c'est une philosophie complète où l'on ne prédit pas la fin du mouvement, on se laisse sortir par elle.",
    ],
    worksWhen: [
      "Les grandes tendances dont personne ne connaît la fin : le trailing capture ce que les objectifs fixes laissent sur la table.",
      "Les actifs qui font des mouvements longs avec des pullbacks proportionnels à leur volatilité.",
      "Quand ton problème est de sortir trop tôt : le chandelier t'interdit de couper un gagnant par impatience.",
    ],
    diesWhen: [
      "Les marchés en escalier qui rendent tout au premier décrochage : le stop suit de loin et la sortie rend une grosse part du gain.",
      "Les ranges : les cassures d'extrêmes sont des faux départs en série.",
      "Ma leçon de flotte 2026 : le sweep de sorties a montré qu'un multiplicateur trop large laissait repartir des gains entiers ; le bot réel tourne resserré depuis.",
    ],
    params: [
      {
        name: "chandelier_period",
        role: "La fenêtre du plus haut (ou plus bas) de référence auquel le stop est suspendu.",
      },
      {
        name: "atr_mult",
        role: "La distance du stop sous l'extrême, en multiples d'ATR : la part de volatilité que tu acceptes de rendre.",
        pitfall: "C'est le réglage que ma flotte a re-calibré en réel (3.0 vers 2.5) : trop large, tu rends le mouvement ; trop serré, la respiration normale te sort.",
      },
      {
        name: "exit_on_chandelier",
        role: "Activer la sortie trailing : c'est elle qui fait la stratégie. Désactivée, il reste une simple cassure d'extrêmes.",
      },
      {
        name: "tp_r",
        role: "L'objectif fixe optionnel, si tu veux plafonner au lieu de laisser courir.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=chandelier",
  },
  {
    slug: "donchian",
    strategyId: "donchian",
    title: "Donchian Breakout",
    family: "breakout",
    oneLiner:
      "La cassure la plus ancienne du trading systématique : acheter le plus haut des N dernières bougies.",
    logic: [
      "Le canal de Donchian trace le plus haut et le plus bas des N dernières bougies. Quand le prix casse le plus haut, il fait quelque chose qu'il n'avait pas fait depuis N périodes : c'est la définition la plus simple d'un début de tendance, et on entre dessus.",
      "C'est la mécanique des Turtle Traders des années 80, sans folklore : pas d'indicateur dérivé, juste le prix contre son propre historique. Mon bot Donchian tourne sur cette logique exacte, et c'est l'exemple « bot réel » des cartes du Lab.",
    ],
    worksWhen: [
      "Les vrais départs de tendance : par construction, la stratégie ne rate jamais un grand mouvement, elle est déjà dedans.",
      "Les actifs qui font des plus hauts en série une fois lancés (crypto majors en régime directionnel).",
      "Quand tu veux une stratégie sans opinion : elle ne prédit rien, elle suit ce qui casse.",
    ],
    diesWhen: [
      "Les fausses cassures : le range qui déborde d'un tick, te fait entrer, et referme. C'est le coût structurel de la stratégie.",
      "Les marchés sans tendance : 100 % des cassures sont fausses, et le win rate déjà bas devient intenable.",
      "Un buffer d'entrée à zéro sur les actifs à spread : tu achètes systématiquement le pire prix de la cassure.",
    ],
    params: [
      {
        name: "lookback_period",
        role: "La profondeur du canal : casser un plus haut de 20 bougies n'a pas le même sens qu'un plus haut de 55.",
        pitfall: "Les valeurs mythiques (20 et 55, héritées des Turtles) ne sont pas magiques : elles datent de marchés à 6 jours de cotation. Teste autour, pas dessus.",
      },
      {
        name: "entry_breakout_buffer_pct",
        role: "La marge au-delà de l'extrême avant de valider la cassure : le filtre anti-débordement d'un tick.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR sous le point de cassure.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque, ou laisse courir avec un trailing selon ton profil.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=donchian",
    presetHref: "https://lab.algoproof.fr/lab?preset=donchian-bf17&run=1",
  },
  {
    slug: "keltner",
    strategyId: "keltner",
    title: "Keltner Channel",
    family: "breakout",
    oneLiner:
      "Un canal centré sur une EMA, aux bords en ATR : la sortie du canal signale l'anomalie qui commence.",
    logic: [
      "Le canal de Keltner entoure une EMA centrale de deux bandes distantes d'un multiple d'ATR. Tant que le prix vit dans le canal, il est « normal » ; quand il en sort, il fait statistiquement mieux que sa volatilité récente, et c'est ce déséquilibre qu'on trade.",
      "À la différence des Bollinger (écart-type), les bandes ATR réagissent plus doucement aux chocs isolés : le canal est plus stable, les sorties plus rares et plus franches. C'est la stratégie de mon bot or (XAU) sur Hyperliquid, qui tourne en simulation.",
    ],
    worksWhen: [
      "Les départs de mouvement après compression : la sortie du canal est un excellent détecteur d'accélération.",
      "Les actifs à tendance lourde (métaux, indices) où sortir du canal veut vraiment dire quelque chose.",
      "En combinaison avec un filtre de tendance : sortie de canal DANS le sens du fond de marché.",
    ],
    diesWhen: [
      "Les ranges volatils : le prix sort du canal dans les deux sens sans jamais donner suite.",
      "Les bandes trop serrées (atr_mult faible) : tout devient « anomalie », plus rien ne l'est.",
      "Les annonces macro : la sortie de canal est mécanique pendant un chiffre d'inflation, mais la direction ne tient pas.",
    ],
    params: [
      {
        name: "ema_period",
        role: "La période de l'EMA centrale, le « prix normal » de référence.",
      },
      {
        name: "kc_atr_period",
        role: "La période de l'ATR qui fixe la largeur des bandes.",
      },
      {
        name: "atr_mult",
        role: "Le multiplicateur des bandes : la définition de ce qui compte comme anomalie.",
        pitfall: "Le baisser pour avoir plus de signaux transforme un détecteur d'anomalies en détecteur de bruit.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=keltner",
    presetHref: "https://lab.algoproof.fr/lab?preset=keltner-hlperps-xau&run=1",
  },
  {
    slug: "atr-channel",
    strategyId: "atr_channel",
    title: "ATR Channel",
    family: "breakout",
    oneLiner:
      "Le cousin du Keltner sur moyenne simple : un canal de volatilité autour d'une SMA, cassé = suivi.",
    logic: [
      "Une SMA centrale, deux bandes à un multiple d'ATR : quand le prix clôture au-delà de la bande, on entre dans le sens de la cassure. La construction est presque identique au Keltner ; la moyenne simple rend le centre un peu plus lent et les cassures un peu plus rares.",
      "L'intérêt de l'avoir en fiche séparée est justement la comparaison : mêmes périodes, même multiplicateur, et des résultats différents. C'est un bon exercice de sensibilité aux choix « anodins ».",
    ],
    worksWhen: [
      "Les mêmes terrains que le Keltner : départs de mouvements, actifs à tendance lourde.",
      "Quand la SMA colle mieux au rythme de l'actif que l'EMA : ça se teste, pas ça se décrète.",
      "En grille contre le Keltner, pour voir si ta cassure de canal survit au changement de moyenne.",
    ],
    diesWhen: [
      "Les ranges volatils, comme toute cassure de canal.",
      "Les retournements rapides : le centre SMA traîne et le canal met du temps à suivre le nouveau régime.",
      "Si Keltner et ATR Channel donnent des verdicts opposés sur la même config, méfie-toi des deux : ton edge dépend d'un détail d'implémentation.",
    ],
    params: [
      {
        name: "channel_period",
        role: "La période de la SMA centrale et la fenêtre de l'ATR.",
      },
      {
        name: "atr_mult",
        role: "Le multiplicateur des bandes, la sensibilité de la cassure.",
        pitfall: "Comparer un ATR Channel à 2,5 avec un Keltner à 2,0 ne compare rien : à réglage égal seulement.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=atr_channel",
  },
  {
    slug: "bollinger",
    strategyId: "bollinger",
    title: "Bollinger Bands",
    family: "breakout",
    oneLiner:
      "Les bandes en écart-type : le même indicateur sert à trader la cassure ou le retour au centre, et le mode change tout.",
    logic: [
      "Les bandes de Bollinger entourent une moyenne de deux écarts-types des prix récents. Quand la volatilité monte, elles s'écartent ; quand elle s'éteint, elles se resserrent en « squeeze ».",
      "Le paramètre bb_mode choisit la philosophie : trader la cassure des bandes (le squeeze qui explose) ou le retour vers le centre (le prix étiré qui revient). Les deux lectures sont opposées, et c'est le régime de marché qui décide laquelle gagne : c'est LA démonstration qu'un indicateur n'est pas une stratégie.",
    ],
    worksWhen: [
      "Mode cassure : après un squeeze long, quand l'énergie comprimée se libère d'un coup.",
      "Mode retour au centre : dans les ranges établis, où l'étirement à deux écarts-types est vraiment une anomalie.",
      "En diagnostic visuel : la largeur des bandes est un excellent thermomètre de régime, même sans trader dessus.",
    ],
    diesWhen: [
      "Le mauvais mode dans le mauvais régime : le retour au centre en pleine tendance, c'est vendre un marché qui monte, en boucle.",
      "Les squeezes qui cassent du mauvais côté puis se renversent : le piège classique de la cassure Bollinger.",
      "L'écart-type sur-réagit aux bougies extrêmes : une seule mèche gonfle les bandes et fausse la lecture pendant plusieurs bougies.",
    ],
    params: [
      {
        name: "bb_period",
        role: "La fenêtre de la moyenne et de l'écart-type (20 en classique).",
      },
      {
        name: "bb_std",
        role: "Le nombre d'écarts-types des bandes : la définition statistique de « étiré ».",
      },
      {
        name: "bb_mode",
        role: "Le mode : cassure des bandes ou retour à la moyenne. Deux stratégies opposées dans un seul paramètre.",
        pitfall: "Le tester en grille et garder « le meilleur mode » par fenêtre, c'est de l'overfit de régime : le mode doit être un choix de thèse, pas un résultat d'optimisation.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=bollinger",
    presetHref: "https://lab.algoproof.fr/lab?preset=bbsqueeze-bf10&run=1",
  },
  {
    slug: "ttm-squeeze",
    strategyId: "ttm_squeeze",
    title: "TTM Squeeze",
    family: "breakout",
    oneLiner:
      "Le détecteur de compression : quand les Bollinger rentrent DANS le Keltner, l'explosion se prépare.",
    logic: [
      "Le TTM Squeeze croise deux canaux : quand les bandes de Bollinger (écart-type) passent à l'intérieur du canal de Keltner (ATR), la volatilité est anormalement comprimée : c'est le « squeeze ». Le marché recharge.",
      "On n'entre pas pendant le squeeze : on attend sa libération, et un momentum (mom_period) donne la direction du mouvement qui démarre. C'est une stratégie de patience : elle passe la plupart du temps à ne rien faire.",
    ],
    worksWhen: [
      "Les compressions longues suivies d'expansions franches : le cas d'école des cryptos après des semaines de range.",
      "Les timeframes 4h et plus, où un squeeze représente des jours de compression réelle.",
      "Quand tu veux peu de trades très sélectionnés plutôt qu'un flux continu de signaux.",
    ],
    diesWhen: [
      "Les libérations en fakeout : le squeeze explose d'un côté, embarque tout le monde, et se renverse.",
      "Les marchés qui ne compriment jamais vraiment : le squeeze ne se déclenche pas, la stratégie dort (ce qui vaut mieux que trader sans setup).",
      "Trop de paramètres qui se compensent : deux canaux plus un momentum, c'est six réglages qui peuvent fabriquer n'importe quelle courbe sur une fenêtre donnée.",
    ],
    params: [
      {
        name: "bb_period",
        role: "La fenêtre des bandes de Bollinger (avec bb_std pour leur largeur).",
      },
      {
        name: "kc_mult",
        role: "La largeur du canal de Keltner : c'est le seuil qui définit la compression (avec kc_period).",
        pitfall: "Élargir le Keltner multiplie les squeezes détectés et dilue exactement ce qui rend le signal rare et précieux.",
      },
      {
        name: "mom_period",
        role: "La fenêtre du momentum qui donne la direction à la libération du squeeze.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=ttm_squeeze",
    presetHref: "https://lab.algoproof.fr/lab?preset=ttmsqueeze-bf7&run=1",
  },
  {
    slug: "orb",
    strategyId: "orb",
    title: "ORB (Opening Range Breakout)",
    family: "breakout",
    oneLiner:
      "Le range d'ouverture d'une session, puis sa cassure : une stratégie intraday avec un début et une fin de journée.",
    logic: [
      "L'ORB observe les premières minutes d'une session (range_start_hh_mm + range_duration_min), enregistre le haut et le bas de ce range d'ouverture, puis trade sa cassure : l'idée est que la direction prise en début de session engage souvent le reste de la journée.",
      "Tout est borné : un nombre maximal de trades par jour, une fin de session (session_end_hh_mm) où tout est soldé. C'est la seule stratégie du Lab qui vit à l'heure des sessions plutôt qu'en continu. Je la fais tourner en réel sur Hyperliquid.",
    ],
    worksWhen: [
      "Les actifs à vraie structure de session (indices, or, forex) : l'ouverture y concentre l'information de la nuit.",
      "Les journées directionnelles, où la cassure du range initial donne le ton jusqu'au soir.",
      "Les timeframes courts (5m à 15m) : c'est une stratégie intraday par construction.",
    ],
    diesWhen: [
      "Les journées en range : la cassure du matin se renverse à midi, deux fois par semaine.",
      "La crypto en weekend : sans session institutionnelle, le range d'ouverture ne veut plus dire grand-chose.",
      "Mes tests l'ont recalée sur XAU et EURUSD avec les variantes FVG : les verdicts sont datés au cimetière. La version simple survit mieux, mais elle reste exigeante sur les frais (beaucoup de trades, petits gains).",
    ],
    params: [
      {
        name: "range_start_hh_mm",
        role: "L'heure de début du range d'ouverture, avec range_duration_min pour sa durée.",
        pitfall: "Optimiser l'heure d'ouverture au quart d'heure près est un overfit de fuseau : elle doit correspondre à une vraie ouverture de session, pas à la meilleure cellule de la grille.",
      },
      {
        name: "max_trades_per_day",
        role: "Le plafond de trades quotidien : le garde-fou contre les journées en scie.",
      },
      {
        name: "entry_breakout_buffer_pct",
        role: "La marge au-delà du range avant de valider la cassure.",
      },
      {
        name: "tp_range_mult",
        role: "L'objectif en multiples de la hauteur du range : la taille du mouvement attendu est proportionnelle à l'ouverture.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=orb",
  },
  {
    slug: "macd",
    strategyId: "macd",
    title: "MACD",
    family: "momentum",
    oneLiner:
      "La différence de deux EMA et sa moyenne : le croisement des deux lignes date les changements d'élan.",
    logic: [
      "Le MACD soustrait une EMA lente d'une EMA rapide : la ligne obtenue mesure l'élan du marché. Une moyenne de cette ligne (le signal) sert de référence : quand le MACD croise son signal vers le haut, l'élan accélère, et on entre dans ce sens.",
      "C'est un dérivé second du prix : il mesure la vitesse de la vitesse. D'où sa force (il tourne avant le prix) et sa faiblesse (il tourne aussi quand le prix ne fait que ralentir sans se retourner). Mon bot réel y ajoute un filtre de volume pour ne prendre que les croisements appuyés.",
    ],
    worksWhen: [
      "Les tendances qui respirent : le MACD date bien les reprises d'élan après pullback.",
      "Les timeframes 4h et plus, où l'élan mesuré correspond à de vrais flux.",
      "Avec une confirmation (volume, tendance de fond) : le croisement seul est trop bavard.",
    ],
    diesWhen: [
      "Les ranges : le MACD oscille autour de zéro et croise son signal en permanence.",
      "Les ralentissements sans retournement : l'élan baisse, le MACD croise à la baisse, et le prix repart de plus belle sans toi.",
      "Les réglages courts sur du bruit : 12/26/9 sur du 5 minutes ne mesure plus un élan, il mesure la friture.",
    ],
    params: [
      {
        name: "macd_fast",
        role: "La période de l'EMA rapide (12 en classique).",
      },
      {
        name: "macd_slow",
        role: "La période de l'EMA lente (26 en classique) : l'écart entre les deux EST le MACD.",
      },
      {
        name: "macd_signal",
        role: "La moyenne du MACD (9 en classique) : la ligne que le croisement doit franchir.",
        pitfall: "Raccourcir le signal pour des entrées plus précoces multiplie surtout les croisements sans suite.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=macd",
    presetHref: "https://lab.algoproof.fr/lab?preset=macdvolume-bf11&run=1",
  },
  {
    slug: "roc",
    strategyId: "roc",
    title: "ROC (Rate of Change)",
    family: "momentum",
    oneLiner:
      "Le momentum le plus nu qui existe : de combien le prix a changé en N bougies, et dans quel sens.",
    logic: [
      "Le ROC compare simplement le prix actuel au prix d'il y a N bougies, en pourcentage. Positif, le marché a monté ; négatif, il a baissé. Pas de lissage, pas de dérivé : le momentum brut.",
      "Deux modes d'entrée : le passage de la ligne zéro (le marché bascule de baisse en hausse sur la fenêtre) ou le croisement d'une moyenne du ROC (signal_period), plus lissé. La simplicité est le propos : si une idée de momentum ne marche pas en ROC, ses versions compliquées méritent la question « pourquoi ? ».",
    ],
    worksWhen: [
      "Les régimes de momentum persistant : ce qui a monté sur N bougies continue statistiquement un peu (l'anomalie de momentum documentée).",
      "En baseline de recherche : le ROC est l'étalon contre lequel comparer tout indicateur de momentum plus sophistiqué.",
      "Les fenêtres longues (roc_period élevé) sur actifs à tendance : moins de signaux, plus significatifs.",
    ],
    diesWhen: [
      "Les retournements en V : le ROC regarde N bougies en arrière et reste positif longtemps après le sommet.",
      "L'effet de bord : une seule bougie extrême qui SORT de la fenêtre fait sauter le ROC sans qu'il se passe rien aujourd'hui.",
      "Les ranges, où le momentum sur N bougies est un tirage aléatoire autour de zéro.",
    ],
    params: [
      {
        name: "roc_period",
        role: "La fenêtre de comparaison : le « depuis quand » du momentum.",
        pitfall: "C'est un paramètre à plateau : de petites variations changent peu, jusqu'au seuil où tout bascule. La heatmap de sensibilité le montre bien.",
      },
      {
        name: "entry_mode",
        role: "zero_cross (bascule de signe, défaut) ou signal_cross (croisement de la moyenne du ROC).",
      },
      {
        name: "signal_period",
        role: "La période de la moyenne du ROC, utilisée en mode signal_cross.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=roc",
  },
  {
    slug: "tsi",
    strategyId: "tsi",
    title: "TSI (True Strength Index)",
    family: "momentum",
    oneLiner:
      "Un momentum doublement lissé : plus lent que le ROC, mais beaucoup plus difficile à secouer.",
    logic: [
      "Le TSI lisse deux fois les variations de prix (une EMA longue puis une courte) et normalise le résultat entre -100 et +100. Le double lissage écrase le bruit : la ligne ne bouge que quand l'élan change vraiment de régime.",
      "Comme le ROC, deux modes d'entrée : passage de zéro ou croisement d'un signal. Le TSI est le pendant patient du ROC : il rate le tout début des mouvements et ignore la plupart des secousses.",
    ],
    worksWhen: [
      "Les tendances de fond bruitées : là où le ROC fait des allers-retours, le TSI garde le cap.",
      "Les actifs volatils où il faut une preuve solide avant de déclarer un changement d'élan.",
      "En confirmation d'un signal plus rapide : le TSI dit si le fond suit.",
    ],
    diesWhen: [
      "Les marchés rapides : le double lissage a un coût en retard, et les mouvements courts sont finis avant que le TSI ne les voie.",
      "Les ranges longs : même doublement lissé, un momentum sans direction finit par osciller autour de zéro.",
      "L'excès de confiance dans la douceur de la courbe : une ligne lisse dans le backtest n'est pas un edge, c'est un filtre.",
    ],
    params: [
      {
        name: "tsi_long",
        role: "La période du premier lissage, le fond de l'indicateur (25 en classique).",
      },
      {
        name: "tsi_short",
        role: "La période du second lissage, la réactivité résiduelle (13 en classique).",
      },
      {
        name: "entry_mode",
        role: "zero_cross ou signal_cross, comme le ROC.",
        pitfall: "Comparer un TSI en zero_cross à un ROC en signal_cross ne compare pas les indicateurs : fixe le mode avant de comparer les moteurs.",
      },
      {
        name: "sl_atr_mult",
        role: "Le stop en multiples d'ATR.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=tsi",
  },
  {
    slug: "rsi-mean-reversion",
    strategyId: "rsi_mean_rev",
    title: "RSI Mean Reversion",
    family: "mean-reversion",
    oneLiner:
      "Acheter la peur, vendre l'euphorie : le RSI aux extrêmes comme signal de retour à la normale.",
    logic: [
      "Le RSI résume la force relative des hausses et des baisses récentes entre 0 et 100. Sous le seuil bas (oversold), le marché a été verticalement vendeur : on parie sur la détente. Au-dessus du seuil haut (overbought), l'inverse.",
      "C'est la stratégie contrarienne de base : elle vend ce que tout le monde achète. Sa rentabilité dépend presque entièrement du régime : en range elle encaisse, en tendance elle se fait rouler dessus. Un objectif court (tp_r inférieur à 1) est cohérent avec la thèse : on vise la détente, pas le retournement complet.",
    ],
    worksWhen: [
      "Les ranges installés, où « extrême » veut vraiment dire étiré par rapport à une normale stable.",
      "Les actifs liquides à forte activité de retour à la moyenne intraday.",
      "Avec un filtre de tendance qui coupe le contre-sens : ne pas acheter la peur dans un marché structurellement baissier.",
    ],
    diesWhen: [
      "Les tendances : le RSI reste collé en zone extrême pendant des semaines, chaque « anomalie » se prolonge, chaque entrée contrarienne s'empile sur la précédente.",
      "Les frais sur objectifs courts : viser 0,8 R avec 0,7 % de frais aller-retour, l'arithmétique ne passe pas partout.",
      "Les seuils exotiques (22/78, 18/82...) trouvés par optimisation : c'est LE terrain de jeu classique de l'overfit, celui de mon ancien piège pédagogique.",
    ],
    params: [
      {
        name: "rsi_period",
        role: "La fenêtre du RSI (14 en classique) : plus courte, plus d'extrêmes détectés, moins fiables.",
      },
      {
        name: "oversold",
        role: "Le seuil bas : la définition chiffrée de « survendu ».",
        pitfall: "Chaque point gagné vers l'extrême (30 vers 20) rend les signaux plus rares ET plus dépendants de la fenêtre de test.",
      },
      {
        name: "overbought",
        role: "Le seuil haut, symétrique.",
      },
      {
        name: "tp_r",
        role: "L'objectif en multiples du risque : court par cohérence avec la thèse de détente.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=rsi_mean_rev",
  },
  {
    slug: "stochastic",
    strategyId: "stochastic",
    title: "Stochastic",
    family: "mean-reversion",
    oneLiner:
      "Où clôture le prix dans son range récent : en haut, en bas, et surtout quand il en ressort.",
    logic: [
      "Le stochastique situe la clôture actuelle dans le range des N dernières bougies : 100 = on clôture au plus haut du range, 0 = au plus bas. La ligne %K, lissée en %D, donne des croisements en zone extrême : le prix arrête de clôturer aux extrêmes, la pression se relâche.",
      "Par rapport au RSI, il mesure une position dans le range plutôt qu'une force : il est plus nerveux, plus précoce, et plus faux. Le lissage (stoch_smooth, stoch_d_period) est là pour dompter exactement ça.",
    ],
    worksWhen: [
      "Les ranges bien bornés, son habitat naturel : la sortie de zone extrême y date bien les rotations.",
      "En timing fin d'un signal plus lent : le stochastique dit « maintenant » quand la thèse dit « bientôt ».",
      "Les actifs cycliques qui respirent régulièrement entre leurs bornes.",
    ],
    diesWhen: [
      "Les tendances : clôturer au plus haut du range N bougies de suite est justement ce que FAIT une tendance. L'indicateur crie au retournement pendant tout le mouvement.",
      "Sans lissage suffisant : le %K brut croise le %D plusieurs fois par range, chaque croisement coûte.",
      "Les seuils symétriques sur des actifs asymétriques : la crypto passe plus de temps en zone haute qu'en zone basse dans les cycles haussiers.",
    ],
    params: [
      {
        name: "stoch_k_period",
        role: "La fenêtre du range de référence : le « récent » de la position mesurée.",
      },
      {
        name: "stoch_smooth",
        role: "Le lissage du %K : le premier étage anti-bruit.",
        pitfall: "Le stochastique « rapide » (smooth 1) est célèbre pour ses faux signaux : c'est le réglage à justifier, pas le défaut.",
      },
      {
        name: "stoch_d_period",
        role: "La moyenne du %K qui sert de ligne de signal.",
      },
      {
        name: "oversold",
        role: "Le seuil bas de zone extrême (avec overbought pour le haut).",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=stochastic",
  },
  {
    slug: "fvg",
    strategyId: "fvg",
    title: "FVG (Fair Value Gap)",
    family: "price-action",
    oneLiner:
      "Le trou laissé par une bougie violente, retesté plus tard : la thèse ICT passée au backtest mécanique.",
    logic: [
      "Un Fair Value Gap apparaît quand une bougie est si directionnelle que son voisinage laisse un vide de cotation : une zone que le prix a traversée sans s'y arrêter. La thèse (popularisée par le courant ICT) : le prix revient combler ces zones, et le retest est tradable.",
      "Le Lab en fait une version mécanique et testable : taille minimale du gap en ATR (fvg_min_size_atr), fenêtre de retest, exigence de mitigation. Aucune interprétation discrétionnaire : c'est précisément ce qui permet de la juger. Ma campagne ICT/SMC (58 configs) est au cimetière : les résultats mécaniques n'ont pas confirmé le folklore.",
    ],
    worksWhen: [
      "Les gaps larges nés d'un vrai choc (news, liquidation) sur des actifs liquides : le vide a une réalité de carnet d'ordres.",
      "Les retests rapides, tant que le contexte qui a créé le gap est encore vivant.",
      "En complément d'une tendance : un gap comblé DANS le sens du fond de marché a plus de suite qu'un gap isolé.",
    ],
    diesWhen: [
      "La version folklore : tous les gaps, tout le temps, sur tous les actifs. Mécanisée telle quelle, la thèse ne survit pas aux frais (campagne de 58 configs au cimetière, verdict daté).",
      "Les gaps minuscules : sous un seuil d'ATR, un « gap » est juste une bougie un peu longue.",
      "Les marchés lents, où le prix comble les gaps par dérive plutôt que par retest exploitable.",
    ],
    params: [
      {
        name: "fvg_min_size_atr",
        role: "La taille minimale du gap en multiples d'ATR : le filtre entre vide réel et bougie ordinaire.",
        pitfall: "Le baisser pour avoir plus de setups fabrique des gaps qui n'en sont pas : le paramètre le plus sensible de la stratégie.",
      },
      {
        name: "retest_lookback",
        role: "La fenêtre pendant laquelle un retest du gap reste valide.",
      },
      {
        name: "mitigation_required",
        role: "Exiger que le gap soit partiellement comblé avant d'entrer : la variante prudente de la thèse.",
      },
      {
        name: "tp_fvg_mult",
        role: "L'objectif en multiples de la taille du gap, cohérent avec la thèse zonale.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=fvg",
  },
  {
    slug: "fvg-multi",
    strategyId: "fvg_multi",
    title: "FVG Multi-timeframe",
    family: "price-action",
    oneLiner:
      "La même thèse FVG, avec une exigence de plus : le gap doit être confirmé par le timeframe supérieur.",
    logic: [
      "Identique au FVG simple, plus un étage : la confluence multi-timeframe. Un gap détecté en 1h ne se trade que si le contexte en 4h (htf_timeframe) va dans le même sens : la zone locale doit s'inscrire dans une structure plus large.",
      "C'est le test de l'argument classique « ça ne marche pas parce qu'il manque la confluence » : le Lab permet de comparer FVG simple et FVG multi à réglages égaux, et de voir si l'étage supplémentaire paie ou s'il ne fait que réduire l'échantillon.",
    ],
    worksWhen: [
      "Les mêmes conditions que le FVG simple, avec en théorie moins de faux positifs : la confluence filtre les gaps à contre-structure.",
      "Les actifs où les timeframes se lisent proprement (majors liquides).",
      "En recherche comparative : c'est l'exemple type du « filtre en plus » dont l'apport se mesure au lieu de se proclamer.",
    ],
    diesWhen: [
      "Le filtre qui affame : exiger la confluence divise les signaux, et un échantillon trop maigre ne prouve plus rien (règle n<20).",
      "Les retournements de timeframe supérieur : la confluence d'hier est le contre-sens d'aujourd'hui.",
      "Même verdict de fond que le FVG simple : ma campagne mécanique ICT/SMC n'a pas trouvé d'edge net, confluence comprise. Les verdicts sont au cimetière, datés.",
    ],
    params: [
      {
        name: "htf_timeframe",
        role: "Le timeframe supérieur consulté pour la confluence.",
      },
      {
        name: "htf_confluence",
        role: "L'exigence de confluence : le gap local doit s'aligner avec la structure du timeframe supérieur.",
        pitfall: "Chaque étage de confluence réduit l'échantillon : vérifie le nombre de trades AVANT de comparer les PF.",
      },
      {
        name: "fvg_min_size_atr",
        role: "La taille minimale du gap en ATR, comme le FVG simple.",
      },
      {
        name: "tp_fvg_mult",
        role: "L'objectif en multiples de la taille du gap.",
      },
    ],
    labHref: "https://lab.algoproof.fr/lab?strategy=fvg_multi",
  },
] as const satisfies readonly StrategyFiche[];

/**
 * The 22 fiche slugs, as a type. Derived from the array itself — adding,
 * renaming or deleting a fiche above changes this union with no second list to
 * keep in step, and every map keyed or valued by a fiche slug (strategy-keys.ts)
 * fails `tsc` on a typo instead of silently resolving to nothing.
 */
export type FicheSlug = (typeof FICHES)[number]['slug']

export const STRATEGY_FICHES: readonly StrategyFiche[] = FICHES;

export function getStrategyFiche(slug: string): StrategyFiche | null {
  return STRATEGY_FICHES.find(f => f.slug === slug) ?? null
}

/**
 * Fiches grouped for the index page, in canonical family order. Families with no
 * fiche are skipped rather than rendered empty — carry, market-neutral, stat-arb
 * and event describe fleet bots and graveyard entries, not pedagogical pages.
 */
export function fichesByFamily(): { family: Family; fiches: StrategyFiche[] }[] {
  return FAMILY_ORDER
    .map(family => ({ family, fiches: STRATEGY_FICHES.filter(f => f.family === family) }))
    .filter(g => g.fiches.length > 0)
}
