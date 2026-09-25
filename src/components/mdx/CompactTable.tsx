import { Children, isValidElement, type ReactNode } from 'react'
import { isNumeric, detectSign } from './cellKind'

const signColor = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-foreground',
}

interface RowProps {
  values: string
  _colCount?: number
  _aligns?: string[]
  _isSummary?: boolean
  _widths?: string
  _headers?: string[]
}

export function Row({ values, _colCount, _aligns, _isSummary, _widths, _headers }: RowProps) {
  const cells = values.split('|').map(c => c.trim())
  const count = _colCount ?? cells.length
  const aligns = _aligns ?? ['left', ...Array(count - 1).fill('right')]
  const gridTemplate = _widths ?? aligns.map(a => (a === 'right' ? 'max-content' : 'minmax(0,1fr)')).join(' ')

  const baseBg = _isSummary ? 'bg-card border-t border-border' : ''

  // Below sm the row is a stacked card: first cell as its title, every other
  // cell as « header : value ». A 5-column grid cannot fit 390px without
  // hiding the column the article is about (10 stratégies IA, 2026-09-24).
  const stacked = (
    <div className={`sm:hidden px-3 py-3 ${baseBg}`}>
      <div className="text-sm font-semibold">{cells[0]}</div>
      <dl className="mt-1.5 space-y-1">
        {cells.slice(1).map((cell, j) => {
          const numeric = isNumeric(cell)
          const color = numeric ? signColor[detectSign(cell)] : 'text-foreground'
          return (
            <div key={j} className="flex gap-2 text-sm">
              <dt className="shrink-0 text-xs font-semibold text-muted pt-0.5">{_headers?.[j + 1]}</dt>
              <dd className={`min-w-0 break-words ${numeric ? 'font-mono tabular-nums' : ''} ${color}`}>{cell}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )

  return (
    <>
    {stacked}
    <div
      className={`hidden sm:grid ${baseBg}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {cells.map((cell, i) => {
        // Alignment follows the COLUMN (as its header does), so a column
        // never zigzags between left and right row to row. The numeric look
        // (mono, nowrap) is decided per CELL from its whole content: a text
        // cell that merely contains a digit wraps like prose — the fix for
        // long text cells force-nowrapped into a 700-900px table on phone.
        const numeric = isNumeric(cell)
        const sign = detectSign(cell)
        const weight = _isSummary ? 'font-semibold' : ''
        const align = aligns[i] === 'right' ? 'text-right' : 'text-left'
        const shape = numeric
          ? 'font-mono tabular-nums whitespace-nowrap'
          : 'whitespace-normal break-words min-w-0'
        const color = numeric ? signColor[sign] : 'text-foreground'

        return (
          <div key={i} className={`px-3 sm:px-4 py-2.5 ${align} ${shape} ${color} ${weight} text-sm`}>
            {cell}
          </div>
        )
      })}
    </div>
    </>
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
  const alignArr = aligns
    ? aligns.split('|').map(a => a.trim())
    : ['left', ...Array(colCount - 1).fill('right')]
  // Default template: right-aligned (numeric) columns size to their content,
  // text columns share the remaining space — not an equal repeat(n,1fr),
  // which was the min-700-900px-wide cause on phone.
  const gridTemplate = widths ?? alignArr.map(a => (a === 'right' ? 'max-content' : 'minmax(0,1fr)')).join(' ')

  const rows = Children.toArray(children).filter(isValidElement)
  const lastIndex = rows.length - 1

  return (
    <div className="not-prose my-8 sm:overflow-x-auto">
      <div className="sm:inline-block align-middle w-full sm:min-w-full">
        <div className="border border-border rounded-md overflow-hidden bg-card/40">
          <div
            className="hidden sm:grid bg-card border-b border-border"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {headers.map((h, i) => {
              const right = alignArr[i] === 'right'
              return (
                <div
                  key={i}
                  className={`px-3 sm:px-4 py-2.5 text-xs font-semibold text-muted ${
                    right ? 'text-right whitespace-nowrap' : 'text-left'
                  }`}
                >
                  {h}
                </div>
              )
            })}
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
                  _headers={headers}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
