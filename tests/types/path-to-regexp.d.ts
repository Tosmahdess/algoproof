// Minimal ambient typing for Next's bundled copy of path-to-regexp
// (node_modules/next/dist/compiled/path-to-regexp) — an internal Next.js
// path, not a published package with its own types. Used by
// tests/lib/strategy-routing.test.ts to compile a next.config.ts redirect
// `source` into the same RegExp Next.js itself matches requests against,
// rather than re-implementing (and potentially mis-implementing) that
// matching logic in the test.
declare module 'next/dist/compiled/path-to-regexp' {
  export function pathToRegexp(path: string, keys?: unknown[], options?: unknown): RegExp
}
