import 'server-only'

import { z } from 'zod'

import {
  addDays,
  getLocalDate,
  type LocalDate,
  planPractices,
  type TeamPractice,
} from '@/domain/club-rules'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf } from '@/shared/backend/schemas'

import type { ScheduledEvent, Team } from '../types'
import {
  fixtureDocSchema,
  type PracticeDoc,
  practiceDocSchema,
  toMatchEvent,
  toTeam,
  toTeamPractice,
} from './map-backend'

const DAYS_PER_WEEK = 7
const DEFAULT_PRACTICE_TIME = '18:30'
/** Payload stores day-only dates at noon UTC, inside the club day all year. */
const NOON_UTC = 'T12:00:00.000Z'

/** The club's week: its teams, the matches of its teams and their practices (cancelled included). */
export type ClubSchedule = {
  teams: Map<number, Team>
  matches: ScheduledEvent[]
  practices: PracticeDoc[]
}

export async function getClubTeams(auth: BackendAuth): Promise<Map<number, Team>> {
  const { docs } = await backendRequest({
    path: `/teams${toQuery({ 'where[isClubTeam][equals]': 'true', depth: '0' })}`,
    auth,
    schema: listOf(z.object({ id: z.number(), shortName: z.string() })),
  })
  return new Map(docs.map((doc) => [doc.id, toTeam(doc)]))
}

export async function getMatches(auth: BackendAuth, from: LocalDate, to: LocalDate) {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
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
    path: `/practice-sessions${toQuery({
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

/** The club's week from Monday: teams, matches, and practices (created for the matches if missing). */
export async function getClubSchedule(auth: BackendAuth, monday: LocalDate): Promise<ClubSchedule> {
  const [teams, matches] = await Promise.all([
    getClubTeams(auth),
    getMatches(auth, monday, addDays(monday, DAYS_PER_WEEK)),
  ])
  const practices = await ensurePractices(monday, matches)
  return { teams, matches, practices }
}

/** A team's practices this season, for the attendance rule (R-11). */
export async function getTeamSeasonPractices(
  auth: BackendAuth,
  teamId: number,
  seasonStart: LocalDate,
): Promise<TeamPractice[]> {
  const { docs } = await backendRequest({
    path: `/practice-sessions${toQuery({
      'where[team][equals]': String(teamId),
      'where[date][greater_than_equal]': dayStart(seasonStart),
      depth: '0',
    })}`,
    auth,
    schema: listOf(practiceDocSchema),
  })
  return docs.map(toTeamPractice)
}
