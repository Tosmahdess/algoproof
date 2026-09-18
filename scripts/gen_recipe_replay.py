"""Generate src/data/recipe-replay.json from the C2 replay artefact.

The C2 replay (vault: projects/apex-trading/backtests_massive/audits/
2026-09-10-strategy-audit/c2) re-ran the 114 wave-1 recipes on the repaired
execution contract. This script keeps the CONTRACT reading of the 75 heads the
site publishes, and ONLY five fields per row: slug, base, tf, pf, n.

No gate column is exported on purpose (user decision 2026-09-18): nothing marks
the recipes that lose a hard gate in the replay (12 of the 75 heads; 19 of 108
over the whole wave). The corrected engine re-runs the families they came from
(D-AUDIT-4: the wave itself is not re-judged). Provenance is copied from c2_data_manifest.json,
never retyped.

Usage:
    python scripts/gen_recipe_replay.py <path/to/c2 directory>
"""
from __future__ import annotations

import csv
import hashlib
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "recipe-replay.json"

# The heads are the wave-1 bots published on algoproof.fr; median and marginal
# slots run on the VPS as controls for the wave measure and are not published.
PUBLISHED_TIER = "go_head"
READING = "CONTRACT"
REPLAYED_ON = "2026-09-12"  # vault commit 66e3eb50
# Expiry of this block. The corrected H4 tour started 2026-09-18 on the remote
# host; ~26 days for 41 bases is an UNMEASURED estimate, and H1 has no host yet.
# Re-check this date against the first measured H4 unit duration. When the test
# goes red: replace the block with the corrected engine's families, or close it
# with a sentence. Never just push the date.
VALID_UNTIL = "2026-10-18"
# c2_summary.md section 2: every recipe is replayed on the 30 symbols of the
# dataset it cites (delisted TON included, because the published PF includes it).
# That is the selection universe, not the bot's own traded basket.
UNIVERSE_ASSETS = 30


def main(c2_dir: Path) -> None:
    csv_path = c2_dir / "c2_recipes.csv"
    manifest = json.loads((c2_dir / "c2_data_manifest.json").read_text(encoding="utf-8"))
    csv_sha = hashlib.sha256(csv_path.read_bytes()).hexdigest()

    rows = []
    datasets = set()
    with csv_path.open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["variant"] != READING or r["tier"] != PUBLISHED_TIER:
                continue
            datasets.add(r["dataset"])
            rows.append({
                "slug": r["slug"],
                "base": r["base"],
                "tf": r["tf"],
                "pf": round(float(r["pf"]), 4),
                "n": int(r["n"]),
            })
    if len(datasets) != 1:
        raise SystemExit(f"expected one dataset, got {sorted(datasets)}")
    rows.sort(key=lambda r: r["slug"])
    dataset = datasets.pop()  # "data_YYYYMMDD", the last bar's date

    payload = {
        "meta": {
            "source": "c2_replay",
            "reading": READING,
            "replayedOn": REPLAYED_ON,
            "validUntil": VALID_UNTIL,
            "dataset": dataset,
            "dataThrough": f"{dataset[5:9]}-{dataset[9:11]}-{dataset[11:13]}",
            "universeAssets": UNIVERSE_ASSETS,
            "engineFingerprint": manifest["engine_fingerprint_worktree"],
            "recipesEngineFingerprint": manifest["recipes_engine_fingerprint"],
            "vaultBaseCommit": manifest["vault_base_commit"],
            "csvSha256": csv_sha,
        },
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(rows)} rows -> {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(Path(sys.argv[1]))
