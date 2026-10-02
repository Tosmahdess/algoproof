# Retours du propriétaire sur la maquette d'Astra (2 octobre 2026)

Appliqués à `MAQUETTE_ASTRA.html` par Claude, captures régénérées :

0. **Règle d'accès (propriétaire, 02/10)** : la fiche de stratégie et ses réglages sont réservés aux
   abonnés, **sauf l'EMA cross**, ouverte à tous comme exemple complet. Le verdict, la règle, la
   décision et tous les trades restent publics. Dans la maquette, sur la fiche ORB, un invité ou un compte gratuit voit le panneau
   « Réservé aux abonnés » ; l'EMA cross (v1-spot) reste ouverte. Le code actuel ne réserve que la
   recette des bots du moteur (`RecipeGate`) : à étendre en production.


0 bis. **Pas de nom de l'auteur sur le site** (propriétaire, 02/10) : « Thomas Dessombs » est retiré de
   la maquette (signature de l'accueil, pied de page). La voix reste en « je ». Ce point amende la
   ligne « Byline » de PRODUCT.md et le correctif n° 58 du rapport (signer les articles) : on date les
   articles, sans nom.

1. **Accueil, bots en argent réel** :
   - triés **du meilleur résultat au moins bon** : Kraken +272,73 €, EMA Hyperliquid +187,47 €,
     ORB −17,68 € ;
   - sous-titre « Du meilleur résultat au moins bon. » ;
   - le lien vers la flotte existait mais ne se voyait pas : il reste en haut à droite et devient aussi
     un bouton sous le registre, « Voir toute la flotte · 115 bots, réels et simulés → ».
   - Remplace la règle C7 « plus long historique d'abord », et la proposition d'Astra de mettre ORB
     en tête. À reporter dans `DECISIONS.md`.
2. **Phrase retirée** : « Je ramène chaque historique à une base de 1 000 €… » sur l'accueil.
   - Retirée aussi sur la fiche, dans sa variante « Je ramène mon historique à cette base… ».
   - À confirmer : la fiche dit encore « Base de comparaison 1 000 € » dans ses chiffres.
3. **Bloc de fin de l'accueil** :
   - titre « Garder un bot en favori, ou le suivre en direct » ;
   - texte « Mets un bot en favori pour le retrouver dans ton espace. Avec l'offre Direct, tu reçois
     aussi son journal de trades en temps réel, sur sa fiche et dans Telegram. La vente de Direct est
     encore fermée. »
4. **Vocabulaire** :
   - l'étoile s'appelle les **favoris** (« Un favori n'envoie aucun message. ») ;
   - « journal immédiat » devient **journal de trades** partout ;
   - dans le texte, l'espace du lecteur est « **ton espace** ». « Mon espace » reste seulement le nom
     de la page dans la navigation.
5. **Fiche** :
   - « Je dépasse les limites publiées… » devient « Ce bot dépasse les limites de baisse et de
     rentabilité que j'avais publiées. » ;
   - section Direct titrée « Positions ouvertes et journal de trades ».
6. **Sur-titres en capitales retirés** (relecture Impeccable) :
   - « Les paliers de mes bots » devient un vrai titre ;
   - le bloc article n'a plus d'étiquette ;
   - le lien devient « Lire l'article ».

À faire hors maquette :

- **Page flotte (/overview)** : le classement est bon, mais il est coupé en deux par le rodage. Il
  faut **une seule liste, du meilleur au moins bon**. L'étiquette « rodage » reste sur chaque ligne
  concernée, mais les bots en rodage ne forment plus de groupe séparé.
  - Constat lié : n° 43 du rapport.
  - Remarque d'Astra : la longueur de la page se traite par pagination ou filtres, pas par repli.
- **Cimetière** : pas à jour. Chantier à ouvrir plus tard. Le bloc de l'accueil garde le chiffre en
  attendant.
