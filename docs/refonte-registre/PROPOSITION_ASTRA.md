# Le registre des décisions

Direction Astra, 2 octobre 2026. Proposition de refonte sombre, pas une branche de production.

## Intention

Je veux reconnaître AlgoProof à la façon dont une décision est mise à l'épreuve. Une phrase de l'auteur, une règle connue, les faits, puis la possibilité de refaire le calcul. Le registre devient la structure de lecture. Je garde la sobriété de A, la largeur de B et l'arithmétique de C nuit. Je retire le folio décoratif, les tampons inclinés et le vocabulaire débit/crédit.

La marque reste AlgoProof, Proof en vert. Tout le reste est sombre, y compris les commandes sélectionnées et les panneaux d'information. Pas de grande surface blanche, pas de page partiellement claire. Le bouton principal est un aplat bleu ardoise sombre avec un texte clair.

## Typographie et rythme

Une grotesque humaniste, **Segoe UI**, disponible sur l'environnement de capture, puis system-ui et sans-serif. Ce choix autonome évite tout appel à Google Fonts, interdit par la restriction réseau du brief. Je ne maquille pas la preuve avec une police de terminal. Titres en 600/700, casse de phrase ; corps 16 px, interligne 1,6 ; légendes et commandes 14 px, plancher 13 px. H1 accueil 52 px desktop, 34 px mobile ; fiche 40/30 px. Chiffres tabulaires dans la même police. Monospace seulement pour les identifiants d'événement lorsqu'ils existent.

Largeur utile 1 120 px, marges mobiles 20 px. Sections ouvertes par un filet et un titre ; pas de carte autour de chaque phrase. Le panneau de décision est cadré car il rapproche une règle et son exception. Les informations complémentaires peuvent se replier ; le verdict, le régime, la base et la décision ne se replient jamais. Cibles d'action 44 px minimum ; focus clair de 3 px ; pas d'animation ; ordre DOM identique à l'ordre de lecture.

## Palette sombre

Valeurs de la maquette. Les ratios exacts, calculés par luminance relative sRGB WCAG, sont écrits dans `sources/contrastes.json` et repris à la fin de ce document après vérification. Texte opaque uniquement.

| Rôle | Valeur | Usage |
|---|---|---|
| Fond | `#101714` | Toutes les pages |
| Surface | `#17211c` | Décision, saisie, Direct |
| Surface active | `#22332b` | Survol, sélection de commandes |
| Encre | `#edf1e8` | Titres, résultats positifs, texte |
| Note | `#a8b6ab` | Métadonnées, légendes |
| Action | `#abc8ec` | Liens soulignés et focus |
| Bouton | `#263f55` | Fond sombre du CTA |
| Perte / règle franchie | `#ff9c90` | Signe négatif, titre explicite d'échec |
| Réserve | `#e9c17c` | Données insuffisantes, exception |
| Filet | `#415449` | Structure décorative |
| Contour de contrôle | `#82988a` | Champs, boutons, focus secondaire |
| Proof | `#4ade80` | Mot-symbole seul |

La couleur n'est jamais la seule information. Une perte a son signe ; une règle franchie a son libellé ; une simulation a son mot. Un bouton actif utilise aussi `aria-pressed` et un contour. Les filets purement décoratifs n'ont pas à servir de contour de contrôle.

## Chiffres, courbes et addition

Les gains sont de l'encre ordinaire, les pertes de l'encre rouge claire. Le verdict a plus de poids que le pourcentage. Je ne somme pas les trois comptes réels sur l'accueil et je ne fusionne jamais réel et simulation. Chaque résultat porte sa base, sa période, sa source et l'heure du relevé.

Le registre de trades conserve un résultat signé et un cumul après chaque ligne. Sur mobile, une ligne devient un petit bloc : date et actif, résultat puis cumul, motif neutre. Un stop n'est pas automatiquement une perte, ORB en fournit des exemples.

La maquette trace les derniers trades clos observés, avec des points sans lissage. Le cumul avant cet extrait est déduit du résultat global publié et des montants affichés arrondis ; il est qualifié de reconstitution, pas d'audit comptable au centime. Aucune série quotidienne n'est inventée pour faire une jolie courbe. En production, employer les montants non arrondis et le cumul serveur avant pagination. Sous filtre, conserver le cumul historique ou afficher explicitement « total de la sélection », jamais un cumul recomposé silencieusement.

Sur une fiche issue du moteur, trois segments distincts et nommés : sélection, rejeu, simulation. Le réel forme un segment séparé lorsqu'il existe. Traits et dates marquent les frontières, pas seulement une couleur. Le premier KPI porte uniquement la phase actuelle. Sans historique ou après retrait de courbe (D088), écrire la raison et conserver les trades disponibles. Ne jamais inventer un segment rétroactif pour un bot manuel.

## Hiérarchie des verdicts

1. Régime d'argent et identité du bot.
2. État factuel, au premier écran : règle franchie, dans les limites attendues, données insuffisantes, limites non définies, arrêté.
3. Décision de l'auteur lorsqu'elle existe, avec date et prochain examen. « Je le garde » ne neutralise pas « règle franchie ».
4. Résultat depuis le départ, base miroir, taille de l'échantillon.
5. Règles détaillées, historique public, puis explications et réglages.

« Promu » décrit une sélection, « Live » de l'argent réel, « Labo » la recherche. Aucun de ces mots n'est un verdict de robustesse. Les sociétés ont une autre hiérarchie : périmètre du rapport, contrôles lus, alertes factuelles, sources. Pas de tampon « Tient » sur une société.

## Accueil

Je garde le message des deux activités, conformément au chantier bibliothèque, et j'y ajoute un lien « Pourquoi je publie tout » (le propriétaire ne veut pas son nom affiché, 02/10). Les deux entrées restent immédiatement accessibles : bibliothèque des stratégies et sociétés. Le registre réel vient ensuite en pleine largeur, avec une colonne État et décision avant la colonne Résultat. L'accueil n'est ni un palmarès ni l'inventaire de toute la flotte.

L'ordre des trois lignes est une sélection éditoriale explicitée, ORB d'abord pour exposer l'exception, pas un tri par gain. Si le réel grossit, montrer un extrait borné avec le nombre total et le critère de sélection ; toujours un lien vers l'ensemble, règles franchies comprises. Ne pas prétendre « plus long historique » avec un ordre non vérifié.

La bibliothèque est présentée par idée, avec ses effectifs réels relevés. Une explication des paliers montre que le catalogue de recherche est public. Le cimetière et une lecture d'auteur complètent l'accueil : écarter fait partie du travail. Aucun abonnement ne précède les preuves publiques.

## Fiche bot

Fil de retour, nom, régime, verdict et décision, base/résultat/cumul ; puis commandes étoile et cloche ; navigation d'ancres vers règles, trades et Direct. Sur mobile, raccourcir les métadonnées secondaires, jamais la réserve. Pour ORB : « Règle d'arrêt franchie. Je le garde. » reste entièrement visible, avec le réexamen du 22 octobre.

Je rapproche les valeurs constatées et les seuils : « Pire baisse 29,1 %, limite 20 % », « Facteur de profit 0,99, attendu 1,3 ». Le texte du 25 septembre est conservé dans la décision complète. Pas de gros indicateur vert ailleurs qui annule visuellement l'avertissement.

## Article

Le titre reste une phrase de l'auteur ; date de publication et éventuelle relecture visibles. Prose 18 px/1,65, mesure 66ch. Un résumé expose la question et la décision, pas une rangée de KPI. Les notes de source vivent dans la marge desktop puis à la suite du paragraphe mobile. Les liens restent soulignés dans les encadrés. La fin donne ce que j'ai écarté, ce que je ne sais pas et les fiches liées. Le composant de décision reprend règle/fait/décision quand ce contenu existe ; il ne force pas cette structure sur une explication pédagogique.

## Espace, étoile, cloche et droits

L'étoile se place sur la ligne de bot et la fiche, et sur l'idée lorsque le favori d'idée sera livré. Elle garde un objet dans Mon espace, gratuitement avec un compte. Une étoile d'idée n'active aucune cloche de variante présente ou future. « Mon espace ↗ » mène au labo ; « Compte et abonnement » y reste une tâche distincte. Les sessions entre domaines ne sont pas présentées comme un SSO existant.

La cloche est une action séparée, nommée « Suivre en direct », sur les bots qualifiés uniquement. Le badge « suivable en direct » décrit cette capacité, pas le droit du visiteur. Un bot Promu n'est pas automatiquement qualifié. Avant ouverture de J, la cloche reste réservée aux comptes Direct (D086) ; le prototype conserve ce comportement. À l'ouverture, invité vers connexion, gratuit/Labo vers offre, sans suivi automatique. Un Direct doit encore relier Telegram pour les messages ; le journal web reste consultable sans cette liaison. Couper un suivi reste possible après résiliation, indépendamment de l'étoile.

| Lecture / action | Invité | Compte gratuit | Abonné Labo | Abonné Direct |
|---|---|---|---|---|
| Règles, décisions, statistiques et trades clos publics | Oui | Oui | Oui | Oui |
| Étoile | Invite à se connecter | Oui | Oui | Oui |
| Recette réservée au Labo | Non | Non | Oui | Oui, Labo inclus |
| Positions ouvertes et journal immédiat G1 | Aucun détail privé | Aucun détail privé | Aucun détail privé | Oui, bots qualifiés |
| Cloche, vente fermée aujourd'hui | Absente | Absente | Absente | Oui, bots qualifiés |
| Journal différé G2 | Après livraison G2 | Après livraison G2 | Après livraison G2 | Immédiat via G1 |

Le panneau Direct est à la même place sur chaque fiche. Hors Direct : une explication sobre et un renvoi à l'état du service, sans montants privés floutés ni lignes envoyées puis cachées. Direct : positions ouvertes, journal horodaté, corrections visibles, source du prix et frais connus/inconnus. Le brut ne se nomme pas net. Une panne s'écrit « données indisponibles », jamais « aucune position ». Séparer dernière exécution, dernière synchronisation et réception Telegram. Le journal peut être frais sans nouveau trade.

G1 doit être dynamique et privé, sans cache partagé. G2 n'est pas un simple bouton : le serveur publie l'événement après 24 heures et aucun détail récent ne voyage dans le HTML public. Les statistiques et trades clos gardent leur rythme actuel. La maquette n'anticipe pas G2 comme s'il était livré.

## Offres et vente fermée

Une page comparative sur `lab.algoproof.fr/membre`, liée depuis le site, puis des sections adressables Labo et Direct. « Labo 29 €/mois ou 290 €/an », « Direct 59 €/mois, Labo inclus », paliers exclusifs, sans addition de deux prix. Ce sont les tarifs décidés dans le chantier. L'offre actuellement servie au relevé affiche aussi 9 €/mois pendant 3 mois, puis 29 €, jusqu'au 1er décembre ; ne pas supprimer cette différence sans traiter le lancement.

Direct doit dire « Vente fermée » tant que J ne l'ouvre pas, sans CTA d'achat actif et sans collecte d'email ajoutée. Décrire les exécutions après leur réalisation, les pertes, les retards possibles et les bots couverts ; aucun gain promis. CGU, offre, compte et fiche doivent nommer le même service. Je ne rends pas d'avis juridique dans ce contre-audit.

La maquette n'affiche pas le tarif Direct de 59 €, qui n'a pas été retrouvé dans la page de production publique consultée. Il figure ici comme **décision produit sourcée au brief et à D075**, distincte d'un chiffre relevé sur la prod. Les prix Labo n'ont pas besoin de devenir un bloc commercial sur les deux surfaces demandées.

## Des milliers de bots, et les paliers

Entrée : bibliothèque par idée × unité de temps, schéma de principe, nombre de variantes par état, recherche et filtres. D085 garde « Plus de variantes » tant que le classement sur la simulation n'est pas mûr. Quand il le sera, expliquer le score des idées et l'échantillon, sans PF de backtest en vitrine.

Fiche idée : variantes en registre, colonnes de différences, filtre Live/Promu/Labo indépendant des états arrêté/backtest seul, recherche conservée dans l'URL, pagination serveur, retour à la même position. Une idée étoilée ne suit pas tous ses bots en Direct. Flotte : vue transversale des bots en service, filtres et pagination, même vocabulaire. Mon espace : recherches par liste, favoris et suivis séparés.

Garder les bots sans trade et les arrêtés accessibles et comptés avec leur statut ; les exclure d'un calcul qui demande un échantillon en expliquant son dénominateur. Ne pas recopier `visibleBots()` de la branche dans le catalogue. Le résultat réel reste distinct du résultat simulé, même si la cohorte éditoriale réunit Live et Promu. Les identifiants stables protègent les favoris à la promotion. Ne pas importer les anciens détails d'identité de la maquette d'espace : D083 et D086 priment.

## Sources et portée de la maquette

Instantané des pages publiques à 14:39 Paris le 02/10/2026, pas données en direct. `/` : 115 bots, 3 réels, 1 406 sociétés, 1 782 153 configurations recalées, résultats des trois bots. `/bibliotheque` : 76 idées, 2 302 variantes, 95 en simulation, 2 207 en backtest seul. Fiches `/strategies/bot/v1-spot` et `/orb-bf25` : résultats, trades, règles, dates et décision. Les détails complets sont archivés sous `sources/`.

La maquette autonome permet accueil et deux fiches, chacun des quatre droits, favoris et cloche séparés, décision ORB dépliable, menu mobile, et accès aux sources. L'état Direct réserve les zones position ouverte/journal avec « non relevé » : il ne contient ni opération privée inventée ni faux accès abonné. Ce choix satisfait l'interdiction de fabriquer des données, mais ne vaut pas validation visuelle d'un journal réellement rempli.

Pas de framework ni de fichier Next modifié. Le guide Next local ne s'applique à aucune implémentation Next dans ce travail : le livrable est du HTML autonome avec CSS/JS intégrés. Aucun commit, aucune publication, aucune modification hors du dossier Astra.

## Contrastes calculés et vérification du rendu

Calcul sRGB effectué par `capturer-maquette.cjs`, valeurs arrondies au centième ; fichier brut [contrastes.json](sources/contrastes.json).

| Encre / contour | Sur fond #101714 | Sur surface #17211c | Sur actif #22332b |
|---|---:|---:|---:|
| Texte #edf1e8 | 15,89:1 | 14,44:1 | 11,64:1 |
| Note #a8b6ab | 8,61:1 | 7,83:1 | 6,31:1 |
| Action #abc8ec | 10,57:1 | 9,60:1 | 7,74:1 |
| Perte #ff9c90 | 9,02:1 | 8,19:1 | 6,60:1 |
| Réserve #e9c17c | 10,72:1 | 9,75:1 | 7,86:1 |
| Contour de contrôle #82988a | 5,90:1 | 5,36:1 | 4,32:1 |
| Filet décoratif #415449 | 2,24:1 | 2,04:1 | 1,64:1 |

Texte du bouton sur #263f55 : **9,53:1**. Vert Proof sur fond : **10,44:1**. Les filets décoratifs ne portent pas seuls une séparation nécessaire à l'identification d'une commande. Les courbes sont en encre claire ; les axes sont redimensionnés au viewport, avec des graduations réellement à 13 px sur téléphone, pas une police de 13 px ensuite réduite par le viewBox.

Le script capture 18 combinaisons : accueil aux deux largeurs, et deux bots × quatre droits × deux largeurs. Premier écran PNG et page entière JPEG pour chacune : **36 captures de maquette**, sans coupe de hauteur. La production a ses **28 captures** distinctes dans `captures/prod/`.

Contrôles exécutés : aucun débordement horizontal à 1440/390, un seul main, aucun tiret cadratin dans le texte rendu, aucune erreur JS, refus du favori invité, favori gratuit, cloche Direct seulement, panneau Direct absent visuellement hors Direct, étoile et cloche indépendantes, dépliage de la décision, fermeture du menu par Échap. Le fichier [verification-maquette.json](sources/verification-maquette.json) contient les mesures. Il ne s'agit pas d'un audit complet WCAG ou d'un contrôle de droits serveur : ce fichier autonome simule les droits et ne contient aucune donnée privée.

Le bas du panneau de décision se situe à **599 px pour EMA et 656 px pour ORB sur mobile**, commandes de maquette comprises, donc dans les 844 px du premier écran. Les captures ont été relues visuellement. Sur l'accueil mobile, les entrées des deux activités précèdent le registre : j'accepte de reporter les lignes détaillées sous le premier écran, au bénéfice de l'orientation. Ce compromis reste à confronter à des lecteurs ; je n'annonce pas un gain d'usage mesuré.
