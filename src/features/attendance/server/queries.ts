import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import type { AttendanceLedger } from '../types'
import { getBackendLedger } from './backend-attendance'
import { getSampleLedger } from './sample-attendance'

export type LedgerResult =
  | { kind: 'ledger'; ledger: AttendanceLedger; isPreview: boolean }
  | { kind: 'signed-out' }
  /** Signed in, but the account is not linked to a player yet. */
  | { kind: 'unlinked' }
  /** Linked, but not in a team squad yet. */
  | { kind: 'no-squad' }

/** The signed-in member's season (UC-7, UC-20), or sample data in the preview. */
export async function getMyLedger(realNow: Date = getNow()): Promise<LedgerResult> {
  if (!isBackendConfigured()) {
    return { kind: 'ledger', ledger: getSampleLedger(realNow), isPreview: true }
  }
  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  if (member.playerId === null) return { kind: 'unlinked' }

  const result = await getBackendLedger(
    { playerId: member.playerId, token, isCaptain: member.role === 'captain' },
    realNow,
  )
  return result.kind === 'no-squad' ? result : { ...result, isPreview: false }
}
