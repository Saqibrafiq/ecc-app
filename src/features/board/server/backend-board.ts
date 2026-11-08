import 'server-only'

import { z } from 'zod'

import {
  DEFAULT_DEADLINE_DAY,
  getAvailabilityDeadline,
  getLocalDate,
  startOfWeek,
} from '@/domain/club-rules'
import { loadSelection, type SelectionData, type TeamActor } from '@/features/team'
import { getClubSchedule } from '@/features/week'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { compareByUrgency, getBlocked, toSquadList } from '../domain/board'
import type { BoardMatch, BoardSquad } from '../types'

const fixtureNumber = (eventId: string) => Number(eventId.replace('fixture-', ''))

const squadSummarySchema = z.object({
  fixture: relationIdSchema,
  status: z.enum(['open', 'submitted', 'approved', 'returned']),
  deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']).nullish(),
})

async function getSquadSummaries(auth: BackendAuth, fixtureIds: readonly number[]) {
  if (fixtureIds.length === 0) return new Map<number, z.infer<typeof squadSummarySchema>>()
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][in]': fixtureIds.join(','), depth: '0' })}`,
    auth,
    schema: listOf(squadSummarySchema),
  })
  return new Map(docs.map((doc) => [doc.fixture, doc]))
}

/** The week's matches of every club team with their squads, the most urgent first (UC-11). */
export async function getBoardMatches(actor: TeamActor, now: Date): Promise<BoardMatch[]> {
  const auth: BackendAuth = { as: 'member', token: actor.token }
  const { matches } = await getClubSchedule(auth, startOfWeek(getLocalDate(now)))
  const squads = await getSquadSummaries(
    auth,
    matches.map((match) => fixtureNumber(match.id)),
  )
  return matches
    .map((match) => {
      const squad = squads.get(fixtureNumber(match.id))
      return {
        event: match,
        fixtureId: fixtureNumber(match.id),
        squadStatus: squad?.status ?? 'open',
        deadlineDay: squad?.deadlineDay ?? DEFAULT_DEADLINE_DAY,
      }
    })
    .sort(compareByUrgency)
}

/** A squad's review data, from the selection the captain worked on. */
export function toBoardSquad(data: SelectionData): BoardSquad {
  const { selection, deadlineDay, exceptionIds, names } = data
  return {
    selection,
    deadlineDay,
    closesAt: getAvailabilityDeadline(selection.match.date, deadlineDay).toISOString(),
    blocked: getBlocked(selection.candidates),
    exceptionIds,
    squad: toSquadList(selection.picks, names),
  }
}

/** A match's squad for the Board, or `null` if there is no such match of a club team. */
export async function loadBoardSquad(
  actor: TeamActor,
  fixtureId: number,
  now: Date,
): Promise<BoardSquad | null> {
  const data = await loadSelection(actor, fixtureId, now)
  return data ? toBoardSquad(data) : null
}
