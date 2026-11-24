import 'server-only'

import { z } from 'zod'

import type { DeadlineDay, LocalDate } from '@/domain/club-rules'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import type { ScheduledEvent, SquadAnnouncement } from '../types'
import { answerDocSchema, fixtureDocSchema, toAnswerMap, toMatchEvent } from './map-backend'

/** A member whose own records (squad, answers, attendance) are read with their session. */
export type MemberRef = { playerId: number; token: string }

export async function getSquadTeamId(member: MemberRef): Promise<number | null> {
  const player = await backendRequest({
    path: `/players/${String(member.playerId)}?depth=0`,
    auth: { as: 'member', token: member.token },
    schema: z.object({ squadTeam: relationIdSchema.nullish() }),
  })
  return player.squadTeam ?? null
}

const matchSquadSchema = z.object({
  fixture: relationIdSchema,
  status: z.enum(['open', 'submitted', 'approved', 'returned']),
  deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']),
  // Members read the picks once the squad is announced (the website's field access).
  picks: z
    .array(z.object({ player: relationIdSchema, role: z.enum(['playing', 'twelfth', 'reserve']) }))
    .nullish(),
})

/** What the member's screens need of a match's squad: its deadline, and its announcement. */
export type MatchSquad = { deadlineDay: DeadlineDay; announcement: SquadAnnouncement | null }

function toAnnouncement(doc: z.infer<typeof matchSquadSchema>, playerId: number) {
  if (doc.status !== 'approved') return null
  const pick = doc.picks?.find((item) => item.player === playerId)
  return { role: pick?.role ?? null }
}

/** The squads of these matches, by event id, as the member sees them. */
export async function getMatchSquads(
  member: MemberRef,
  matches: readonly ScheduledEvent[],
): Promise<Map<string, MatchSquad>> {
  const ids = matches.map((match) => match.id.replace('fixture-', ''))
  if (ids.length === 0) return new Map()
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][in]': ids.join(','), depth: '0' })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(matchSquadSchema),
  })
  return new Map(
    docs.map((doc) => [
      `fixture-${String(doc.fixture)}`,
      { deadlineDay: doc.deadlineDay, announcement: toAnnouncement(doc, member.playerId) },
    ]),
  )
}

export async function getAnswers(member: MemberRef) {
  const { docs } = await backendRequest({
    path: `/availability-responses${toQuery({
      'where[player][equals]': String(member.playerId),
      depth: '0',
      sort: '-updatedAt',
    })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(answerDocSchema),
  })
  return toAnswerMap(docs)
}

export async function getAttendedPracticeIds(member: MemberRef): Promise<Set<string>> {
  const { docs } = await backendRequest({
    path: `/attendance${toQuery({
      'where[player][equals]': String(member.playerId),
      'where[attended][equals]': 'true',
      depth: '0',
    })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(z.object({ practice: relationIdSchema })),
  })
  return new Set(docs.map((doc) => `practice-${String(doc.practice)}`))
}

/** The member's team's next match after this week, for a quiet week. */
export async function getNextMatch(auth: BackendAuth, after: LocalDate, teamId: string) {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
      'where[date][greater_than_equal]': dayStart(after),
      'where[or][0][team1][equals]': teamId,
      'where[or][1][team2][equals]': teamId,
      depth: '1',
      sort: 'date',
      limit: '1',
    })}`,
    auth,
    schema: listOf(fixtureDocSchema),
  })
  const [first] = docs
  return first ? toMatchEvent(first) : null
}
