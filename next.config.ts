// next.config.ts
import type { NextConfig } from 'next'

// Supabase project URL — needed in CSP connect-src for Server Component direct queries.
const SUPABASE_URL = 'https://avdegocswrhzdnvsyiui.supabase.co'

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],

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
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-inline'",   // Next.js hydration requires unsafe-inline
              "style-src 'self' 'unsafe-inline'",    // Tailwind inline styles
              "img-src 'self' data: blob:",           // Recharts SVG uses data URIs
              "font-src 'self'",
              `connect-src 'self' ${SUPABASE_URL}`,  // Server Components query Supabase directly
              "frame-src 'none'",
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
