import 'server-only'

import { z } from 'zod'

import { getLocalDate, startOfWeek } from '@/domain/club-rules'
import {
  answerDocSchema,
  getClubSchedule,
  type ScheduledEvent,
  toPracticeEvent,
} from '@/features/week'
import { backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import type { JobMember, TickInput } from '../domain/plan-notifications'

const SERVICE = { as: 'service' } as const

const squadDocSchema = z.object({
  fixture: relationIdSchema,
  status: z.enum(['open', 'submitted', 'approved', 'returned']),
  deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']),
})

const userDocSchema = z.object({
  id: z.number(),
  role: z.enum(['player', 'captain', 'admin']),
  captainOf: relationIdSchema.nullish(),
  // Queried at depth 1: the linked player with the team squad they belong to.
  player: z.object({ id: z.number(), squadTeam: relationIdSchema.nullish() }).nullish(),
})

const fixtureNumber = (eventId: string) => eventId.replace('fixture-', '')
const practiceNumber = (eventId: string) => eventId.replace('practice-', '')

async function getSquads(matches: readonly ScheduledEvent[]) {
  if (matches.length === 0) return []
  const { docs } = await backendRequest({
    path: `/squads${toQuery({
      'where[fixture][in]': matches.map((match) => fixtureNumber(match.id)).join(','),
      depth: '0',
    })}`,
    auth: SERVICE,
    schema: listOf(squadDocSchema),
  })
  return docs
}

/** Every account with its linked player's team squad, and the team a captain leads. */
async function getMembers(): Promise<JobMember[]> {
  const { docs } = await backendRequest({
    path: `/users${toQuery({ depth: '1' })}`,
    auth: SERVICE,
    schema: listOf(userDocSchema),
  })
  return docs.map((doc) => {
    const squadTeam = doc.player?.squadTeam ?? null
    const captainOf = doc.role === 'captain' ? (doc.captainOf ?? null) : null
    return {
      userId: doc.id,
      playerId: doc.player?.id ?? null,
      teamId: squadTeam === null ? null : String(squadTeam),
      captainOfTeamId: captainOf === null ? null : String(captainOf),
    }
  })
}

/** Answers for these events: one `or` clause per kind that has events. */
function answerFilter(events: readonly ScheduledEvent[]): Record<string, string> {
  const ids = (kind: ScheduledEvent['kind'], toNumber: (id: string) => string) =>
    events.filter((event) => event.kind === kind).map((event) => toNumber(event.id))
  const clauses = [
    ['fixture', ids('match', fixtureNumber)],
    ['practice', ids('practice', practiceNumber)],
  ] as const
  return Object.fromEntries(
    clauses
      .filter(([, values]) => values.length > 0)
      .map(([field, values], index) => [
        `where[or][${String(index)}][${field}][in]`,
        values.join(','),
      ]),
  )
}

async function getAnswers(events: readonly ScheduledEvent[]) {
  if (events.length === 0) return []
  const { docs } = await backendRequest({
    path: `/availability-responses${toQuery({ ...answerFilter(events), depth: '0' })}`,
    auth: SERVICE,
    schema: listOf(answerDocSchema.extend({ player: relationIdSchema })),
  })
  return docs
}

function toEventId(answer: { fixture?: number | null; practice?: number | null }): string | null {
  if (answer.fixture) return `fixture-${String(answer.fixture)}`
  return answer.practice ? `practice-${String(answer.practice)}` : null
}

/**
 * The club's week as the scheduled jobs need it, read as the app's service account (ADR-0004):
 * the matches with their answer deadlines, the practices that take place (created first when
 * missing, UC-5), every member with their team, the answers, and which squads have moved on.
 */
export async function loadTickData(now: Date): Promise<TickInput> {
  const monday = startOfWeek(getLocalDate(now))
  const schedule = await getClubSchedule(SERVICE, monday)
  const practices = schedule.practices.filter((doc) => doc.isCancelled !== true)
  const practiceEvents = practices.flatMap((doc) => {
    const team = schedule.teams.get(doc.team)
    return team ? [toPracticeEvent(doc, team)] : []
  })

  const [squads, members, answers] = await Promise.all([
    getSquads(schedule.matches),
    getMembers(),
    getAnswers([...schedule.matches, ...practiceEvents]),
  ])
  const squadOf = new Map(squads.map((squad) => [`fixture-${String(squad.fixture)}`, squad]))
  const matches = schedule.matches.map((match) => ({
    ...match,
    deadlineDay: squadOf.get(match.id)?.deadlineDay,
  }))

  const answered = new Map<number, Set<string>>()
  const going = new Map<string, number>()
  for (const answer of answers) {
    const eventId = toEventId(answer)
    if (!eventId) continue
    answered.set(answer.player, (answered.get(answer.player) ?? new Set()).add(eventId))
    if (answer.response === 'going') going.set(eventId, (going.get(eventId) ?? 0) + 1)
  }

  return {
    now,
    events: [...matches, ...practiceEvents],
    members,
    answers: answered,
    going,
    recordedPracticeIds: new Set(
      practices.filter((doc) => doc.isRecorded === true).map((doc) => `practice-${String(doc.id)}`),
    ),
    decidedFixtureIds: new Set(
      squads
        .filter((squad) => squad.status !== 'open')
        .map((squad) => `fixture-${String(squad.fixture)}`),
    ),
  }
}
