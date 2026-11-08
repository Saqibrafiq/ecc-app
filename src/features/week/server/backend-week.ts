import 'server-only'

import { z } from 'zod'

import {
  addDays,
  type DeadlineDay,
  getLocalDate,
  type LocalDate,
  planPractices,
  startOfWeek,
} from '@/domain/club-rules'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { buildWeek } from '../domain/build-week'
import type { MyWeek, ScheduledEvent, Team } from '../types'
import {
  answerDocSchema,
  fixtureDocSchema,
  practiceDocSchema,
  toAnswerMap,
  toMatchEvent,
  toPracticeEvent,
  toTeam,
  toTeamPractice,
} from './map-backend'

const DAYS_PER_WEEK = 7
const DEFAULT_PRACTICE_TIME = '18:30'
const LIST_LIMIT = '300'
/** Payload stores day-only dates at noon UTC, inside the club day all year. */
const NOON_UTC = 'T12:00:00.000Z'

export type MemberRef = { playerId: number; token: string }

export type BackendWeek =
  { kind: 'week'; week: MyWeek; nextMatch: ScheduledEvent | null } | { kind: 'no-squad' }

function query(params: Record<string, string>): string {
  return `?${new URLSearchParams({ limit: LIST_LIMIT, ...params }).toString()}`
}

const dayStart = (date: LocalDate) => `${date}T00:00:00.000Z`

async function getSquadTeamId(member: MemberRef): Promise<number | null> {
  const player = await backendRequest({
    path: `/players/${String(member.playerId)}?depth=0`,
    auth: { as: 'member', token: member.token },
    schema: z.object({ squadTeam: relationIdSchema.nullish() }),
  })
  return player.squadTeam ?? null
}

async function getClubTeams(auth: BackendAuth): Promise<Map<number, Team>> {
  const { docs } = await backendRequest({
    path: `/teams${query({ 'where[isClubTeam][equals]': 'true', depth: '0' })}`,
    auth,
    schema: listOf(z.object({ id: z.number(), shortName: z.string() })),
  })
  return new Map(docs.map((doc) => [doc.id, toTeam(doc)]))
}

async function getMatches(auth: BackendAuth, from: LocalDate, to: LocalDate) {
  const { docs } = await backendRequest({
    path: `/fixtures${query({
      'where[date][greater_than_equal]': dayStart(from),
      'where[date][less_than]': dayStart(to),
      depth: '1',
      sort: 'date',
    })}`,
    auth,
    schema: listOf(fixtureDocSchema),
  })
  return docs.map(toMatchEvent).filter((event): event is ScheduledEvent => event !== null)
}

async function getWeekPractices(monday: LocalDate) {
  const { docs } = await backendRequest({
    path: `/practice-sessions${query({
      'where[date][greater_than_equal]': dayStart(monday),
      'where[date][less_than]': dayStart(addDays(monday, DAYS_PER_WEEK)),
      depth: '0',
    })}`,
    auth: { as: 'service' },
    schema: listOf(practiceDocSchema),
  })
  return docs
}

/**
 * Creates the week's automatic practices that do not exist yet (R-1: Saturday match → Wednesday,
 * Sunday → Thursday), as the service account, then reads the week's practices back. Idempotent:
 * an existing practice is left alone, and when two requests create the same one at once the
 * database's unique (team, day) index refuses the second, which is fine (ADR-0004).
 */
async function ensurePractices(monday: LocalDate, matches: readonly ScheduledEvent[]) {
  const existing = await getWeekPractices(monday)
  const key = (team: string | number, date: string) => `${String(team)}|${date}`
  const have = new Set(existing.map((doc) => key(doc.team, getLocalDate(new Date(doc.date)))))
  const planned = planPractices(
    matches.map((match) => ({ id: match.id, teamId: match.team.id, date: match.date })),
  ).filter((practice) => !have.has(key(practice.teamId, practice.date)))
  if (planned.length === 0) return existing

  await Promise.allSettled(
    planned.map((practice) =>
      backendRequest({
        method: 'POST',
        path: '/practice-sessions',
        auth: { as: 'service' },
        body: {
          team: Number(practice.teamId),
          date: `${practice.date}${NOON_UTC}`,
          startTime: DEFAULT_PRACTICE_TIME,
          fixture: Number(practice.fixtureId.replace('fixture-', '')),
        },
        schema: z.unknown(),
      }),
    ),
  )
  return getWeekPractices(monday)
}

async function getDeadlineDays(member: MemberRef, matches: readonly ScheduledEvent[]) {
  const ids = matches.map((match) => match.id.replace('fixture-', ''))
  if (ids.length === 0) return new Map<string, DeadlineDay>()
  const { docs } = await backendRequest({
    path: `/squads${query({ 'where[fixture][in]': ids.join(','), depth: '0' })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(
      z.object({
        fixture: relationIdSchema,
        deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']),
      }),
    ),
  })
  return new Map(docs.map((doc) => [`fixture-${String(doc.fixture)}`, doc.deadlineDay]))
}

async function getAnswers(member: MemberRef) {
  const { docs } = await backendRequest({
    path: `/availability-responses${query({
      'where[player][equals]': String(member.playerId),
      depth: '0',
      sort: '-updatedAt',
    })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(answerDocSchema),
  })
  return toAnswerMap(docs)
}

async function getSeasonPractices(member: MemberRef, teamId: number, seasonStart: LocalDate) {
  const { docs } = await backendRequest({
    path: `/practice-sessions${query({
      'where[team][equals]': String(teamId),
      'where[date][greater_than_equal]': dayStart(seasonStart),
      depth: '0',
    })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(practiceDocSchema),
  })
  return docs.map(toTeamPractice)
}

async function getAttendedPracticeIds(member: MemberRef): Promise<Set<string>> {
  const { docs } = await backendRequest({
    path: `/attendance${query({
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
async function getNextMatch(auth: BackendAuth, after: LocalDate, teamId: string) {
  const { docs } = await backendRequest({
    path: `/fixtures${query({
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

/**
 * The signed-in member's week from the club's backend: real fixtures, the practices they lead to,
 * the member's answers and attendance (ADR-0002). The season starts on 1 January of the year.
 */
export async function getBackendWeek(member: MemberRef, now: Date): Promise<BackendWeek> {
  const auth: BackendAuth = { as: 'member', token: member.token }
  const squadTeamId = await getSquadTeamId(member)
  if (squadTeamId === null) return { kind: 'no-squad' }

  const today = getLocalDate(now)
  const monday = startOfWeek(today)
  const nextMonday = addDays(monday, DAYS_PER_WEEK)
  const seasonStart = `${today.slice(0, 4)}-01-01` as LocalDate

  const [teams, matches] = await Promise.all([
    getClubTeams(auth),
    getMatches(auth, monday, nextMonday),
  ])
  const ownTeam = teams.get(squadTeamId) ?? { id: String(squadTeamId), name: '' }
  const [practiceDocs, deadlineDays, answers, practices, attended, nextMatch] = await Promise.all([
    ensurePractices(monday, matches),
    getDeadlineDays(member, matches),
    getAnswers(member),
    getSeasonPractices(member, squadTeamId, seasonStart),
    getAttendedPracticeIds(member),
    getNextMatch(auth, nextMonday, ownTeam.id),
  ])

  const practiceEvents = practiceDocs
    .filter((doc) => doc.isCancelled !== true)
    .flatMap((doc) => {
      const team = teams.get(doc.team)
      return team ? [toPracticeEvent(doc, team)] : []
    })
  const events = [
    ...matches.map((match) => ({ ...match, deadlineDay: deadlineDays.get(match.id) })),
    ...practiceEvents,
  ]

  return {
    kind: 'week',
    week: buildWeek({
      now,
      ownTeam,
      events,
      answers,
      practices,
      attendedPracticeIds: attended,
      seasonStart,
    }),
    nextMatch,
  }
}
