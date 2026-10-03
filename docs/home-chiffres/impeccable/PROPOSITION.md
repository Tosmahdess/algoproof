# Proposition Impeccable : les chiffres du moteur, posés comme une addition

**Chiffres retenus** (tous calculés au rendu ; valeurs du 03/10) :
- **Recalées 1 775 174, En sursis 364 556, Candidates 4 347** : `getFunnelCounts()` (`n_no_go`, `n_marginal`, `n_go`), dernière génération par palier, moteur corrigé seulement. Définitions vérifiées dans `GAUNTLET_VERDICTS` : la recalée échoue ; la configuration en sursis rate une seule des trois premières épreuves et reste publiée ; la candidate tient les quatre épreuves.
- **Configurations jugées 2 144 077** : `n_judged`. Les trois verdicts y somment exactement (`verdictTotals`), d'où la forme d'addition.
- **≈ 1 sur 500** : `heroRatio(n_go, n_judged)`, dit dans le titre.
- **Recensées 51 339 525**, dont 49 195 448 sans verdict : `n_swept`, et `n_swept − n_judged`. Elles restent hors de la somme et ne sont jamais appelées recalées (D059).
- **215 bots = 195 issus du moteur + 20 déployés à la main** : ce sont les bots servis, hors archivés, et le partage par `engine_unit_key` ; c'est le compte de /overview (`FleetRegister`). 215 = `n_promoted`.

**Les mots** :
- titre : « Mon moteur retient environ 1 configuration sur 500 » ;
- une phrase qui définit configuration et candidate (« Une candidate n'est pas une gagnante… ») ;
- les liens « Voir le cimetière » et « Comment je décide » ;
- la note sous le total : « Ces nombres comptent des configurations. Mes bots et les variantes de la bibliothèque se comptent à part. »
- au pied du registre réel : « Sur ces 215 bots, 195 sont issus de mon moteur et 20 ont été déployés à la main avant lui. »

**Emplacement** :
- Sur ordinateur, une section suit immédiatement le registre en argent réel, avant la bibliothèque. À gauche, le titre, la définition et les liens. À droite, l'addition : trois lignes de registre, puis le total sous un filet lichen fermé par le double trait (règle « Double trait de l'addition »). Chiffres en 20/22 px tabulaires, comme les résultats du registre.
- Sur téléphone, le bloc s'empile : titre, définition, liens, puis l'addition en pleine largeur. Libellé à gauche, chiffre à droite, note sous la ligne. Le plus long chiffre (« 2 144 077 ») tient en environ 100 px.
- L'ancien bloc « recalées » du bas disparaît : son chiffre devient la première ligne de l'addition, son lien passe dans la section. L'article reste seul.

**Pourquoi c'est mieux** :
- Le dénominateur revient. Les échecs passent avant la bibliothèque et ne sont plus au même poids qu'un article.
- La forme vient du contenu : trois comptes qui somment à un total. Ce n'est pas le gabarit « gros chiffre, petit libellé ».
- Bots, configurations et variantes restent trois ensembles nommés séparément. Chaque total montre ses parts.

**Risques** :
- La section ajoute environ 330 px sur ordinateur et 600 px sur téléphone. La bibliothèque descend d'autant.
- Lire la ligne « 195 issus du moteur » juste au-dessus des « 4 347 candidates » peut suggérer un emboîtement que les données ne garantissent pas : des bots peuvent venir de générations antérieures. La note le dit, mais en 13 px.

**Écarté** :
1. Le ratio dans le chapô : il mêle bots et configurations dans une même phrase, ce que D059 a refusé, et il repousse les deux entrées sous la ligne de flottaison du téléphone.
2. Une bande entre les entrées et le registre réel : elle fait passer le registre, choix du propriétaire, sous le premier écran en 1440×900.
3. Une chaîne « 51 M recensées → 2,1 M jugées → 4 347 candidates → 2 307 variantes → 215 bots » : les comptes ne s'emboîtent pas. Les variantes ne sont pas les candidates, et 20 bots ne viennent pas du moteur.
4. Agrandir le bloc du bas : l'échec resterait en fin de page, à côté d'un article.
5. Les exemples par stratégie (`EngineSurvival`) : ils se liraient comme un classement, et /strategies les porte déjà.
