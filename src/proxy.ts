import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip API routes (scheduled jobs), Next internals and any path with a file extension
  // (manifest, icons, service worker).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
}
