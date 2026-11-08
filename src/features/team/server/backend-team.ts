import 'server-only'

import { z } from 'zod'

import {
  getCarryOvers,
  getLocalDate,
  type LocalDate,
  type SquadPick,
  startOfWeek,
} from '@/domain/club-rules'
import {
  type Answer,
  fixtureDocSchema,
  getClubSchedule,
  getClubTeams,
  getTeamSeasonPractices,
  practiceDocSchema,
  toLocalDay,
  toMatchEvent,
  toPracticeEvent,
} from '@/features/week'
import { type BackendAuth, BackendError, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { type AttendanceRecord, isInitiallyPresent } from '../domain/check-in'
import { buildCandidates, getInitialPicks, isFirstTeam } from '../domain/selection'
import type { CheckIn, SquadSelection, SquadStatus, TeamWeek } from '../types'

/** The signed-in captain: the team they lead and their session. */
export type CaptainRef = { teamId: number; token: string }

const NOT_FOUND = 404
/** A season of a team's attendance: about 40 practices for up to 25 players. */
const ATTENDANCE_LIMIT = '1000'

const squadStatusSchema = z.enum(['open', 'submitted', 'approved', 'returned'])
const squadDocSchema = z.object({
  id: z.number(),
  fixture: relationIdSchema,
  status: squadStatusSchema,
  picks: z
    .array(z.object({ player: relationIdSchema, role: z.enum(['playing', 'twelfth', 'reserve']) }))
    .nullish(),
  noShows: z.array(relationIdSchema).nullish(),
  exceptions: z.array(relationIdSchema).nullish(),
  note: z.string().nullish(),
})
type SquadDoc = z.infer<typeof squadDocSchema>

const playerDocSchema = z.object({
  id: z.number(),
  name: z.string(),
  isEcc1Eligible: z.boolean().nullish(),
})

const authOf = (captain: CaptainRef): BackendAuth => ({ as: 'member', token: captain.token })
const fixtureNumber = (eventId: string) => Number(eventId.replace('fixture-', ''))
const ids = (values: readonly number[] | null | undefined) => (values ?? []).map(String)

function toPicks(doc: SquadDoc): SquadPick[] {
  return (doc.picks ?? []).map((pick) => ({ playerId: String(pick.player), role: pick.role }))
}

function isNotFound(error: unknown): boolean {
  return error instanceof BackendError && error.status === NOT_FOUND
}

/** A document by id, or `null` if the backend has none. */
async function findById<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** The team's squad players, plus anyone else the screen must name (walk-ins, carry-overs). */
async function getPlayers(auth: BackendAuth, teamId: number, extraIds: readonly string[]) {
  const params: Record<string, string> =
    extraIds.length === 0
      ? { 'where[squadTeam][equals]': String(teamId) }
      : {
          'where[or][0][squadTeam][equals]': String(teamId),
          'where[or][1][id][in]': extraIds.join(','),
        }
  const { docs } = await backendRequest({
    path: `/players${toQuery({ ...params, depth: '0', sort: 'name' })}`,
    auth,
    schema: listOf(playerDocSchema),
  })
  return docs.map((doc) => ({
    id: String(doc.id),
    name: doc.name,
    isEcc1Eligible: doc.isEcc1Eligible === true,
  }))
}

async function getEventAnswers(
  auth: BackendAuth,
  kind: 'fixture' | 'practice',
  id: number,
): Promise<Map<string, Answer>> {
  const { docs } = await backendRequest({
    path: `/availability-responses${toQuery({ [`where[${kind}][equals]`]: String(id), depth: '0' })}`,
    auth,
    schema: listOf(
      z.object({ player: relationIdSchema, response: z.enum(['going', 'not-going']) }),
    ),
  })
  return new Map(docs.map((doc) => [String(doc.player), doc.response]))
}

async function findSquad(auth: BackendAuth, fixtureId: number): Promise<SquadDoc | null> {
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][equals]': String(fixtureId), depth: '0', limit: '1' })}`,
    auth,
    schema: listOf(squadDocSchema),
  })
  return docs[0] ?? null
}

/**
 * The match's squad, created open by the service account if it does not exist yet (only the
 * Board creates squads). Two requests creating it at once meet the unique fixture index; the
 * loser's error is expected, so the outcome is judged by reading the squad back.
 */
async function ensureSquad(auth: BackendAuth, fixtureId: number): Promise<SquadDoc> {
  const found = await findSquad(auth, fixtureId)
  if (found) return found
  const [creation] = await Promise.allSettled([
    backendRequest({
      method: 'POST',
      path: '/squads',
      auth: { as: 'service' },
      body: { fixture: fixtureId },
      schema: z.unknown(),
    }),
  ])
  const created = await findSquad(auth, fixtureId)
  if (created) return created
  throw new Error(`The squad for fixture ${String(fixtureId)} could not be created or read`, {
    cause: creation.status === 'rejected' ? creation.reason : undefined,
  })
}

/** The team's announced squad of its previous match, for carry-overs and no-shows (R-13, R-14). */
async function getPreviousSquad(auth: BackendAuth, teamId: number, before: LocalDate) {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
      'where[date][less_than]': dayStart(before),
      'where[or][0][team1][equals]': String(teamId),
      'where[or][1][team2][equals]': String(teamId),
      depth: '0',
      sort: '-date',
      limit: '1',
    })}`,
    auth,
    schema: listOf(z.object({ id: z.number() })),
  })
  const [previous] = docs
  if (!previous) return null
  const squad = await findSquad(auth, previous.id)
  return squad?.status === 'approved' ? squad : null
}

/** Which practices each player attended this season, by the app's practice id. */
async function getTeamAttendance(auth: BackendAuth, teamId: number) {
  const { docs } = await backendRequest({
    path: `/attendance${toQuery({
      'where[team][equals]': String(teamId),
      'where[attended][equals]': 'true',
      depth: '0',
      limit: ATTENDANCE_LIMIT,
    })}`,
    auth,
    schema: listOf(z.object({ player: relationIdSchema, practice: relationIdSchema })),
  })
  const byPlayer = new Map<string, Set<string>>()
  for (const doc of docs) {
    const attended = byPlayer.get(String(doc.player)) ?? new Set<string>()
    attended.add(`practice-${String(doc.practice)}`)
    byPlayer.set(String(doc.player), attended)
  }
  return byPlayer
}

async function getPracticeRecords(
  auth: BackendAuth,
  practiceId: number,
): Promise<AttendanceRecord[]> {
  const { docs } = await backendRequest({
    path: `/attendance${toQuery({ 'where[practice][equals]': String(practiceId), depth: '0' })}`,
    auth,
    schema: listOf(
      z.object({ id: z.number(), player: relationIdSchema, attended: z.boolean().nullish() }),
    ),
  })
  return docs.map((doc) => ({
    id: doc.id,
    playerId: String(doc.player),
    attended: doc.attended === true,
  }))
}

async function getSquadStatuses(auth: BackendAuth, fixtureIds: readonly number[]) {
  if (fixtureIds.length === 0) return new Map<number, SquadStatus>()
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][in]': fixtureIds.join(','), depth: '0' })}`,
    auth,
    schema: listOf(z.object({ fixture: relationIdSchema, status: squadStatusSchema })),
  })
  return new Map(docs.map((doc) => [doc.fixture, doc.status]))
}

/** The captain's team this week: its practices with their check-in, its matches with their squad. */
export async function getBackendTeamWeek(captain: CaptainRef, now: Date): Promise<TeamWeek> {
  const auth = authOf(captain)
  const today = getLocalDate(now)
  const schedule = await getClubSchedule(auth, startOfWeek(today))
  const team = schedule.teams.get(captain.teamId) ?? { id: String(captain.teamId), name: '' }
  const matches = schedule.matches.filter((match) => match.team.id === team.id)
  const statuses = await getSquadStatuses(
    auth,
    matches.map((match) => fixtureNumber(match.id)),
  )

  return {
    team,
    practices: schedule.practices
      .filter((doc) => doc.team === captain.teamId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((doc) => ({
        event: toPracticeEvent(doc, team),
        practiceId: doc.id,
        isRecorded: doc.isRecorded === true,
        isCancelled: doc.isCancelled === true,
        canCheckIn: doc.isCancelled !== true && toLocalDay(doc.date) <= today,
      })),
    matches: matches.map((match) => ({
      event: match,
      fixtureId: fixtureNumber(match.id),
      squadStatus: statuses.get(fixtureNumber(match.id)) ?? 'open',
    })),
  }
}

export type CheckInData = {
  checkIn: CheckIn
  records: AttendanceRecord[]
  answers: Map<string, Answer>
}

/** A practice of the captain's team with who said Going and who is marked present, or `null`. */
export async function loadCheckIn(
  captain: CaptainRef,
  practiceId: number,
  now: Date,
): Promise<CheckInData | null> {
  const auth = authOf(captain)
  const practice = await findById(() =>
    backendRequest({
      path: `/practice-sessions/${String(practiceId)}?depth=0`,
      auth,
      schema: practiceDocSchema,
    }),
  )
  if (practice?.team !== captain.teamId) return null

  const [teams, answers, records] = await Promise.all([
    getClubTeams(auth),
    getEventAnswers(auth, 'practice', practiceId),
    getPracticeRecords(auth, practiceId),
  ])
  const players = await getPlayers(
    auth,
    captain.teamId,
    records.map((record) => record.playerId),
  )
  const team = teams.get(captain.teamId) ?? { id: String(captain.teamId), name: '' }
  const isRecorded = practice.isRecorded === true
  const isCancelled = practice.isCancelled === true
  const recordByPlayer = new Map(records.map((record) => [record.playerId, record]))
  const saidGoing = (id: string) => (answers.get(id) === 'going' ? 0 : 1)

  return {
    checkIn: {
      practice: toPracticeEvent(practice, team),
      practiceId,
      isRecorded,
      isCancelled,
      canCheckIn: !isCancelled && toLocalDay(practice.date) <= getLocalDate(now),
      players: players
        .map((player) => {
          const answer = answers.get(player.id) ?? null
          return {
            id: player.id,
            name: player.name,
            answer,
            isPresent: isInitiallyPresent(recordByPlayer.get(player.id), answer, isRecorded),
          }
        })
        .sort((a, b) => saidGoing(a.id) - saidGoing(b.id)),
    },
    records,
    answers,
  }
}

export type SelectionData = {
  selection: SquadSelection
  squadId: number
  carryOvers: string[]
  notGoing: Set<string>
}

/** A match of the captain's team with everyone they may pick and the squad so far, or `null`. */
export async function loadSelection(
  captain: CaptainRef,
  fixtureId: number,
  now: Date,
): Promise<SelectionData | null> {
  const auth = authOf(captain)
  const fixture = await findById(() =>
    backendRequest({
      path: `/fixtures/${String(fixtureId)}?depth=1`,
      auth,
      schema: fixtureDocSchema,
    }),
  )
  const match = fixture ? toMatchEvent(fixture) : null
  if (match?.team.id !== String(captain.teamId)) return null

  const today = getLocalDate(now)
  const seasonStart = `${today.slice(0, 4)}-01-01` as LocalDate
  const [squad, previous, answers, practices, attendedByPlayer] = await Promise.all([
    ensureSquad(auth, fixtureId),
    getPreviousSquad(auth, captain.teamId, match.date),
    getEventAnswers(auth, 'fixture', fixtureId),
    getTeamSeasonPractices(auth, captain.teamId, seasonStart),
    getTeamAttendance(auth, captain.teamId),
  ])
  const carryOvers = previous ? getCarryOvers(toPicks(previous)) : []
  const saved = toPicks(squad)
  const players = await getPlayers(auth, captain.teamId, [
    ...new Set([...carryOvers, ...saved.map((pick) => pick.playerId)]),
  ])
  const candidates = buildCandidates({
    players,
    answers,
    isFirstTeam: isFirstTeam(match.team.name),
    practices,
    attendedByPlayer,
    carryOvers,
    noShows: new Set(ids(previous?.noShows)),
    exceptions: new Set(ids(squad.exceptions)),
    matchDate: match.date,
    today,
    seasonStart,
  })
  const notGoing = new Set(
    [...answers].filter(([, answer]) => answer === 'not-going').map(([id]) => id),
  )
  const nameOf = new Map(players.map((player) => [player.id, player.name]))

  return {
    selection: {
      fixtureId,
      match,
      status: squad.status,
      note: squad.note ?? null,
      candidates,
      picks: getInitialPicks(saved, candidates),
      forfeited: carryOvers
        .filter((id) => notGoing.has(id))
        .map((id) => ({ id, name: nameOf.get(id) ?? '' })),
      notGoing: notGoing.size,
      awaiting: players.filter((player) => !answers.has(player.id)).length,
    },
    squadId: squad.id,
    carryOvers,
    notGoing,
  }
}
