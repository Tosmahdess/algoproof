// src/lib/og-fonts.ts
//
// The site's face for the images Satori draws (next/og): the share card
// /api/card/<slug>, a bot's social image, the site's social image. Without a font
// of its own, ImageResponse falls back to its default face and the spaces between
// words came out at uneven widths (« Croisement  EMA »). Satori reads neither WOFF2
// nor a variable font, so these are static TTFs, one per weight the images set,
// built by scripts/fonts/build_schibsted.py with the same narrow comma as the site
// (SIL OFL 1.1, the licence sits beside them in src/app/fonts/). They carry no
// kerning and no ligatures: Satori measures each character on its own but draws a
// word whole, so a kerned word left the space after it too wide (« +27,3  % »).
//
// Read from disk with a path joined to process.cwd(), as the Next 16 docs do for
// opengraph-image: the build traces the files into the function. Node runtime only.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const OG_FONT_FAMILY = 'Schibsted Grotesk'

const WEIGHTS = [400, 500, 600, 700] as const
type Weight = (typeof WEIGHTS)[number]

export type OgFont = { name: string; data: ArrayBuffer; weight: Weight; style: 'normal' }

function load(weight: Weight): Promise<Buffer> {
  return readFile(join(process.cwd(), 'src', 'app', 'fonts', `SchibstedGrotesk-${weight}.ttf`))
}

let fonts: Promise<OgFont[]> | null = null

/** The four weights, read once per server instance. A failed read is not cached. */
export function ogFonts(): Promise<OgFont[]> {
  fonts ??= Promise.all(
    WEIGHTS.map(async weight => {
      const buf = await load(weight)
      const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
      return { name: OG_FONT_FAMILY, data, weight, style: 'normal' as const }
    }),
  ).catch(err => {
    fonts = null
    throw err
  })
  return fonts
}

/** The `fonts` option of an ImageResponse. An image route must never throw: should
 *  the files be missing, the image is drawn in Satori's default face, and the error
 *  is logged. */
export async function ogFontOptions(): Promise<{ fonts?: OgFont[] }> {
  try {
    return { fonts: await ogFonts() }
  } catch (err) {
    console.error('og-fonts: Schibsted Grotesk unreadable, default face used', err)
    return {}
  }
}
