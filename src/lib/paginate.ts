// Fetch every row across PostgREST/Supabase pages.
// Supabase enforces a hard server-side row cap (db-max-rows, 1000 here) that
// .limit()/.range() cannot exceed in a single request — so callers that need the
// FULL set (e.g. /performance summing every trade) must page through with .range().
export async function paginateAll<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  for (;;) {
    const batch = await fetchPage(from, from + pageSize - 1)
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return all
}
