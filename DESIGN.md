---
name: AlgoProof
description: Bots de trading et comptes de sociétés cotées, en public et en français. Le registre des décisions.
colors:
  bg: "#101714"
  card: "#17211c"
  card-2: "#22332b"
  border: "#415449"
  border-strong: "#82988a"
  foreground: "#edf1e8"
  muted: "#a8b6ab"
  accent: "#abc8ec"
  button: "#263f55"
  negative: "#ff9c90"
  warning: "#e9c17c"
  severe: "#ff6b35"
  brand: "#4ade80"
typography:
  display:
    fontFamily: "Schibsted Grotesk, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "34px (mobile), 44px (sm), 52px (lg)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "30px (mobile), 40px (sm)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  figure:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "20px (mobile), 30px (sm)"
    fontWeight: 400
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-article:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  identifier:
    fontFamily: "JetBrains Mono, Fira Code, ui-monospace, monospace"
    fontSize: "inherit"
    fontWeight: 400
rounded:
  sm: "2px"
  base: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "24px"
  section: "32px"
  section-wide: "40px"
  target: "44px"
  nav-height: "64px"
  container: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.button}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.card-2}"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.card-2}"
  control-selected:
    backgroundColor: "{colors.card-2}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.base}"
    height: "44px"
  input-field:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
  verdict-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "20px 24px"
  badge-regime:
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  nav-bar:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.muted}"
    height: "64px"
  link-inline:
    textColor: "{colors.accent}"
---

# Design System: AlgoProof

## Overview

**Creative North Star: "Le registre des décisions"**

AlgoProof se lit comme un registre tenu à la main, mais sur fond sombre : une règle publiée, les faits relevés, la décision prise, puis l'addition laissée visible. Le système ne vend rien et ne célèbre rien. Il range. Chaque section s'ouvre par un filet et un titre en casse de phrase, sans carte autour de chaque phrase ; un seul panneau cadré par fiche porte ce qui compte le plus, le verdict et la décision. Les chiffres sont posés en colonnes tabulaires dans la même grotesque que le texte, et le total se souligne d'un double trait comme au pied d'une colonne de comptes.

La densité est celle d'un document de travail : texte de 15 px, interlignes généreux, lignes de registre de 20 px de marge verticale, largeur utile de 1 152 px. Le site est entièrement sombre, commandes sélectionnées et panneaux compris, sans grande surface claire. La couleur ne porte presque jamais le sens seule : une perte garde son signe, une règle franchie a son libellé, un bouton actif a `aria-pressed` et un contour. Le vert n'appartient qu'à la marque, jamais à un résultat.

Rejets confirmés par le propriétaire et la proposition retenue : pas de police de terminal pour maquiller la preuve, pas de tampons inclinés ni de folio décoratif, pas de vocabulaire débit/crédit, pas de gros indicateur vert qui annulerait un avertissement, pas de sur-titre en capitales, aucun nom d'auteur affiché.

**Key Characteristics:**
- Fond vert-noir unique, surfaces sombres en deux paliers, aucune ombre.
- Une seule grotesque, Schibsted Grotesk, chiffres compris ; monospace réservée aux identifiants.
- Gains à l'encre ordinaire, pertes en rouge clair avec leur signe, vert réservé au mot « Proof ».
- Sections ouvertes par un filet, un seul panneau cadré par fiche bot.
- Totaux soulignés d'un double trait.
- Cibles de 44 px, focus clair de 3 px, aucune animation pour qui l'a demandé.

## Colors

Une palette sombre et froide, verte au fond, où l'encre claire fait presque tout le travail et où trois couleurs d'état parlent seulement quand il le faut.

### Primary
- **Bleu de lien pâle** (accent) : liens soulignés dans le texte, anneau de focus de 3 px, contour du bouton principal et des commandes sélectionnées, flèches des deux entrées de l'accueil. Contraste mesuré 10,57:1 sur le fond.
- **Ardoise de commande** (button) : aplat du bouton principal (« Le labo », « Explorer la bibliothèque »), texte à l'encre par-dessus (9,53:1). Sert aussi de fond à la sélection de texte.

### Tertiary
- **Vert Proof** (brand) : le mot « Proof » du mot-symbole, dans la barre de navigation et sur les images de partage. Rien d'autre.

### Neutral
- **Vert-noir de registre** (bg) : le fond de toutes les pages, la barre et le tiroir mobile.
- **Surface sapin** (card) : le panneau de verdict, les champs de saisie, le lien d'évitement révélé.
- **Surface sapin éclairée** (card-2) : survol des boutons, commande sélectionnée, tuile posée sur une surface.
- **Filet mousse** (border) : filets de section, lignes de registre, séparateurs de colonnes. Décoratif seulement (2,24:1), jamais le seul bord d'une commande.
- **Contour lichen** (border-strong) : bords des champs, des boutons secondaires, des badges de régime ; double trait des totaux (5,90:1).
- **Encre de registre** (foreground) : titres, texte courant, chiffres, et tout résultat positif.
- **Note grise-verte** (muted) : métadonnées, légendes, en-têtes de colonnes, liens de navigation au repos. Toujours à pleine opacité.

### Statuts
- **Rouge clair de perte** (negative) : montant négatif (avec son signe « − »), titre « Règle d'arrêt franchie », bord complet du panneau de verdict quand la règle est franchie, message d'échec.
- **Ambre de réserve** (warning) : données insuffisantes, étiquette « rodage », verdict de réserve.
- **Orange d'escalade** (severe) : palier entre réserve et perte, par exemple un réexamen de décision en retard.

### Named Rules
**The Gain à l'encre Rule.** Un gain s'écrit à l'encre ordinaire, jamais en vert. Le jeton `positive` existe encore pour les appels hérités mais vaut exactement `foreground`, et le test de contraste échoue s'il s'en écarte.

**The Vert de marque Rule.** Le vert Proof vit dans le mot-symbole et nulle part ailleurs : `text-brand` n'est permis que dans la barre de navigation, et le garde-fou de dérive refuse toute autre occurrence.

**The Signe avant la couleur Rule.** Une perte porte son signe, une règle franchie son libellé, une absence de donnée « — » sans couleur. Le rouge redouble l'information, il ne la porte jamais seul.

**The Note à pleine opacité Rule.** Le texte secondaire est `muted` à 100 %, jamais une encre à opacité réduite : deux couleurs de texte, rien entre les deux.

## Typography

**Display Font:** Schibsted Grotesk (avec system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Schibsted Grotesk, la même police variable 400 à 700, auto-hébergée
**Label/Mono Font:** JetBrains Mono, pour les identifiants techniques seulement

**Character:** Une grotesque de presse, droite et un peu serrée, qui tient aussi bien un titre qui affirme qu'une colonne de montants. Elle est auto-hébergée parce que la version Google élargissait la virgule sous `tnum` (« 272 , 73 € ») ; la copie du site, construite par `scripts/fonts/build_schibsted.py`, garde une virgule étroite dans les chiffres tabulaires.

### Hierarchy
- **Display** (600, 34 px mobile, 44 px dès sm, 52 px dès lg, interligne 1,12, approche −0,03 em) : le titre de l'accueil seulement.
- **Headline** (600, 30 px puis 40 px, approche serrée) : le titre d'une fiche bot ou d'une page.
- **Title** (600, 24 px, interligne 1,25) : titres de section h2 et titre du verdict ; 20 px pour les titres secondaires.
- **Figure** (400 à 500, 20 px puis 30 px sur la fiche, 20 à 22 px dans les registres, chiffres tabulaires) : base, résultat, cumul.
- **Body** (400, 15 px, interligne 1,55) : texte courant ; mesures de 60 à 72 ch selon le bloc.
- **Body article** (400, 18 px, interligne 1,65, mesure 33 em, environ 66 ch) : prose des articles.
- **Label** (400 ou 600, 13 px, interligne 1,4, casse de phrase) : légendes, en-têtes de colonnes, « Relevé du », avertissement légal.

### Named Rules
**The Chiffres tabulaires Rule.** Tous les chiffres s'écrivent dans la grotesque du texte avec `tabular-nums`. La monospace ne sert qu'aux identifiants (paires, tickers, noms de paramètres, code) ; le garde-fou refuse `font-mono` hors d'une liste de fichiers qui en portent un, chacun justifié.

**The Plancher de 13 px Rule.** L'échelle est fermée, de 13 à 40 px, et 13 px est le plus petit texte du site. Les tailles arbitraires de 9, 10, 11, 13 et 15 px sont refusées par le garde-fou ; l'avertissement financier du pied de page est testé à 13 px et pleine opacité.

**The Sans sur-titre Rule.** Aucune étiquette en capitales espacées au-dessus d'un titre. Les capitales suivies ne sont tolérées que dans un en-tête de tableau ; un titre se suffit à lui-même, en casse de phrase.

## Layout

Un conteneur centré de 1 152 px (`max-w-6xl`), avec des gouttières de 16 px sur téléphone et 24 px dès 640 px. Les articles se resserrent à 768 px de conteneur et environ 66 caractères de prose. La barre de navigation est collante et fait 64 px, la hauteur que référence `--nav-h`.

Le rythme est vertical et réglé par des filets : chaque section est un bloc de 32 px de marge (36 à 40 px sur grand écran) séparé du suivant par un filet mousse d'un pixel. Les registres (bots en argent réel, flotte, trades) sont des grilles à trois colonnes, « Bot et marché », « État et décision », « Résultat depuis le départ », la colonne de résultat alignée à droite ; une quatrième colonne de tendance apparaît dès 1 024 px. Sous 768 px, chaque ligne devient un petit bloc empilé : nom et marché, état, puis résultat. L'ordre du DOM suit l'ordre de lecture.

Sur une fiche bot, l'ordre est fixe : fil d'Ariane, régime, titre, panneau de verdict immédiatement après le titre, puis base, résultat et cumul, puis favori et ancres. Le verdict n'est jamais replié ; seules les informations complémentaires le sont.

Toute cible d'action fait au moins 44 px de haut, liens de navigation et de pied de page compris ; les entrées du tiroir mobile font 48 px.

### Named Rules
**The Un seul main Rule.** La mise en page racine rend l'unique `<main id="contenu">`, cible du lien « Aller au contenu ». Aucune page n'en ajoute un second ; les chargements et sous-pages utilisent `<div>` ou `<article>`.

## Elevation & Depth

Le système est plat. Aucune ombre portée n'existe dans le code construit. La profondeur vient de deux paliers tonals, le fond vert-noir puis la surface sapin, puis la surface éclairée pour le survol et la sélection, et des filets. Le seul objet qui se détache est le panneau de verdict, par un fond de surface et un bord complet.

### Named Rules
**The Plat par défaut Rule.** Pas d'ombre, pas de flou, pas de carte imbriquée. Un état se montre par un changement de fond (`card-2`) ou de contour (`accent`), jamais par une élévation.

**The Mouvement réduit Rule.** Les transitions de couleur sont les seules animations. Sous `prefers-reduced-motion`, la feuille globale les ramène à 0,01 ms, et toute pulsation ou rotation porte `motion-reduce:animate-none` (test dédié).

## Shapes

Des coins à peine adoucis, en quatre rayons : 2 px pour les badges de régime et l'anneau de focus, 4 px pour les boutons et les commandes, 6 px pour les champs de saisie, 8 px pour le panneau de verdict et les cartes cliquables. Les points d'état sont ronds. Rien au-delà de 8 px : le garde-fou refuse `rounded-xl` et plus.

Les bords sont pleins sur toute leur périphérie. Le régime se lit aussi dans la forme du badge : trait plein pour l'argent réel, tirets pour la simulation, pointillés pour le backtest. Les totaux se ferment par un double trait, sous le montant « Base + résultat » et au pied du registre de trades.

### Named Rules
**The Double trait de l'addition Rule.** Un total se souligne d'un double trait, comme au pied d'une colonne de comptes : soulignement double sous « Base + résultat », filet double de 3 px en contour lichen sous la ligne de total des trades.

## Components

### Buttons
Sobres, rectangulaires, toujours lisibles sans survol.
- **Shape:** coins légèrement adoucis (4 px), 44 px de haut, 16 px de marge latérale (14 px dans la barre), texte de 14 px en 600.
- **Primary:** aplat ardoise de commande, texte à l'encre, contour bleu de lien. Un seul par barre (« Le labo »), un par section au plus.
- **Hover / Focus:** le fond passe à la surface éclairée ; focus en anneau bleu pâle de 3 px décalé de 2 px.
- **Secondary:** fond transparent, contour lichen, texte à l'encre, même survol (« Voir toute la flotte · N bots, réels et simulés → »).

### Chips
- **Style:** le badge de régime, 13 px en 500, coins de 2 px, contour lichen, sans fond ; forme du trait selon le régime.
- **State:** les commandes à bascule (montants du simulateur de capital, favori) passent à la surface éclairée avec un contour bleu et `aria-pressed` quand elles sont actives.

### Cards / Containers
- **Corner Style:** 8 px.
- **Background:** surface sapin pour le panneau de verdict ; les cartes cliquables restent sur le fond.
- **Shadow Strategy:** aucune (voir Elevation & Depth).
- **Border:** filet mousse ; bord complet rouge clair quand la règle est franchie ; les cartes cliquables passent à un contour bleu au survol.
- **Internal Padding:** 16 px sur téléphone, 20 px sur 24 px dès 640 px.

### Inputs / Fields
- **Style:** fond vert-noir, contour lichen, coins de 6 px, texte de 14 px, indication en note grise-verte.
- **Focus:** le contour passe au bleu de lien, plus l'anneau global de 3 px.

### Navigation
- **Style:** barre collante de 64 px sur le fond, filet en bas. Mot-symbole en 700, 20 px, approche +0,05 em, « Proof » en vert. Cinq liens à plat en 14 px, note grise-verte au repos, encre au survol.
- **Active:** `aria-current="page"`, encre, soulignement de 2 px décalé de 8 px.
- **Mobile:** un bouton « Menu » de 44 px contrôle un tiroir de cinq liens de 48 px, fermé par Échap qui rend le focus au bouton ; « Le labo » reste dans la barre.
- **Pied de page:** quatre colonnes de liens sous des intitulés en paragraphe (pas de titres), puis la phrase du site et l'avertissement à 13 px.

### Liens
Chaque lien choisit un rôle, et le traitement suit (`src/lib/link-roles.ts`, garde-fou en test) :
- **inline** : bleu de lien, soulignement léger au repos qui se renforce au survol. Seul rôle permis dans une phrase.
- **nav** : note grise-verte, sans soulignement, encre au survol.
- **record** : le nom d'un enregistrement dans un registre, à l'encre en 500 ou 600, bleu au survol, sans soulignement.
- **card** : la carte entière est le lien, contour qui répond au survol.
- **term** : terme de lexique, pointillé, couleur héritée.

### Panneau de verdict
La signature de la fiche bot. Une surface sapin cadrée, en deux colonnes dès 768 px : à gauche le titre d'état en 24 px (rouge clair si la règle est franchie, ambre pour une réserve, encre sinon) et le constat en une phrase ; à droite « Ma décision et ses limites » en h3, la décision citée, la date de réexamen en note, et un lien vers la règle complète. Il suit immédiatement le titre et n'est jamais dans un repli.

### Chiffres de la fiche
Trois colonnes sous le panneau, fermées par un filet : base, résultat (avec son pourcentage en 13 px), base + résultat souligné d'un double trait. Libellés en 13 px note, montants en 20 puis 30 px tabulaires. « Relevé du … » en dessous.

### Registre
Le motif du site : une liste ou un tableau à filets horizontaux, en-têtes de colonne en 13 px note, nom de l'enregistrement en lien record, état en 600 coloré selon le statut, résultat aligné à droite en 20 à 22 px tabulaires avec sa base et sa date en 13 px. Les trades ajoutent un cumul après chaque ligne et une ligne de total fermée par le double trait ; sous un filtre, elle dit « total de la sélection ».

### Named Rules
**The Panneau unique Rule.** Une fiche bot a un seul panneau cadré, le verdict et la décision, placé juste sous le titre, jamais plié. Tout le reste s'ouvre par un filet.

**The Base de 1 000 € Rule.** Un bot en argent réel se lit sur une base de comparaison de 1 000 €, affichée comme un chiffre parmi les autres (« Base de comparaison », « Résultat », « Base + résultat »), sans phrase pour l'expliquer.

## Do's and Don'ts

### Do:
- **Do** écrire un gain à l'encre (#edf1e8) et une perte en rouge clair (#ff9c90) avec son signe « − ».
- **Do** poser tous les chiffres en `tabular-nums` dans Schibsted Grotesk, avec l'espace fine insécable comme séparateur de milliers.
- **Do** ouvrir chaque section par un filet mousse et un titre en casse de phrase.
- **Do** placer le panneau de verdict juste sous le titre de la fiche, seul objet cadré de la page.
- **Do** choisir un rôle de lien dans `linkClass()` plutôt que d'habiller un lien à la main.
- **Do** donner 44 px de haut à toute cible d'action, et un focus de 3 px en bleu pâle.
- **Do** fermer un total par un double trait.
- **Do** écrire « — » sans couleur quand une donnée manque.

### Don't:
- **Don't** utiliser le vert ailleurs que sur « Proof » dans le mot-symbole.
- **Don't** composer un chiffre en monospace ; JetBrains Mono est réservée aux identifiants.
- **Don't** descendre sous 13 px, ni baisser l'opacité d'un texte de note.
- **Don't** mettre un sur-titre en capitales au-dessus d'un titre.
- **Don't** ajouter une ombre, une carte imbriquée, une bordure colorée d'un seul côté ou un rayon au-delà de 8 px.
- **Don't** expliquer la base de 1 000 € par une phrase.
- **Don't** replier le verdict, le régime, la base ou la décision.
- **Don't** rendre un second `<main>`.
- **Don't** afficher de nom d'auteur ; la voix reste en « je ».
