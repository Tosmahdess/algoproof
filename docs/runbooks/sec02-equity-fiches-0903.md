# SEC-02 — fermer la lecture publique du corpus payant

Le corpus vendu à 29 €/mois est lisible par n'importe quel visiteur. Ce runbook le ferme.
**L'ordre des quatre étapes n'est pas une préférence** : inversé, il vide `/wealth` pour tout le
monde.

## Le constat, mesuré le 2026-09-03

Le bundle public d'algoproof.fr contient **deux** appels `createClient`, sur le même projet et la
même clé publiable :

| | ce qui est livré | ce que c'est |
|---|---|---|
| 1 | `…, {cookieOptions:{name:"sb-algoproof-auth"}}` | client d'identité — public par nature |
| 2 | `createClient("https://avdego….supabase.co", "sb_publishable_…")`, **sans** cookieOptions | `src/lib/supabase.ts`, le client **contenu** |

Le second arrive par `MiRegimeBadge.tsx` (`'use client'`) → `@/lib/queries` → `./supabase` : le badge
interroge Supabase depuis le navigateur, donc la clé part dans le bundle **par conception**.

Identité et contenu sont **un seul projet Supabase**. Or `equity_fiches` porte
`FOR SELECT USING (true)` depuis le 2026-06-01, sans migration postérieure. Donc tout visiteur
dispose d'une clé qui lit `fondamentaux`, `valorisation`, `momentum`, `risques` et
`inputs_snapshot`, quoi que la page Next choisisse d'afficher.

Le paywall applicatif est correct — vérifié en production sur 8 fiches, les cinq gratuites montrent
verdict + raison, la prose est membres-only partout. Il filtre le robinet ; la vanne est ouverte à
côté.

**Rayon de souffle** : toutes les policies ouvertes ont été énumérées. `growth_alerts`,
`macro_reports`, `bot_changelogs`, `comments` sont publiques par choix. **`equity_fiches` est la
seule qui porte du payant.** Une surface, pas trois.

## Pourquoi une vue et pas un `revoke` colonne par colonne

C'est le correctif que proposait l'audit, et le vault l'a déjà jugé
(`project_engine_verdicts_exposure`, leçon 4) : **fail-open**. La prochaine colonne ajoutée à la
table est lisible par anon le jour de sa création. C'est littéralement le mécanisme par lequel
l'incident `engine_verdicts` est passé d'une surface à trois pendant que tous les plans en
annonçaient une. Une vue est fail-closed : une colonne neuve reste invisible tant que personne ne
l'écrit dans la liste.

## Étape 0 — la variable, avant tout le reste

Poser **`SUPABASE_SERVICE_ROLE_KEY`** sur le projet Vercel `algoproof`, **tous les targets**
(Production + Preview + Development). Valeur = la clé service-role du projet contenu, celle
qu'utilise déjà `apex-wealth/equity_fiche_generator.py`.

⚠️ `vercel env rm <nom> <env>` supprime **l'enregistrement entier**, pas la cible. Pour corriger une
portée → dashboard.

Sans elle, `getFicheFull` journalise et rend la page **verrouillée** : pas de 500, mais un membre
payant ne voit pas ce qu'il paie. Chercher `getFicheFull(` dans les logs.

## Étape 1 — la vue (additive, ne casse rien)

SQL editor du dashboard, projet contenu. La DDL ne passe pas par le CLI : le mot de passe du
`.env.local` est périmé et le pooler `eu-west-3` est une région morte (le projet est en `eu-west-1`).

```
supabase/migrations/028_equity_fiches_public_view.sql
```

Rien n'est révoqué à ce stade : le site continue de tourner exactement comme avant.

**Vérifier** : `GET {url}/rest/v1/equity_fiches_public?select=ticker&limit=1` → **200**.
Un `PGRST205` signifie que le `NOTIFY pgrst` n'a pas pris — le rejouer.

## Étape 2 — déployer le code

Merger `fix/wealth-sec02-0903`. Vercel déploie au push.

Ce que le code change : les quatre lecteurs qu'un invité peut atteindre (`getFicheSummary`,
`getCoveredFiches`, `getAllFiches`, `getFicheSitemapData`) plus `getFreeTickers` lisent la **vue** ;
`getFicheFull`, seul, garde la table de base et passe par le client privilégié.

**Vérifier avant l'étape 3** : `/wealth` liste bien ses 82 sociétés, une fiche verrouillée affiche sa
carte d'abonnement, une fiche membre affiche ses quatre sections. Si `/wealth` est vide ici,
**ne pas appliquer 029** — l'étape 1 ou 2 a raté.

## Étape 3 — la révocation (celle qui ferme réellement)

```
supabase/migrations/029_equity_fiches_revoke_anon.sql
```

**Vérifier depuis l'extérieur, avec la clé de l'attaquant** — jamais depuis le message de succès de
l'éditeur. Deux révocations de l'incident d'août ont été annoncées appliquées et ne l'étaient pas ;
seule une sonde externe l'a montré. Avec la clé publiable présente dans le bundle :

```
GET {url}/rest/v1/equity_fiches?select=fondamentaux&limit=1   -> attendu 401
GET {url}/rest/v1/equity_fiches_public?select=ticker&limit=1  -> attendu 200
```

Un 200 sur la première ligne = la migration n'a pas pris.

Puis, en navigation privée : une fiche verrouillée en invité, une fiche complète en membre.

## Ce que ce runbook ne fait pas

Le badge MI continue d'interroger Supabase depuis le navigateur, donc la clé publiable reste dans le
bundle. C'est acceptable une fois 029 passée — cette clé ne lit plus rien de payant — mais c'est une
dette : le prochain qui ajoute une table sensible dans ce projet hérite du même piège. Sortir
`MiRegimeBadge` du navigateur est le nettoyage à faire **après** le lancement, pas pendant.
