// next.config.ts
import type { NextConfig } from 'next'

// Supabase project URL — needed in CSP connect-src for Server Component direct queries.
const SUPABASE_URL = 'https://avdegocswrhzdnvsyiui.supabase.co'

const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],

  async redirects() {
    return [
      // /wealth supprimée le 2026-09-09. Ses 82 analyses vivaient à côté de
      // /investir, dont 55 en doublon exact ; les 27 que la règle ne peut pas
      // noter y ont été reprises, avec l'avertissement qu'elles méritent. Chaque
      // ancienne URL mène à la fiche correspondante — aucune ne tombe dans le vide,
      // et l'index n'est le repli de personne.
      { source: '/wealth/analyses', destination: '/investir', permanent: true },
      { source: '/wealth/1810.HK', destination: '/investir/xiaomi', permanent: true },
      { source: '/wealth/ADYEN.AS', destination: '/investir/adyen', permanent: true },
      { source: '/wealth/AM.PA', destination: '/investir/dassault-aviation', permanent: true },
      { source: '/wealth/AMD', destination: '/investir/advanced-micro-devices-inc', permanent: true },
      { source: '/wealth/ANET', destination: '/investir/arista-networks-inc', permanent: true },
      { source: '/wealth/ARM', destination: '/investir/arm-holdings-plc-uk', permanent: true },
      { source: '/wealth/ASML', destination: '/investir/asml', permanent: true },
      { source: '/wealth/AVAV', destination: '/investir/aerovironment', permanent: true },
      { source: '/wealth/AVGO', destination: '/investir/broadcom-inc', permanent: true },
      { source: '/wealth/BA.L', destination: '/investir/bae-systems', permanent: true },
      { source: '/wealth/BNTX', destination: '/investir/biontech-se', permanent: true },
      { source: '/wealth/BYDDY', destination: '/investir/byd', permanent: true },
      { source: '/wealth/CDR.WA', destination: '/investir/cd-projekt', permanent: true },
      { source: '/wealth/CEG', destination: '/investir/constellation-energy-corporation', permanent: true },
      { source: '/wealth/COIN', destination: '/investir/coinbase-global-inc', permanent: true },
      { source: '/wealth/CRWD', destination: '/investir/crowdstrike-holdings-inc', permanent: true },
      { source: '/wealth/CVX', destination: '/investir/chevron-corp', permanent: true },
      { source: '/wealth/DDOG', destination: '/investir/datadog-inc', permanent: true },
      { source: '/wealth/EA', destination: '/investir/electronic-arts', permanent: true },
      { source: '/wealth/EL', destination: '/investir/estee-lauder-companies-inc', permanent: true },
      { source: '/wealth/ENPH', destination: '/investir/enphase-energy-inc', permanent: true },
      { source: '/wealth/FCX', destination: '/investir/freeport-mcmoran-inc', permanent: true },
      { source: '/wealth/FSLR', destination: '/investir/first-solar-inc', permanent: true },
      { source: '/wealth/FTNT', destination: '/investir/fortinet-inc', permanent: true },
      { source: '/wealth/GEV', destination: '/investir/ge-vernova-inc', permanent: true },
      { source: '/wealth/GOOGL', destination: '/investir/alphabet-inc', permanent: true },
      { source: '/wealth/HO.PA', destination: '/investir/thales', permanent: true },
      { source: '/wealth/HOOD', destination: '/investir/robinhood-markets-inc', permanent: true },
      { source: '/wealth/KER.PA', destination: '/investir/kering', permanent: true },
      { source: '/wealth/KLAC', destination: '/investir/kla-corp', permanent: true },
      { source: '/wealth/LCID', destination: '/investir/lucid-group-inc', permanent: true },
      { source: '/wealth/LLY', destination: '/investir/eli-lilly-and-company', permanent: true },
      { source: '/wealth/LMT', destination: '/investir/lockheed-martin-corporation', permanent: true },
      { source: '/wealth/LNG', destination: '/investir/cheniere-energy-inc', permanent: true },
      { source: '/wealth/LULU', destination: '/investir/lululemon-athletica-inc', permanent: true },
      { source: '/wealth/MA', destination: '/investir/mastercard-incorporated', permanent: true },
      { source: '/wealth/MC.PA', destination: '/investir/lvmh', permanent: true },
      { source: '/wealth/MCD', destination: '/investir/mcdonald-s-corporation', permanent: true },
      { source: '/wealth/MDB', destination: '/investir/mongodb-inc', permanent: true },
      { source: '/wealth/META', destination: '/investir/meta-platforms-inc', permanent: true },
      { source: '/wealth/MP', destination: '/investir/mp-materials-corp-de', permanent: true },
      { source: '/wealth/MRK', destination: '/investir/merck-co-inc', permanent: true },
      { source: '/wealth/MRNA', destination: '/investir/moderna-inc', permanent: true },
      { source: '/wealth/MSTR', destination: '/investir/strategy-inc', permanent: true },
      { source: '/wealth/MU', destination: '/investir/micron-technology-inc', permanent: true },
      { source: '/wealth/NEE', destination: '/investir/nextera-energy-inc', permanent: true },
      { source: '/wealth/NET', destination: '/investir/cloudflare-inc', permanent: true },
      { source: '/wealth/NTDOY', destination: '/investir/nintendo', permanent: true },
      { source: '/wealth/NVDA', destination: '/investir/nvidia-corp', permanent: true },
      { source: '/wealth/NVO', destination: '/investir/novo-nordisk-a-s', permanent: true },
      { source: '/wealth/OKTA', destination: '/investir/okta-inc', permanent: true },
      { source: '/wealth/PANW', destination: '/investir/palo-alto-networks-inc', permanent: true },
      { source: '/wealth/PHIA.AS', destination: '/investir/philips', permanent: true },
      { source: '/wealth/PL', destination: '/investir/planet-labs', permanent: true },
      { source: '/wealth/PLTR', destination: '/investir/palantir-technologies-inc', permanent: true },
      { source: '/wealth/RACE', destination: '/investir/ferrari-n-v', permanent: true },
      { source: '/wealth/REGN', destination: '/investir/regeneron-pharmaceuticals-inc', permanent: true },
      { source: '/wealth/RHM.DE', destination: '/investir/rheinmetall', permanent: true },
      { source: '/wealth/RI.PA', destination: '/investir/pernod-ricard', permanent: true },
      { source: '/wealth/RIVN', destination: '/investir/rivian-automotive-inc-de', permanent: true },
      { source: '/wealth/RKLB', destination: '/investir/rocket-lab-corp', permanent: true },
      { source: '/wealth/RMS.PA', destination: '/investir/hermes', permanent: true },
      { source: '/wealth/ROG.SW', destination: '/investir/roche', permanent: true },
      { source: '/wealth/RTX', destination: '/investir/rtx-corporation', permanent: true },
      { source: '/wealth/S', destination: '/investir/sentinelone-inc', permanent: true },
      { source: '/wealth/SAN.PA', destination: '/investir/sanofi', permanent: true },
      { source: '/wealth/SNOW', destination: '/investir/snowflake-inc', permanent: true },
      { source: '/wealth/SOL', destination: '/investir/solana', permanent: true },
      { source: '/wealth/SQ', destination: '/investir/block', permanent: true },
      { source: '/wealth/STLA', destination: '/investir/stellantis-n-v', permanent: true },
      { source: '/wealth/SU.PA', destination: '/investir/schneider-electric', permanent: true },
      { source: '/wealth/TSLA', destination: '/investir/tesla-inc', permanent: true },
      { source: '/wealth/TSM', destination: '/investir/tsmc', permanent: true },
      { source: '/wealth/TTWO', destination: '/investir/take-two-interactive-software-inc', permanent: true },
      { source: '/wealth/UBI.PA', destination: '/investir/ubisoft', permanent: true },
      { source: '/wealth/V', destination: '/investir/visa', permanent: true },
      { source: '/wealth/VLTO', destination: '/investir/veralto-corporation', permanent: true },
      { source: '/wealth/VRTX', destination: '/investir/vertex-pharmaceuticals-inc-ma', permanent: true },
      { source: '/wealth/VWS.CO', destination: '/investir/vestas-wind-systems', permanent: true },
      { source: '/wealth/XOM', destination: '/investir/exxon-mobil-corporation', permanent: true },
      { source: '/wealth/XYL', destination: '/investir/xylem-inc', permanent: true },
      { source: '/wealth/ZS', destination: '/investir/zscaler-inc', permanent: true },
      { source: '/wealth', destination: '/investir', permanent: true },
      // /labo internal landing removed 2026-07-24 (redundant with the lab subdomain — every
      // card just funneled to lab.algoproof.fr). Redirect inbound/SEO links to the subdomain.
      { source: '/labo', destination: 'https://lab.algoproof.fr', permanent: true },
      // 44 daily LLM journals purged 2026-07-04 (D026): redirect old URLs to the blog index
      { source: '/blog/:date(\\d{4}-\\d{2}-\\d{2})-journal', destination: '/blog', permanent: true },
      // Screening dossiers moved to the lab 2026-07-22: this path was live and deployed here first.
      { source: '/strategies/famille/:base', destination: 'https://lab.algoproof.fr/moteur-backtest/:base', permanent: true },
      // /performance folded into /overview 2026-07-31: the two pages answered the
      // same question at two scales off the same query. The aggregate now lives as
      // the unfilterable stage 0 of « La flotte ». Permanent, and note the sitemap
      // never listed /performance so the SEO cost is nil.
      { source: '/performance', destination: '/overview', permanent: true },
      // Public /journal removed 2026-08-08 (user decision): a firehose of dated changes is
      // developer-facing noise for a visitor who came to judge the bots. The per-bot and
      // per-component changelog tabs survive, in context, where the reader already is.
      // Covers the index, the 3 flux sub-pages and the RSS feed so no inbound link 404s.
      { source: '/journal', destination: '/', permanent: true },
      { source: '/journal/:path*', destination: '/', permanent: true },
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
              "img-src 'self' data: blob: https://*.tradingview.com https://*.tradingview-widget.com",  // Recharts SVG uses data URIs; TV widget assets (SP1)
              "font-src 'self'",
              `connect-src 'self' ${SUPABASE_URL} https://api.binance.com https://*.tradingview.com https://*.tradingview-widget.com`,  // Server Components query Supabase directly; Binance klines + TV data (SP1)
              "frame-src https://*.tradingview.com https://s.tradingview.com https://*.tradingview-widget.com",  // TV widget iframes (SP1) — widgets frame from www.tradingview-widget.com (validated dev console 2026-07-23)
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
