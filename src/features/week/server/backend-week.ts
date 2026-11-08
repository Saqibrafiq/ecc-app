import 'server-only'

import { z } from 'zod'

import {
  addDays,
  type DeadlineDay,
  getLocalDate,
  type LocalDate,
  startOfWeek,
} from '@/domain/club-rules'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { buildWeek } from '../domain/build-week'
import type { MyWeek, ScheduledEvent } from '../types'
import { getClubSchedule, getTeamSeasonPractices } from './club-schedule'
import {
  answerDocSchema,
  fixtureDocSchema,
  toAnswerMap,
  toMatchEvent,
  toPracticeEvent,
} from './map-backend'

const DAYS_PER_WEEK = 7

export type MemberRef = { playerId: number; token: string }

export type BackendWeek =
  { kind: 'week'; week: MyWeek; nextMatch: ScheduledEvent | null } | { kind: 'no-squad' }

async function getSquadTeamId(member: MemberRef): Promise<number | null> {
  const player = await backendRequest({
    path: `/players/${String(member.playerId)}?depth=0`,
    auth: { as: 'member', token: member.token },
    schema: z.object({ squadTeam: relationIdSchema.nullish() }),
  })
  return player.squadTeam ?? null
}

async function getDeadlineDays(member: MemberRef, matches: readonly ScheduledEvent[]) {
  const ids = matches.map((match) => match.id.replace('fixture-', ''))
  if (ids.length === 0) return new Map<string, DeadlineDay>()
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][in]': ids.join(','), depth: '0' })}`,
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

async function getAttendedPracticeIds(member: MemberRef): Promise<Set<string>> {
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
async function getNextMatch(auth: BackendAuth, after: LocalDate, teamId: string) {
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

  const [schedule, answers, practices, attended, nextMatch] = await Promise.all([
    getClubSchedule(auth, monday),
    getAnswers(member),
    getTeamSeasonPractices(auth, squadTeamId, seasonStart),
    getAttendedPracticeIds(member),
    getNextMatch(auth, nextMonday, String(squadTeamId)),
  ])
  const { teams, matches, practices: practiceDocs } = schedule
  const deadlineDays = await getDeadlineDays(member, matches)
  const ownTeam = teams.get(squadTeamId) ?? { id: String(squadTeamId), name: '' }

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
