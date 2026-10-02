# Refonte « Le registre des décisions » : plan de travail

Direction : le choix du propriétaire parmi les propositions de l'audit, la proposition d'Astra. Il n'y a pas eu de tirage de concept Impeccable, donc pas de clé de tirage.

Décidé le 02/10/2026 par le propriétaire :
- la direction d'Astra, avec ses corrections (`DECISIONS_PROPRIETAIRE.md`) ;
- la police Schibsted Grotesk ;
- le site reste sombre ;
- la base de 1 000 € est gardée sur la fiche, étendue à tous les bots en argent réel, sans phrase
  d'explication ;
- aucun nom d'auteur sur le site.

Références :
- `MAQUETTE_ASTRA.html` (à ouvrir dans un navigateur ; les états se basculent en haut) ;
- `PROPOSITION_ASTRA.md` ;
- `DECISIONS_PROPRIETAIRE.md` ;
- `PRODUCT.md` ;
- le rapport d'audit : `git show design/audit-2026-10:docs/design-audit-2026-10/RAPPORT.md`.

La maquette a autorité sur la composition, les mots et la hiérarchie. Le code existant a autorité sur
les données et les calculs. Aucun chiffre n'est tapé à la main.

## Règles pour tous les lots

- Lire `AGENTS.md`. Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API. En JSX,
  écrire `{expr}{' '}mot`.
- Tests d'abord pour toute logique : tri, cumul, choix d'état, droits. Les tests qui figent l'ancienne
  présentation sont mis à jour **dans le même commit que le changement qu'ils décrivent**, avec une
  ligne dans le message qui dit pourquoi. On ne supprime jamais un test de règle produit, par exemple
  une donnée absente jamais colorée, réel et simulation jamais mélangés, ou les rôles de liens.
- Pas de sur-titre en capitales au-dessus d'un titre, pas de tiret cadratin, pas de bordure colorée
  d'un seul côté, pas de carte imbriquée, pas d'emoji en guise d'icône.
- Garder : la règle des rôles de lien (`src/lib/link-roles.ts` et son garde-fou), les plafonds de
  taille (plancher à 13 px), l'accessibilité (un seul `<main>`, titres dans l'ordre, focus visible,
  contraste AA mesuré), `prefers-reduced-motion`.
- Nav : garder le bouton « Le labo » (décision du propriétaire du 26/09) même si la maquette ne
  l'a pas.
- Ne pas montrer ce qui n'existe pas encore :
  - pas de paliers Live, Promu, Labo tant que `feat/bot-tiers-cohorts` n'est pas fusionnée ;
  - pas de journal Direct ni de positions ouvertes tant que le lot G1 n'est pas livré.
- Vérifier chaque lot sur un serveur local (`next build && next start`) en 1440 et 390. Faire les
  captures avec le Playwright du scratchpad de la session.

## Lot 1 : fondations (branche `feat/refonte-registre`)

1. **Jetons**, dans `tailwind.config.ts` et `globals.css` :
   - palette d'Astra : fond #101714, surface #17211c, surface active #22332b, encre #edf1e8,
     note #a8b6ab, lien #abc8ec, bouton #263f55, perte #ff9c90, réserve #e9c17c, filet #415449,
     contour #82988a, Proof #4ade80 ;
   - garder les noms de jetons existants quand le rôle est le même (bg, card, border, muted,
     foreground, negative, warning, brand…) pour limiter la casse ;
   - `positive` devient l'encre ordinaire : un gain n'est plus vert.
2. **Police** : Schibsted Grotesk via `next/font/google` (400, 500, 600, 700), à la place d'Inter.
   - Chiffres en `tabular-nums` dans la même police, avec un réglage de la virgule si elle est trop
     large en grand.
   - JetBrains Mono ne sert plus qu'aux identifiants techniques (paires, codes). Les chiffres du site
     ne sont plus en monospace.
   - Le séparateur de milliers reste l'espace fine insécable.
3. **Liens** : `inline` passe au bleu clair souligné ; le reste suit les rôles. Focus clair de 3 px.
4. **Nav et footer** au style de la maquette :
   - mot-symbole « AlgoProof », Proof en vert ;
   - liens existants gardés ;
   - titres de colonnes du footer qui ne cassent plus la hiérarchie (pas de `h3`) ;
   - menu mobile fermé par Échap, bouton de 44 px.
5. **Un seul `<main>`** : les pages qui en rendent un deuxième passent à `<div>` ou `<article>`
   (constat 22).
6. `prefers-reduced-motion` global, et `motion-reduce` sur les squelettes.

## Lot 2 : accueil (`src/app/page.tsx`, `src/components/home/*`)

Composition de la maquette :
- titre et chapô (les nombres sont calculés), avec le lien « Pourquoi je publie tout » ;
- les deux entrées sur une ligne ;
- « Mes bots en argent réel » en registre pleine largeur :
  - triés **du meilleur résultat au moins bon** ;
  - colonnes bot et marché, état et décision, résultat depuis le départ ;
  - lien « Toute la flotte → » en haut et bouton « Voir toute la flotte · N bots, réels et simulés »
    dessous ;
- bibliothèque, sans les paliers ;
- configurations recalées et lien vers le cimetière ;
- un article ;
- le bloc « Garder un bot en favori, ou le suivre en direct ».

À corriger au passage :
- bloc « 1 sur 500 » (constat 7) : à retirer ou à intégrer sans débordement ;
- couleur des courbes (constat 8) : pas de courbe colorée selon un résultat qu'elle ne montre pas.

## Lot 3 : fiche bot (`src/app/strategies/bot/[slug]/page.tsx` et ses composants)

- **En-tête** : fil d'Ariane « Accueil / La flotte / nom », badge du régime (argent réel ou
  simulation), titre.
- **Panneau « Mon constat / Ma décision et ses limites »** sous le titre, jamais plié :
  - repris des données de conformité et de décision existantes (`ConformityCard`, `DecisionNote`,
    `getBotExpectations`) ;
  - états possibles : règle franchie, dans les limites attendues, limites non définies, données
    insuffisantes (zéro trade), arrêté ;
  - phrases en « je » ou « ce bot… », jamais « je dépasse ».
- **Chiffres** :
  - argent réel : « Base de comparaison 1 000 € / Résultat / Base + résultat », sans phrase
    d'explication ;
  - simulation : le résultat de la **simulation seule** en tête, le backtest à part et en gris
    (constat 4).
- **Ce que j'avais fixé / Ce qui s'est passé** : valeurs constatées face aux seuils.
- **Trades** : colonnes « Résultat du trade » et « Cumul après ce trade ».
  - Le cumul est calculé sur l'historique complet, pas reconstitué.
  - Sous un filtre, la ligne de total dit « total de la sélection ».
- **Zéro trade** : « — » partout, critère « pas encore mesurable », aucun chiffre coloré
  (constat 6).
- **Favoris et cloche** : boutons existants restylés. « Un favori n'envoie aucun message. »
- **Hors périmètre de ce lot** : réserver la fiche de stratégie aux abonnés (lot 5).

## Lot 4 : flotte (`/overview`)

- Une seule liste, triée **du meilleur au moins bon**. L'étiquette « rodage » est portée par chaque
  ligne concernée ; les bots en rodage ne forment plus de groupe séparé.
- Un bot sans trade va en fin de liste avec « — », sans couleur.
- Registre au style du lot 1.

## Lot 5 : fiche de stratégie et réglages réservés aux abonnés, sauf EMA cross

À cadrer avec le propriétaire avant de coder : quelles surfaces sont concernées (onglets de la fiche
bot, /strategies/[concept], /bibliotheque/[idee]) ? Le contenu réservé ne doit jamais partir dans le
HTML public. Il faut le servir comme la recette (`RecipeGate`).

## Fin

- Revue de chaque lot par Claude.
- Revue de finition Impeccable (desktop et mobile).
- `DESIGN.md` réécrit depuis le monde construit.
- Fusion dans main **seulement sur accord du propriétaire**.
