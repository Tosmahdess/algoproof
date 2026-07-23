// next.config.ts
import type { NextConfig } from 'next'

// Supabase project URL — needed in CSP connect-src for Server Component direct queries.
const SUPABASE_URL = 'https://avdegocswrhzdnvsyiui.supabase.co'

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],

  async redirects() {
    return [
      { source: '/wealth/analyses', destination: '/wealth', permanent: true },
      // 44 daily LLM journals purged 2026-07-04 (D026): redirect old URLs to the blog index
      { source: '/blog/:date(\\d{4}-\\d{2}-\\d{2})-journal', destination: '/blog', permanent: true },
      // Screening dossiers moved to the lab 2026-07-22: this path was live and deployed here first.
      { source: '/strategies/famille/:base', destination: 'https://lab.algoproof.fr/moteur-backtest/:base', permanent: true },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          // HSTS — force HTTPS for 1 year once on real domain
          { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains' },
          // CSP — prevents XSS, clickjacking, data injection
          // TV charts/widgets (SP1): script-src/connect-src/frame-src/img-src entries below
          // allow the TradingView embed script + Binance klines fetch + widget iframes.
          // Exact TradingView host set (s3.tradingview.com, *.tradingview.com, s.tradingview.com)
          // must be validated on a Vercel preview with the browser console open before merge.
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-inline' https://s3.tradingview.com",   // Next.js hydration requires unsafe-inline; TV widget loader (SP1)
              "style-src 'self' 'unsafe-inline'",    // Tailwind inline styles
              "img-src 'self' data: blob: https://*.tradingview.com",           // Recharts SVG uses data URIs; TV widget assets (SP1)
              "font-src 'self'",
              `connect-src 'self' ${SUPABASE_URL} https://api.binance.com https://*.tradingview.com`,  // Server Components query Supabase directly; Binance klines + TV data (SP1)
              "frame-src https://*.tradingview.com https://s.tradingview.com",  // TV widget iframes (SP1)
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
