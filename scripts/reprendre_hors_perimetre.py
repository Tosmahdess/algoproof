"""Les sociétés que /investir ne peut pas noter, reprises depuis /wealth.

    python scripts/reprendre_hors_perimetre.py

CE QU'ELLES SONT. Vingt-sept sociétés analysées sur /wealth que la règle
d'Investir ne peut pas atteindre : dix-sept ne sont pas cotées aux États-Unis
et ne déposent donc rien auprès du régulateur américain, les autres sortent des
portes d'éligibilité. Leur analyse a été écrite à partir de données de marché,
sans aucun dépôt à citer : AUCUN de leurs chiffres n'est vérifiable, et la
fiche doit le dire en toutes lettres plutôt que de les laisser passer pour des
faits mesurés.

CE QU'ON GARDE ET CE QU'ON JETTE. La description et les risques traversent. La
valorisation (« le P/E trailing est de 20,6 ») et le momentum (« le cours
actuel de 453 € ») sont jetés : ce sont des chiffres de marché figés à une date
passée, et republier un cours vieux de trois mois comme s'il valait aujourd'hui
serait faux — c'est exactement ce que le site a cessé de faire.

LA COUPE GRATUIT / PAYANT est celle d'Investir : la description est ouverte, le
récit des risques est vendu et part dans `investir_recits`.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import sys
import unicodedata
import urllib.request

try:
    import truststore
    truststore.inject_into_ssl()
except ImportError:      # pragma: no cover
    pass

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / "src" / "data" / "investir-hors-perimetre.json"


def env() -> dict:
    out = {}
    for ligne in (RACINE / ".env.local").read_text(encoding="utf-8",
                                                   errors="ignore").splitlines():
        if "=" in ligne and not ligne.startswith("#"):
            cle, valeur = ligne.split("=", 1)
            out[cle.strip()] = valeur.strip().strip('"').strip("'")
    return out


def slugify(nom: str) -> str:
    sans = "".join(c for c in unicodedata.normalize("NFD", nom)
                   if unicodedata.category(c) != "Mn")
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", sans.lower())).strip("-")


def _get(url: str, cle: str, chemin: str):
    requete = urllib.request.Request(
        "%s/rest/v1/%s" % (url.rstrip("/"), chemin),
        headers={"apikey": cle, "Authorization": "Bearer %s" % cle})
    with urllib.request.urlopen(requete, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    e = env()
    url, cle = e["SUPABASE_URL"], e["SUPABASE_SERVICE_ROLE_KEY"]

    brut = _get(url, cle, "equity_fiches?select=ticker,asset_name,category,"
                          "generated_at,thesis_version,fondamentaux,risques"
                          "&order=thesis_version.desc")
    dernieres = {}
    for r in brut:
        dernieres.setdefault(r["ticker"], r)

    investir = json.loads((RACINE / "src" / "data" / "investir.json")
                          .read_text(encoding="utf-8"))
    deja = {f["name"].lower() for f in investir["fiches"]}
    registre = json.loads(pathlib.Path("D:/sec-bulk/company_tickers_exchange.json")
                          .read_text(encoding="utf-8"))
    i = {n: k for k, n in enumerate(registre["fields"])}
    par_cik = {}
    for l in registre["data"]:
        par_cik.setdefault(l[i["cik"]], set()).add(l[i["ticker"]])
    couverts = set()
    for f in investir["fiches"]:
        couverts |= par_cik.get(f["cik"], set())

    fiches, recits = [], []
    for ticker, r in sorted(dernieres.items()):
        if ticker in couverts or (r["asset_name"] or "").lower() in deja:
            continue
        nom = r["asset_name"] or ticker
        slug = slugify(nom)
        fiches.append({"slug": slug, "name": nom, "ticker": ticker,
                       "categorie": r.get("category"),
                       "description": r.get("fondamentaux"),
                       "as_of": (r.get("generated_at") or "")[:10]})
        if r.get("risques"):
            # Un identifiant NÉGATIF et STABLE : ces sociétés n'ont pas de
            # CIK — elles ne déposent rien à la SEC — et le signe le dit. Il est
            # dérivé du slug par un hachage, pas par `hash()`, dont la valeur
            # change d'une exécution à l'autre : deux passages auraient créé
            # deux lignes pour la même société.
            recits.append({"cik": -int(hashlib.sha1(slug.encode()).hexdigest()[:12], 16),
                           "slug": slug, "lecture": None,
                           "risques": r["risques"]})

    SORTIE.write_text(json.dumps({"fiches": fiches}, ensure_ascii=False, indent=1),
                      encoding="utf-8")
    print("hors perimetre : %d fiches" % len(fiches))
    print("  avec des risques a vendre : %d" % len(recits))

    if recits:
        corps = json.dumps(recits).encode("utf-8")
        requete = urllib.request.Request(
            "%s/rest/v1/investir_recits?on_conflict=cik" % url.rstrip("/"),
            data=corps, method="POST",
            headers={"apikey": cle, "Authorization": "Bearer %s" % cle,
                     "Content-Type": "application/json",
                     "Prefer": "resolution=merge-duplicates,return=minimal"})
        try:
            urllib.request.urlopen(requete, timeout=120)
            print("  recits pousses")
        except urllib.error.HTTPError as exc:
            raise SystemExit("HTTP %s : %s" % (exc.code,
                                               exc.read().decode("utf-8")[:300]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
