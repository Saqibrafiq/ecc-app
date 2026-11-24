import 'server-only'

import { z } from 'zod'

import {
  getCarryOvers,
  getLocalDate,
  getSeasonStart,
  type LocalDate,
  startOfWeek,
} from '@/domain/club-rules'
import {
  answerDocSchema,
  getClubSchedule,
  getTeamSeasonPractices,
  type ScheduledEvent,
  toPracticeEvent,
} from '@/features/week'
import { backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import type { JobMember, SquadState, TeamAttendance, TickInput } from '../types'

const SERVICE = { as: 'service' } as const
/** A season of one team's attendance records (the team screens read the same). */
const ATTENDANCE_LIMIT = '1000'

const squadDocSchema = z.object({
  fixture: relationIdSchema,
  status: z.enum(['open', 'submitted', 'approved', 'returned']),
  deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']),
  statusChangedAt: z.string().nullish(),
  // The service account is an admin: it reads the selection before it is announced, too.
  picks: z
    .array(
      z.object({
        player: relationIdSchema,
        role: z.enum(['playing', 'twelfth', 'reserve']),
      }),
    )
    .nullish(),
  exceptions: z.array(relationIdSchema).nullish(),
})
type SquadDoc = z.infer<typeof squadDocSchema>

const userDocSchema = z.object({
  id: z.number(),
  role: z.enum(['player', 'captain', 'admin']),
  captainOf: relationIdSchema.nullish(),
  // Queried at depth 1: the linked player with the team squad they belong to.
  player: z.object({ id: z.number(), squadTeam: relationIdSchema.nullish() }).nullish(),
})

const fixtureNumber = (eventId: string) => eventId.replace('fixture-', '')
const practiceNumber = (eventId: string) => eventId.replace('practice-', '')

async function getSquads(fixtureIds: readonly string[]): Promise<SquadDoc[]> {
  if (fixtureIds.length === 0) return []
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][in]': fixtureIds.join(','), depth: '0' })}`,
    auth: SERVICE,
    schema: listOf(squadDocSchema),
  })
  return docs
}

/** Every account with its linked player's team squad, the team a captain leads, the Board. */
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
      isBoard: doc.role === 'admin',
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

/** Which practices each player of the team attended, by player id. */
async function getTeamAttendance(teamId: string): Promise<Map<number, Set<string>>> {
  const { docs } = await backendRequest({
    path: `/attendance${toQuery({
      'where[team][equals]': teamId,
      'where[attended][equals]': 'true',
      depth: '0',
      limit: ATTENDANCE_LIMIT,
    })}`,
    auth: SERVICE,
    schema: listOf(z.object({ player: relationIdSchema, practice: relationIdSchema })),
  })
  const attended = new Map<number, Set<string>>()
  for (const doc of docs) {
    attended.set(
      doc.player,
      (attended.get(doc.player) ?? new Set()).add(`practice-${String(doc.practice)}`),
    )
  }
  return attended
}

/** The 12th man and reserves of the team's last announced squad before this week (R-13). */
async function getCarriedOver(teamId: string, monday: LocalDate): Promise<number[]> {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
      'where[date][less_than]': dayStart(monday),
      'where[or][0][team1][equals]': teamId,
      'where[or][1][team2][equals]': teamId,
      depth: '0',
      sort: '-date',
      limit: '1',
    })}`,
    auth: SERVICE,
    schema: listOf(z.object({ id: z.number() })),
  })
  const [previous] = docs
  if (!previous) return []
  const [squad] = await getSquads([String(previous.id)])
  if (squad?.status !== 'approved') return []
  const picks = (squad.picks ?? []).map((pick) => ({
    playerId: String(pick.player),
    role: pick.role,
  }))
  return getCarryOvers(picks).map(Number)
}

function toPicks(squad: SquadDoc): SquadState['picks'] {
  return (squad.picks ?? []).map((pick) => ({ playerId: pick.player, role: pick.role }))
}

/**
 * What the attendance warnings need for a team whose practice was recorded this week (UC-8): its
 * season's practices, who attended which, and who is selectable anyway this week.
 */
async function getAttendanceOf(
  teamId: string,
  today: LocalDate,
  exceptions: readonly number[],
): Promise<TeamAttendance> {
  const seasonStart = getSeasonStart(today)
  const [practices, attended, carriedOver] = await Promise.all([
    getTeamSeasonPractices(SERVICE, Number(teamId), seasonStart),
    getTeamAttendance(teamId),
    getCarriedOver(teamId, startOfWeek(today)),
  ])
  return {
    teamId,
    seasonStart,
    practices,
    attended,
    selectableAnyway: new Set([...carriedOver, ...exceptions]),
  }
}

/**
 * The club's week as the scheduled jobs need it, read as the app's service account (ADR-0004):
 * the matches with their answer deadlines and squads, the practices that take place (created
 * first when missing, UC-5), every member with their team, the answers, and the attendance of each
 * team whose practice has been recorded.
 */
export async function loadTickData(now: Date): Promise<TickInput> {
  const today = getLocalDate(now)
  const schedule = await getClubSchedule(SERVICE, startOfWeek(today))
  const practices = schedule.practices.filter((doc) => doc.isCancelled !== true)
  const practiceEvents = practices.flatMap((doc) => {
    const team = schedule.teams.get(doc.team)
    return team ? [toPracticeEvent(doc, team)] : []
  })
  const recordedPracticeIds = new Set(
    practices.filter((doc) => doc.isRecorded === true).map((doc) => `practice-${String(doc.id)}`),
  )

  const [squadDocs, members, answers] = await Promise.all([
    getSquads(schedule.matches.map((match) => fixtureNumber(match.id))),
    getMembers(),
    getAnswers([...schedule.matches, ...practiceEvents]),
  ])
  const squadOf = new Map(squadDocs.map((squad) => [`fixture-${String(squad.fixture)}`, squad]))
  const matches = schedule.matches.map((match) => ({
    ...match,
    deadlineDay: squadOf.get(match.id)?.deadlineDay,
  }))
  const exceptionsOf = (teamId: string) =>
    matches
      .filter((match) => match.team.id === teamId)
      .flatMap((match) => squadOf.get(match.id)?.exceptions ?? [])
  const recordedTeams = [
    ...new Set(
      practiceEvents
        .filter((event) => recordedPracticeIds.has(event.id))
        .map((event) => event.team.id),
    ),
  ]
  const attendance = await Promise.all(
    recordedTeams.map((teamId) => getAttendanceOf(teamId, today, exceptionsOf(teamId))),
  )

  const answered = new Map<number, Set<string>>()
  const going = new Map<string, Set<number>>()
  for (const answer of answers) {
    const eventId = toEventId(answer)
    if (!eventId) continue
    answered.set(answer.player, (answered.get(answer.player) ?? new Set()).add(eventId))
    if (answer.response === 'going') {
      going.set(eventId, (going.get(eventId) ?? new Set()).add(answer.player))
    }
  }

  return {
    now,
    events: [...matches, ...practiceEvents],
    members,
    answers: answered,
    going,
    recordedPracticeIds,
    squads: squadDocs.map((squad) => ({
      matchId: `fixture-${String(squad.fixture)}`,
      status: squad.status,
      statusChangedAt: squad.statusChangedAt ?? null,
      picks: toPicks(squad),
    })),
    attendance,
  }
}
