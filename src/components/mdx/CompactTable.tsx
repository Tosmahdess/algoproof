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
}

export function Row({ values, _colCount, _aligns, _isSummary, _widths }: RowProps) {
  const cells = values.split('|').map(c => c.trim())
  const count = _colCount ?? cells.length
  const aligns = _aligns ?? ['left', ...Array(count - 1).fill('right')]
  const gridTemplate = _widths ?? aligns.map(a => (a === 'right' ? 'max-content' : 'minmax(0,1fr)')).join(' ')

  const baseBg = _isSummary ? 'bg-card border-t border-border' : ''

  return (
    <div
      className={`grid ${baseBg}`}
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
    <div className="not-prose my-8 -mx-4 sm:mx-0 overflow-x-auto">
      <div className={`inline-block align-middle ${colCount >= 5 ? 'min-w-[40rem]' : 'min-w-full'}`}>
        <div className="border border-border rounded-md overflow-hidden bg-card/40">
          <div
            className="grid bg-card border-b border-border"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {headers.map((h, i) => {
              const right = alignArr[i] === 'right'
              return (
                <div
                  key={i}
                  className={`px-3 sm:px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-muted ${
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
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
