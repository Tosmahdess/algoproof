"""Genere 048 en EXTRAYANT les corps de la 043, pour ne rien retaper.

Deux modifications, et rien d'autre :
  * survivor_family_catalog gagne un p_strategy, applique DANS son corpus
  * la branche teaser de survivor_family_all appelle ce catalogue scope
Le bloc payant de survivor_family_all est recopie octet pour octet.
"""
import io, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
SRC = r"D:\code\algoproof\supabase\migrations\043_generation_scoped_survivors.sql"
OUT = r"D:\code\algoproof-wt-teaser\supabase\migrations\048_survivor_family_catalog_scoped.sql"

lines = io.open(SRC, encoding="utf-8").read().split("\n")


def extract(start_marker):
    i = next(k for k, l in enumerate(lines) if l.startswith(start_marker))
    j = next(k for k in range(i, len(lines)) if lines[k] == "$$;")
    return "\n".join(lines[i : j + 1])


catalog = extract("create or replace function public.survivor_family_catalog(")
all_fn = extract("create or replace function public.survivor_family_all(")

# ---- catalogue : la signature -------------------------------------------------
old_sig = "create or replace function public.survivor_family_catalog(\n  p_dataset text default null\n)"
new_sig = (
    "create or replace function public.survivor_family_catalog(\n"
    "  p_dataset text default null,\n"
    "  p_strategy text default null\n"
    ")"
)
assert old_sig in catalog, "signature du catalogue introuvable"
catalog = catalog.replace(old_sig, new_sig, 1)

# ---- catalogue : le predicat, la seule ligne de logique ajoutee ---------------
# On le pose exactement ou la branche PAYANTE de survivor_family_all le pose deja,
# avec le meme texte, pour que les deux branches selectionnent leurs lignes pareil.
old_where = """     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       and m.dataset_version = coalesce("""
new_where = """     where m.published_at is not null
       and m.published_at >= '2026-08-12T19:38:00Z'::timestamptz
       -- LE SEUL AJOUT DE 048, et il est copie mot pour mot de la branche payante
       -- de survivor_family_all. Avant, la branche teaser filtrait par strategie
       -- APRES avoir construit le catalogue entier ; le filtre ne lui economisait
       -- donc rien, et elle mourait a 3 s pour tout visiteur non abonne.
       and (p_strategy is null
            or pg_catalog.lower(m.base) = pg_catalog.lower(p_strategy))
       and m.dataset_version = coalesce("""
assert catalog.count(old_where) == 1, f"where du catalogue : {catalog.count(old_where)} occurrence(s)"
catalog = catalog.replace(old_where, new_where, 1)

# ---- survivor_family_all : la branche teaser ---------------------------------
old_teaser_start = "  if v_access = 'teaser' then"
i = all_fn.find(old_teaser_start)
j = all_fn.find("  end if;", i)
assert i > 0 and j > i, "branche teaser introuvable"
old_teaser = all_fn[i : j + len("  end if;")]
new_teaser = """  if v_access = 'teaser' then
    -- 2026-09-18 : ceci construisait le catalogue ENTIER (13 761 familles, 4 Mo,
    -- 18,30 s) puis filtrait le tableau JSON obtenu. Le filtre par strategie
    -- n'economisait donc rien a qui n'avait pas paye, et cette branche mourait au
    -- statement_timeout de 3 s du role anon -- tandis que la branche payante plus
    -- bas, qui pousse le meme predicat DANS sa requete, repondait en 1,49 s.
    -- Le catalogue prend desormais ce predicat. Que cet appel rende les memes familles
    -- dans le meme ordre tient a la construction de family_id (voir l'en-tete) et se
    -- verifie au bloc 3b du protocole -- ce n'est pas une affirmation libre.
    return pg_catalog.jsonb_build_object(
      'access', v_access,
      'families', coalesce(
        public.survivor_family_catalog(p_dataset, p_strategy) -> 'families',
        '[]'::jsonb)
    );
  end if;"""
all_fn = all_fn.replace(old_teaser, new_teaser, 1)

# ---- garde-fou : le bloc payant n'a pas bouge --------------------------------
paid_old = extract("create or replace function public.survivor_family_all(")
# Le repere est le DEBUT du pipeline paye, pas un `end if;` : le premier de la fonction
# ferme le test d'abonnement, bien avant la branche teaser.
MARK = "  with corpus as ("
assert paid_old.count(MARK) == 1 and all_fn.count(MARK) == 1, "repere du pipeline paye ambigu"
assert paid_old[paid_old.find(MARK):] == all_fn[all_fn.find(MARK):], "LE BLOC PAYANT A CHANGE -- arret"
print("garde-fou : le bloc payant est identique octet pour octet")

header = """-- 048_survivor_family_catalog_scoped.sql
--
-- La moitie de /cockpit/survivants/tous qui reste morte pour un visiteur non abonne.
--
-- Mesure du 2026-09-18, apres la 047 : la page affiche desormais ses 38 strategies et
-- « 104 488 survivants sur 38 strategies », mais la liste des variantes ne s'affiche
-- toujours pas. survivor_family_all depasse encore les 3 s du role anon, et la page le
-- dit maintenant au lieu de rendre un corpus vide.
--
-- LA CAUSE, telle qu'elle est ecrite dans la 043 : la branche teaser appelle
-- survivor_family_catalog(p_dataset) -- 13 761 familles, 4 074 459 octets, 18,30 s
-- mesurees -- PUIS filtre le tableau JSON par strategie. Le filtre s'applique apres que
-- tout le travail a ete fait. La branche payante, elle, pousse
-- lower(m.base) = lower(p_strategy) dans son corpus et repond en 1,49 s pour 2,29 Mo,
-- mesure en posant l'identite d'un abonne reel.
--
-- CE QUE FAIT CETTE MIGRATION, ET RIEN D'AUTRE : le predicat descend d'un etage. Le
-- catalogue accepte p_strategy et l'applique dans son corpus, exactement au meme endroit
-- et avec le meme texte que la branche payante ; la branche teaser l'appelle scope.
--
-- POURQUOI FILTRER AVANT LE GROUP BY DONNE LE MEME RESULTAT QU'APRES, par construction :
-- family_id = 'fam_' || md5(signature), et la signature porte lower(base) comme premiere
-- cle (036). Une famille ne peut donc pas s'etendre sur deux bases distinctes, et min(base)
-- dans `grouped` est constant par famille a la casse pres. Le filtre etant lower() des deux
-- cotes, deux graphies d'une meme base passent ou echouent ensemble. La partition, les
-- survivor_count, robustness, timeframes et le representant sont les memes.
-- L'ORDRE aussi : le tri final est un comparateur total (il finit par family_id), et
-- filtrer une liste triee par un comparateur total rend la meme sous-suite que trier la
-- sous-population. Le visiteur ne verra donc pas ses familles se reordonner.
-- Ceci est un argument, pas une mesure : la mesure est le bloc 3b de
-- supabase/tests/survivor_family_teaser_live.sql, qui compare les tableaux jsonb
-- strategie par strategie, ordre compris, avant et apres.
--
-- POURQUOI LA CORRELATION N'EST PAS TOUCHEE ICI. La 047 a prouve une forme jointe, moins
-- chere, pour resoudre « la generation courante de chaque paire ». Elle n'est PAS reprise
-- ici : le but est que les lignes qui entrent dans le pipeline teaser soient selectionnees
-- par le MEME TEXTE SQL que celles de la branche payante. Deux implementations de la meme
-- regle, une par branche, c'est la configuration ou un abonne et un visiteur finissent par
-- voir deux corpus differents sans qu'aucun garde ne s'en apercoive. La factorisation des
-- quatre pipelines et la decorrelation restent reservees a leur propre migration, avec une
-- preuve d'equivalence dediee.
--
-- CE QUE LE PAYANT RISQUE : rien qui ne se mesure. Le bloc paye de survivor_family_all est
-- recopie octet pour octet -- ce fichier est genere par extraction du corps de la 043, et
-- le generateur s'arrete si ce bloc differe d'un seul caractere. Mais un garde qui vit dans
-- un script de generation ne dit rien de ce que la base execute : le bloc 3c du protocole
-- compare, octet pour octet, ce qu'un abonne reel recoit avant et apres.
--
-- CE QUE CETTE MIGRATION NE PROMET PAS : la vitesse. Elle supprime le travail inutile ; elle
-- ne cree aucun index. Le plancher mesure d'une traversee de cette table est de 2,29 s pour
-- un budget anon de 3 s, et rien ne sert `lower(base)` aujourd'hui. Attendre donc une
-- branche teaser « a la limite » plutot que confortable, et poser
-- supabase/manual/2026-09-18_survivor_family_member_lower_base_index.sql si la porte du
-- bloc 4 le reclame -- cet index sert le meme predicat des DEUX cotes de la frontiere.
--
-- ⚠️ L'ORDRE DES INSTRUCTIONS COMPTE. `create or replace` ne remplace pas une fonction dont
-- la SIGNATURE change : il en cree une SURCHARGE. Laisser vivre survivor_family_catalog(text)
-- a cote de (text, text) rendrait l'appel PostgREST ambigu -- HTTP 300, « could not choose
-- the best candidate ». L'ancienne signature est donc supprimee d'abord, et les droits sont
-- reposes derriere : ils ne suivent pas une nouvelle signature.

drop function if exists public.survivor_family_catalog(text);

"""

footer = """

comment on function public.survivor_family_catalog(text, text) is
  'Catalogue des familles de survivants, scope par strategie depuis 2026-09-18. Sans '
  'p_strategy il rend tout le corpus (13 761 familles, 4 Mo, 18,3 s) ; avec, il rend une '
  'strategie et sert la branche teaser de survivor_family_all, qui sans cela construisait '
  'le catalogue entier avant de le filtrer.';

revoke all on function public.survivor_family_catalog(text, text) from public;
grant execute on function public.survivor_family_catalog(text, text) to anon, authenticated;

-- Le cache de schema de PostgREST garde la signature d'avant : sans ceci, l'API repond
-- encore sur l'ancienne et le correctif est invisible depuis le site.
notify pgrst, 'reload schema';
"""

io.open(OUT, "w", encoding="utf-8", newline="").write(
    header + catalog + "\n\n" + all_fn + footer
)
print(f"ecrit : {OUT}")
