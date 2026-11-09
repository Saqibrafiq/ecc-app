import 'server-only'

import { z } from 'zod'

import { getAvailabilityDeadline, getLocalDate, type LocalDate } from '@/domain/club-rules'
import {
  fixtureDocSchema,
  getAnswers,
  getAttendedPracticeIds,
  getClubTeams,
  getDeadlineDays,
  getSquadTeamId,
  getTeamSeasonPractices,
  type MemberRef,
  type ScheduledEvent,
  toLocalDay,
  toMatchEvent,
} from '@/features/week'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { buildLedger } from '../domain/build-ledger'
import type { AttendanceLedger, CorrectionStatus } from '../types'

export type LedgerMember = MemberRef & { isCaptain: boolean }

export type BackendLedger = { kind: 'ledger'; ledger: AttendanceLedger } | { kind: 'no-squad' }

const correctionSchema = z.object({
  practice: relationIdSchema,
  status: z.enum(['requested', 'accepted', 'declined']),
})

/** The season starts on 1 January (pre-season practices included, R-11). */
export function getSeasonStart(today: LocalDate): LocalDate {
  return `${today.slice(0, 4)}-01-01` as LocalDate
}

function nextSeasonStart(seasonStart: LocalDate): LocalDate {
  return `${String(Number(seasonStart.slice(0, 4)) + 1)}-01-01` as LocalDate
}

/** The team's matches this season, past and to come. */
async function getSeasonMatches(auth: BackendAuth, teamId: number, seasonStart: LocalDate) {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
      'where[date][greater_than_equal]': dayStart(seasonStart),
      'where[date][less_than]': dayStart(nextSeasonStart(seasonStart)),
      'where[or][0][team1][equals]': String(teamId),
      'where[or][1][team2][equals]': String(teamId),
      depth: '1',
      sort: 'date',
    })}`,
    auth,
    schema: listOf(fixtureDocSchema),
  })
  return docs.map(toMatchEvent).filter((event): event is ScheduledEvent => event !== null)
}

const settingsSchema = z.object({ targetsStartOn: z.string().nullish() })

/** The day the availability targets start counting, as the Board set it (or `null`). */
async function getTargetsStartOn(auth: BackendAuth): Promise<LocalDate | null> {
  const settings = await backendRequest({
    path: '/globals/members-app-settings?depth=0',
    auth,
    schema: settingsSchema,
  })
  return settings.targetsStartOn ? toLocalDay(settings.targetsStartOn) : null
}

/** The member's correction requests by the app's practice id. */
export async function getCorrections(member: MemberRef): Promise<Map<string, CorrectionStatus>> {
  const { docs } = await backendRequest({
    path: `/attendance-corrections${toQuery({
      'where[player][equals]': String(member.playerId),
      depth: '0',
    })}`,
    auth: { as: 'member', token: member.token },
    schema: listOf(correctionSchema),
  })
  return new Map(docs.map((doc) => [`practice-${String(doc.practice)}`, doc.status]))
}

/** The member's season, read as the member: practices, attendance, requests and answers. */
export async function getBackendLedger(member: LedgerMember, now: Date): Promise<BackendLedger> {
  const auth: BackendAuth = { as: 'member', token: member.token }
  const teamId = await getSquadTeamId(member)
  if (teamId === null) return { kind: 'no-squad' }

  const today = getLocalDate(now)
  const seasonStart = getSeasonStart(today)
  const [teams, practices, attended, corrections, matches, answers, targetsStartOn] =
    await Promise.all([
      getClubTeams(auth),
      getTeamSeasonPractices(auth, teamId, seasonStart),
      getAttendedPracticeIds(member),
      getCorrections(member),
      getSeasonMatches(auth, teamId, seasonStart),
      getAnswers(member),
      getTargetsStartOn(auth),
    ])
  const deadlineDays = await getDeadlineDays(member, matches)

  return {
    kind: 'ledger',
    ledger: buildLedger({
      team: teams.get(teamId) ?? { id: String(teamId), name: '' },
      now,
      today,
      seasonStart,
      practices,
      attendedPracticeIds: attended,
      corrections,
      matches: matches.map((match) => ({
        date: match.date,
        isHome: match.isHome === true,
        closesAt: getAvailabilityDeadline(match.date, deadlineDays.get(match.id)),
        answer: answers[match.id]?.answer ?? null,
      })),
      isCaptain: member.isCaptain,
      targetsStartOn,
    }),
  }
}
