import 'server-only'

import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import type { CheckIn, SquadSelection, TeamWeek } from '../types'
import { getBackendTeamWeek, loadCheckIn, loadSelection } from './backend-team'
import { getCaptainAccess } from './captain'
import {
  getSampleCheckIn,
  getSampleSelection,
  getSampleTeamWeek,
  getTeamPreviewNow,
  SAMPLE_FIXTURE_ID,
  SAMPLE_PRACTICE_ID,
} from './sample-team'

type NoAccess = { kind: 'signed-out' } | { kind: 'not-captain' }

export type TeamWeekResult =
  { kind: 'team-week'; teamWeek: TeamWeek; isPreview: boolean } | NoAccess
export type CheckInResult =
  | { kind: 'check-in'; checkIn: CheckIn; isPreview: boolean }
  | NoAccess
  /** No such practice, or one of another team: the same answer, so nothing leaks. */
  | { kind: 'not-found' }
export type SelectionResult =
  | { kind: 'selection'; selection: SquadSelection; isPreview: boolean }
  | NoAccess
  | { kind: 'not-found' }

/** Whether the signed-in member gets the team screens; the preview shows them. */
export async function isTeamCaptain(): Promise<boolean> {
  if (!isBackendConfigured()) return true
  return (await getCaptainAccess()).kind === 'captain'
}

/** The captain's team this week (UC-6, UC-9), or sample data in the preview. */
export async function getTeamWeek(realNow: Date = getNow()): Promise<TeamWeekResult> {
  if (!isBackendConfigured()) {
    return {
      kind: 'team-week',
      teamWeek: getSampleTeamWeek(getTeamPreviewNow(realNow)),
      isPreview: true,
    }
  }
  const access = await getCaptainAccess()
  if (access.kind !== 'captain') return access
  return {
    kind: 'team-week',
    teamWeek: await getBackendTeamWeek(access.captain, realNow),
    isPreview: false,
  }
}

/** A practice's check-in for its captain (UC-6). */
export async function getCheckIn(
  practiceId: number,
  realNow: Date = getNow(),
): Promise<CheckInResult> {
  if (!isBackendConfigured()) {
    return practiceId === SAMPLE_PRACTICE_ID
      ? { kind: 'check-in', checkIn: getSampleCheckIn(getTeamPreviewNow(realNow)), isPreview: true }
      : { kind: 'not-found' }
  }
  const access = await getCaptainAccess()
  if (access.kind !== 'captain') return access
  const data = await loadCheckIn(access.captain, practiceId, realNow)
  return data
    ? { kind: 'check-in', checkIn: data.checkIn, isPreview: false }
    : { kind: 'not-found' }
}

/** A match's squad selection for its captain (UC-9). */
export async function getSquadSelection(
  fixtureId: number,
  realNow: Date = getNow(),
): Promise<SelectionResult> {
  if (!isBackendConfigured()) {
    return fixtureId === SAMPLE_FIXTURE_ID
      ? {
          kind: 'selection',
          selection: getSampleSelection(getTeamPreviewNow(realNow)),
          isPreview: true,
        }
      : { kind: 'not-found' }
  }
  const access = await getCaptainAccess()
  if (access.kind !== 'captain') return access
  const data = await loadSelection(access.captain, fixtureId, realNow)
  return data
    ? { kind: 'selection', selection: data.selection, isPreview: false }
    : { kind: 'not-found' }
}
