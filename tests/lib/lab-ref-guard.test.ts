import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Lot 8 of the design audit (2026-09-25, C4): every link from this site to the
// lab goes through labUrl(), which appends the ref the lab records. A bare
// `href="https://lab.algoproof.fr/..."` in a component is a visit the measure
// cannot attribute, so this test lists them by file:line.
//
// Data modules (strategy-library's labHref/presetHref, provenance's dossier URL)
// hold the URL and the RENDERER wraps it; API routes, middleware and auth read
// the host for other reasons. Those files are out of scope by path.
const SRC = path.resolve(__dirname, '../../src')
const SCOPE = ['components', 'app']
const OUT_OF_SCOPE = [/[\\/]api[\\/]/, /__tests__/, /\.test\./]

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

describe('every lab link a page renders carries the ref', () => {
  it('no bare lab href outside labUrl()', () => {
    const offenders: string[] = []
    for (const scope of SCOPE) {
      for (const file of walk(path.join(SRC, scope))) {
        if (OUT_OF_SCOPE.some(re => re.test(file))) continue
        const lines = fs.readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, i) => {
          const isHref = /href\s*=/.test(line)
          // Data modules that hold a lab URL under a field are named here too: the
          // membership link of the method (GAUNTLET_ACCESS.href) shipped bare on 26/09.
          const toLab = /lab\.algoproof\.fr|LAB_URL|LAB_ORIGIN|labHref|presetHref|dossierHref|ACCOUNT_URL|LAB_APP_URL|GAUNTLET_ACCESS/.test(line)
          if (isHref && toLab && !/labUrl\(/.test(line)) {
            offenders.push(`${path.relative(SRC, file).replace(/\\/g, '/')}:${i + 1}`)
          }
        })
      }
    }
    expect(offenders).toEqual([])
  })
})
