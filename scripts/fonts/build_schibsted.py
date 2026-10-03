"""Build the site's copy of Schibsted Grotesk, with a narrow comma in tabular figures.

Refonte « Le registre des décisions », lot 1 (2026-10-02). The site sets its
figures in Schibsted Grotesk with `font-variant-numeric: tabular-nums`. The
font's `tnum` feature swaps the comma (and the period) for a figure-wide glyph,
`comma.tf`: measured at 100 px, the comma is 26,5 px wide in proportional
figures and 63,5 px in tabular ones, so « 272,73 € » read « 272 , 73 € » in every
large number. French figures carry a decimal comma in nearly every amount.

This script removes the comma from the `tnum` substitution and nothing else:
digits stay tabular, the period keeps its tabular form. Columns still align,
because every amount in a column carries the same number of decimals, so the
comma sits at the same place from the right on each line.

It also pins the weight axis to 400-700, the four weights the site uses, and
keeps the Latin and punctuation ranges the site sets (see UNICODES).

Usage (fontTools and brotli required):

    curl -L -o SchibstedGrotesk.ttf \
      "https://github.com/google/fonts/raw/main/ofl/schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf"
    python scripts/fonts/build_schibsted.py SchibstedGrotesk.ttf

The output lands in src/app/fonts/, next to the font's licence (SIL OFL 1.1, no
Reserved Font Name), and is loaded by next/font/local in src/app/layout.tsx.
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

# Latin, Latin-1, Latin Extended-A, general punctuation (U+202F, U+2212 and the
# dashes), the euro, arrows (→ ↗) and mathematical operators (≈ ≥ ≤). The source
# also draws Vietnamese and Latin Extended-B, which the site never sets.
UNICODES = (
    list(range(0x0000, 0x0180)) + [0x0131, 0x0152, 0x0153, 0x02C6, 0x02DA, 0x02DC]
    + list(range(0x2000, 0x2070)) + [0x20AC, 0x2122]
    + list(range(0x2190, 0x2200)) + list(range(0x2200, 0x2300)) + list(range(0x25A0, 0x2700))
)

OUT = Path(__file__).resolve().parents[2] / 'src' / 'app' / 'fonts' / 'SchibstedGrotesk-wght.woff2'


def drop_comma_from_tnum(font: TTFont) -> int:
    gsub = font['GSUB'].table
    lookups = {
        index
        for record in gsub.FeatureList.FeatureRecord
        if record.FeatureTag == 'tnum'
        for index in record.Feature.LookupListIndex
    }
    removed = 0
    for index in lookups:
        for sub in gsub.LookupList.Lookup[index].SubTable:
            table = sub.ExtSubTable if hasattr(sub, 'ExtSubTable') else sub
            mapping = getattr(table, 'mapping', None)
            if mapping and 'comma' in mapping:
                del mapping['comma']
                removed += 1
    return removed


def main(source: str) -> None:
    font = TTFont(source)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, {'wght': (400, 700)})
    if drop_comma_from_tnum(font) == 0:
        raise SystemExit('no comma in the tnum lookups: the source font changed, check it by hand')
    font.flavor = 'woff2'
    font.save(OUT)
    print(f'{OUT} ({OUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main(sys.argv[1])
