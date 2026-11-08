import 'server-only'

import { getTeamPreviewNow, SAMPLE_FIXTURE_ID } from '@/features/team'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import type { BoardMatch, BoardSquad } from '../types'
import { getBoardMatches, loadBoardSquad, toBoardSquad } from './backend-board'
import { getBoardAccess } from './board-access'
import { getSampleBoardMatches, getSampleBoardSelection } from './sample-board'

type NoAccess = { kind: 'signed-out' } | { kind: 'not-board' }

export type BoardResult = { kind: 'board'; matches: BoardMatch[]; isPreview: boolean } | NoAccess
export type BoardSquadResult =
  { kind: 'squad'; squad: BoardSquad; isPreview: boolean } | NoAccess | { kind: 'not-found' }

/** Whether the signed-in member gets the Board's screens (admins); the preview does. */
export async function isBoardMember(): Promise<boolean> {
  if (!isBackendConfigured()) return true
  return (await getBoardAccess()).kind === 'board'
}

/** The week's squads for the Board (UC-11), or sample data in the preview. */
export async function getBoard(realNow: Date = getNow()): Promise<BoardResult> {
  if (!isBackendConfigured()) {
    return {
      kind: 'board',
      matches: getSampleBoardMatches(getTeamPreviewNow(realNow)),
      isPreview: true,
    }
  }
  const access = await getBoardAccess()
  if (access.kind !== 'board') return access
  return { kind: 'board', matches: await getBoardMatches(access.actor, realNow), isPreview: false }
}

/** One match's squad for the Board's review (UC-10, UC-11, UC-14). */
export async function getBoardSquad(
  fixtureId: number,
  realNow: Date = getNow(),
): Promise<BoardSquadResult> {
  if (!isBackendConfigured()) {
    return fixtureId === SAMPLE_FIXTURE_ID
      ? {
          kind: 'squad',
          squad: toBoardSquad(getSampleBoardSelection(getTeamPreviewNow(realNow))),
          isPreview: true,
        }
      : { kind: 'not-found' }
  }
  const access = await getBoardAccess()
  if (access.kind !== 'board') return access
  const squad = await loadBoardSquad(access.actor, fixtureId, realNow)
  return squad ? { kind: 'squad', squad, isPreview: false } : { kind: 'not-found' }
}
