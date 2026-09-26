// The day-by-day journal of the fleet, folded on every screen (lot 4 of the
// design audit, 2026-09-25, conception §5.2). It used to sit open inside « Le
// bilan », 449 px before the register on a phone; the two totals it opened with
// now live in FleetTotals, and the table waits under one line that counts the
// days. The table itself is unchanged: Date · Trades · P&L réel · P&L labo, four
// columns, every one of them true (FleetDayTable).
import Repli from '@/components/Repli'
import FleetDayTable from '@/components/FleetDayTable'
import type { DayRow } from '@/lib/fleet-aggregate'
import { frNumber } from '@/lib/display'

export default function FleetJournal({ rows }: { rows: DayRow[] }) {
  if (rows.length === 0) return null
  return (
    <Repli
      id="journal"
      testId="fleet-journal"
      titre="Jour par jour"
      resume={`${frNumber(rows.length, 0)} jours de résultats : les trades et le P&L de chaque jour, argent réel et simulation séparés`}
      toujoursPliable
      className="bg-card border border-border rounded-lg p-5 sm:p-6"
      titreClassName="text-base font-semibold"
      corpsClassName="mt-4"
    >
      <FleetDayTable rows={rows} />
    </Repli>
  )
}
