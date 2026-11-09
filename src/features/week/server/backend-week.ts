import 'server-only'

import { addDays, getLocalDate, type LocalDate, startOfWeek } from '@/domain/club-rules'
import type { BackendAuth } from '@/shared/backend/client'

import { buildWeek } from '../domain/build-week'
import type { MyWeek, ScheduledEvent } from '../types'
import { getClubSchedule, getTeamSeasonPractices } from './club-schedule'
import { toPracticeEvent } from './map-backend'
import {
  getAnswers,
  getAttendedPracticeIds,
  getDeadlineDays,
  getNextMatch,
  getSquadTeamId,
  type MemberRef,
} from './member-data'

const DAYS_PER_WEEK = 7

export type BackendWeek =
  { kind: 'week'; week: MyWeek; nextMatch: ScheduledEvent | null } | { kind: 'no-squad' }

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
