import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Signed-sheet photos are scaled in the browser first; Vercel refuses bodies over 4.5 MB.
    serverActions: { bodySizeLimit: '4mb' },
  },
  // The blank DCB match report sheet is read from disk by the sheet route (ADR-0007).
  outputFileTracingIncludes: {
    '/api/match-day/**': ['./assets/dcb-match-report-sheet-2015.pdf'],
  },
  // The service worker (ADR-0003): never cached, so a fix reaches every device on its next visit,
  // and allowed to load only itself.
  headers() {
    return Promise.resolve([
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ])
  },
}

export default withNextIntl(nextConfig)
