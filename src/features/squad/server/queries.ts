import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { SAMPLE_FIXTURE_ID } from '@/features/team'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import type { TeamSheet } from '../types'
import { loadTeamSheet } from './backend-squad'
import { getSampleTeamSheet } from './sample-squad'

export type TeamSheetResult =
  | { kind: 'sheet'; sheet: TeamSheet; isPreview: boolean }
  | { kind: 'not-announced' }
  | { kind: 'not-found' }
  | { kind: 'signed-out' }

/** A match's announced squad for the signed-in member, or the sample one in the preview. */
export async function getTeamSheet(fixtureId: number): Promise<TeamSheetResult> {
  if (!isBackendConfigured()) {
    return fixtureId === SAMPLE_FIXTURE_ID
      ? { kind: 'sheet', sheet: getSampleTeamSheet(getNow()), isPreview: true }
      : { kind: 'not-found' }
  }

  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  const result = await loadTeamSheet({ token, playerId: member.playerId }, fixtureId)
  return result.kind === 'sheet' ? { ...result, isPreview: false } : result
}
