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

Two outputs, both in src/app/fonts/, next to the font's licence (SIL OFL 1.1, no
Reserved Font Name):

- SchibstedGrotesk-wght.woff2, the variable font loaded by next/font/local in
  src/app/layout.tsx;
- SchibstedGrotesk-400.ttf to -700.ttf, one static font per weight, for the
  images Satori draws (next/og, read by src/lib/og-fonts.ts). Satori reads
  neither WOFF2 nor variable fonts; with only its default face it drew the spaces
  between words at uneven widths (« Croisement  EMA »).

Usage (fontTools and brotli required):

    curl -L -o SchibstedGrotesk.ttf \
      "https://github.com/google/fonts/raw/main/ofl/schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf"
    python scripts/fonts/build_schibsted.py SchibstedGrotesk.ttf            # both
    python scripts/fonts/build_schibsted.py SchibstedGrotesk.ttf --static   # the TTFs only
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

FONTS = Path(__file__).resolve().parents[2] / 'src' / 'app' / 'fonts'
OUT = FONTS / 'SchibstedGrotesk-wght.woff2'
# The weights the images set: regular, medium (the regime badge), semibold (names
# and figures), bold (the wordmark).
STATIC_WEIGHTS = (400, 500, 600, 700)


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


def subset_source(source: str) -> TTFont:
    font = TTFont(source)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    return font


def narrow_comma(font: TTFont) -> TTFont:
    if drop_comma_from_tnum(font) == 0:
        raise SystemExit('no comma in the tnum lookups: the source font changed, check it by hand')
    return font


def main(source: str, static_only: bool) -> None:
    if not static_only:
        font = narrow_comma(instancer.instantiateVariableFont(subset_source(source), {'wght': (400, 700)}))
        font.flavor = 'woff2'
        font.save(OUT)
        print(f'{OUT} ({OUT.stat().st_size} bytes)')

    for weight in STATIC_WEIGHTS:
        static = narrow_comma(instancer.instantiateVariableFont(
            subset_source(source), {'wght': weight}, updateFontNames=True))
        path = FONTS / f'SchibstedGrotesk-{weight}.ttf'
        static.save(path)
        print(f'{path} ({path.stat().st_size} bytes)')


if __name__ == '__main__':
    main(sys.argv[1], '--static' in sys.argv[2:])
