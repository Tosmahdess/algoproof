import { Children, isValidElement, type ReactNode } from 'react'

function isNumeric(s: string): boolean {
  return /[+\-−]?\s*\d/.test(s.trim())
}

function detectSign(s: string): 'positive' | 'negative' | 'neutral' {
  const trimmed = s.trim()
  if (/^[+]/.test(trimmed)) return 'positive'
  if (/^[−–-]\s*\d/.test(trimmed)) return 'negative'
  return 'neutral'
}

const signColor = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-foreground/90',
}

interface RowProps {
  values: string
  _colCount?: number
  _aligns?: string[]
  _isSummary?: boolean
  _widths?: string
}

export function Row({ values, _colCount, _aligns, _isSummary, _widths }: RowProps) {
  const cells = values.split('|').map(c => c.trim())
  const count = _colCount ?? cells.length
  const aligns = _aligns ?? ['left', ...Array(count - 1).fill('right')]
  const gridTemplate = _widths ?? `repeat(${count}, 1fr)`

  const baseBg = _isSummary ? 'bg-card border-t border-border' : ''

  return (
    <div
      className={`grid ${baseBg}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {cells.map((cell, i) => {
        const numeric = isNumeric(cell)
        const sign = detectSign(cell)
        const align = aligns[i] === 'right' ? 'text-right' : 'text-left'
        const font = numeric ? 'font-mono tabular-nums' : ''
        const color = numeric ? signColor[sign] : 'text-foreground/90'
        const weight = _isSummary ? 'font-semibold' : ''
        const wrap = numeric ? 'whitespace-nowrap' : ''

        return (
          <div key={i} className={`px-3 sm:px-4 py-2.5 ${align} ${font} ${color} ${weight} ${wrap} text-xs sm:text-sm`}>
            {cell}
          </div>
        )
      })}
    </div>
  )
}

interface CompactTableProps {
  cols: string
  widths?: string
  aligns?: string
  summary?: boolean
  children: ReactNode
}

export function CompactTable({ cols, widths, aligns, summary, children }: CompactTableProps) {
  const headers = cols.split('|').map(h => h.trim())
  const colCount = headers.length
  const gridTemplate = widths ?? `repeat(${colCount}, 1fr)`
  const alignArr = aligns
    ? aligns.split('|').map(a => a.trim())
    : ['left', ...Array(colCount - 1).fill('right')]

  const rows = Children.toArray(children).filter(isValidElement)
  const lastIndex = rows.length - 1

  return (
    <div className="not-prose my-8 -mx-4 sm:mx-0 overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="border border-border rounded-md overflow-hidden bg-card/40">
          <div
            className="grid bg-card border-b border-border"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {headers.map((h, i) => (
              <div
                key={i}
                className={`px-3 sm:px-4 py-2.5 text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-muted font-semibold whitespace-nowrap ${
                  alignArr[i] === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          <div className="divide-y divide-border/60">
            {rows.map((row, i) => {
              if (!isValidElement<RowProps>(row)) return row
              return (
                <Row
                  key={i}
                  {...row.props}
                  _colCount={colCount}
                  _aligns={alignArr}
                  _isSummary={summary === true && i === lastIndex}
                  _widths={gridTemplate}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
