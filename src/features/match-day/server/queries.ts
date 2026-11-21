import 'server-only'

import { getTeamAccess, SAMPLE_FIXTURE_ID } from '@/features/team'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import type { MatchDay } from '../types'
import { loadMatchDay } from './backend-match-day'
import { getSampleMatchDay } from './sample-match-day'

export type MatchDayResult =
  | { kind: 'match-day'; matchDay: MatchDay; isPreview: boolean }
  | { kind: 'signed-out' }
  | { kind: 'not-captain' }
  /** No such match of the actor's team. */
  | { kind: 'not-found' }
  /** The Board has not approved the squad yet: no sheet before the announcement. */
  | { kind: 'not-approved' }

/** An approved squad's match day for its captain or an admin (UC-13), or the sample. */
export async function getMatchDay(
  fixtureId: number,
  realNow: Date = getNow(),
): Promise<MatchDayResult> {
  if (!isBackendConfigured()) {
    return fixtureId === SAMPLE_FIXTURE_ID
      ? { kind: 'match-day', matchDay: getSampleMatchDay(realNow), isPreview: true }
      : { kind: 'not-found' }
  }
  const access = await getTeamAccess()
  if (access.kind !== 'allowed') return access
  const load = await loadMatchDay(access.actor, fixtureId, realNow)
  if (!load) return { kind: 'not-found' }
  if (load.kind === 'not-approved') return load
  return { kind: 'match-day', matchDay: load.data.matchDay, isPreview: false }
}
