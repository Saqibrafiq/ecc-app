import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import { buildWeek } from '../domain/build-week'
import type { MyWeek, ScheduledEvent } from '../types'
import { getBackendWeek } from './backend-week'
import { getPreviewNow, getSampleWeekInput } from './sample-week'

const PREVIEW_MEMBER_NAME = 'Saqib Rafiq'

export type WeekResult =
  | {
      kind: 'week'
      week: MyWeek
      memberName: string
      /** True while the screen shows sample data (no backend configured). */
      isPreview: boolean
      /** For a quiet week: the team's next match. */
      nextMatch: ScheduledEvent | null
    }
  | { kind: 'signed-out' }
  /** Signed in, but the account is not linked to a player yet. */
  | { kind: 'unlinked' }
  /** Linked, but not in a team squad yet. */
  | { kind: 'no-squad' }

/**
 * The signed-in member's week from the club's backend, or sample data on a preview Monday when
 * the app runs without a backend (local development, CI).
 */
export async function getMyWeek(realNow: Date = getNow()): Promise<WeekResult> {
  if (!isBackendConfigured()) {
    return {
      kind: 'week',
      week: buildWeek(getSampleWeekInput(getPreviewNow(realNow))),
      memberName: PREVIEW_MEMBER_NAME,
      isPreview: true,
      nextMatch: null,
    }
  }

  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  if (member.playerId === null) return { kind: 'unlinked' }

  const result = await getBackendWeek({ playerId: member.playerId, token }, realNow)
  if (result.kind === 'no-squad') return result
  return {
    kind: 'week',
    week: result.week,
    memberName: member.name ?? member.email,
    isPreview: false,
    nextMatch: result.nextMatch,
  }
}
