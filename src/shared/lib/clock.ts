import 'server-only'

import { getServerEnv } from '@/shared/config/env'

/**
 * The current moment. In development and tests `APP_NOW` can pin it (e.g. to a Monday morning, to
 * try the week before the season starts); production always uses the real clock.
 */
export function getNow(): Date {
  const pinned = getServerEnv().APP_NOW
  return pinned && process.env.NODE_ENV !== 'production' ? new Date(pinned) : new Date()
}
