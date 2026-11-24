import 'server-only'

import { after } from 'next/server'

import { getPushPublicKey } from '@/features/notifications'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { runTick } from './run-tick'

/**
 * Runs a tick as soon as the response to a change has gone out, so a squad handed in, sent back or
 * announced, or a practice recorded, reaches the people it concerns within seconds rather than at
 * the next hourly tick (ADR-0004). The tick sends whatever is due, each notification once, so a
 * change that makes nothing due costs a few reads. The hourly tick stays the safety net: a failure
 * here is logged, never shown to the member who made the change.
 */
export function sendDueNotificationsSoon(): void {
  if (!isBackendConfigured() || getPushPublicKey() === null) return
  after(async () => {
    try {
      await runTick(getNow())
    } catch (error) {
      logError('Sending notifications after a change failed', error)
    }
  })
}
