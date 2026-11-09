import 'server-only'

import {
  addDays,
  getLocalDate,
  type LocalDate,
  startOfWeek,
  toInstant,
  toLocalTime,
} from '@/domain/club-rules'
import { type Answer, getPreviewNow, type ScheduledEvent, type Team } from '@/features/week'

import { buildCandidates } from '../domain/selection'
import type { CheckIn, SquadSelection, TeamWeek } from '../types'

/**
 * Sample data for the captain's screens in the preview (no backend): ECC I's week on Wednesday
 * evening, after practice, with the squad still to pick. Same shapes as the real data.
 */

export const SAMPLE_PRACTICE_ID = 101
export const SAMPLE_FIXTURE_ID = 201

const ECC_I: Team = { id: 'ecc-1', name: 'ECC I' }
const DAYS_PER_WEEK = 7
const WEDNESDAY = 2
const SATURDAY = 5
const SEASON_LENGTH_SHOWN_DAYS = 60

const PLAYERS = [
  { id: '1', name: 'Saqib Rafiq', answer: 'going', attended: [3, 1] },
  { id: '2', name: 'Ali Shaan', answer: 'going', attended: [2, 1] },
  { id: '3', name: 'Bilal Mir', answer: 'going', attended: [2] },
  { id: '4', name: 'Omar Farooq', answer: 'going', attended: [3, 2] },
  { id: '5', name: 'Usman Khan', answer: 'going', attended: [3, 2, 1], isNew: true },
  { id: '6', name: 'Hamza Iqbal', answer: 'going', attended: [3, 1] },
  { id: '7', name: 'Faisal Butt', answer: 'going', attended: [2, 1] },
  { id: '8', name: 'Imran Siddiqui', answer: 'going', attended: [3, 2] },
  { id: '9', name: 'Kashif Raza', answer: 'going', attended: [3, 2, 1] },
  { id: '10', name: 'Junaid Akhtar', answer: 'going', attended: [2, 1] },
  { id: '11', name: 'Tobias Weber', answer: 'going', attended: [3, 1] },
  { id: '12', name: 'Arjun Mehta', answer: 'going', attended: [3, 2] },
  { id: '13', name: 'Rahul Nair', answer: 'going', attended: [2, 1] },
  { id: '14', name: 'Sami Ullah', answer: 'going', attended: [3, 1] },
  { id: '15', name: 'Waqas Ahmed', answer: 'going', attended: [3, 2] },
  { id: '16', name: 'Lukas Braun', answer: 'not-going', attended: [1] },
  { id: '17', name: 'Danish Ali', answer: null, attended: [] },
  { id: '19', name: 'Noah Fischer', answer: null, attended: [1] },
  { id: '18', name: 'Zain Malik', answer: 'not-going', attended: [3] },
] as const satisfies readonly {
  id: string
  name: string
  answer: Answer | null
  attended: readonly number[]
  isNew?: boolean
}[]

/** Last match's 12th man (Ali) and reserve (Zain, who now said Not going). */
const CARRY_OVERS = ['2', '18']
/** Selected last match but did not come (motion 2023/10). */
const NO_SHOWS = new Set(['4'])

/** The preview's Wednesday, 21:00: practice is over, the check-in and the selection are due. */
export function getTeamPreviewNow(realNow: Date): Date {
  const monday = getLocalDate(getPreviewNow(realNow))
  return toInstant(addDays(monday, WEDNESDAY), toLocalTime('21:00'))
}

function weekOf(now: Date) {
  const monday = startOfWeek(getLocalDate(now))
  const practice: ScheduledEvent = {
    id: `practice-${String(SAMPLE_PRACTICE_ID)}`,
    kind: 'practice',
    team: ECC_I,
    date: addDays(monday, WEDNESDAY),
    startTime: toLocalTime('18:30'),
    ground: 'Erlangen ground',
  }
  const match: ScheduledEvent = {
    id: `fixture-${String(SAMPLE_FIXTURE_ID)}`,
    kind: 'match',
    team: ECC_I,
    date: addDays(monday, SATURDAY),
    startTime: toLocalTime('11:00'),
    ground: 'Nürnberg',
    opponent: 'Nürnberg CC',
    competition: 'BCV Regionalliga',
    overs: 20,
    isHome: false,
  }
  return { monday, practice, match }
}

export function getSampleTeamWeek(now: Date): TeamWeek {
  const { practice, match } = weekOf(now)
  return {
    team: ECC_I,
    choices: [],
    practices: [
      {
        event: practice,
        practiceId: SAMPLE_PRACTICE_ID,
        isRecorded: false,
        isCancelled: false,
        canCheckIn: true,
      },
    ],
    matches: [{ event: match, fixtureId: SAMPLE_FIXTURE_ID, squadStatus: 'open' }],
    corrections: [
      {
        id: 1,
        playerName: 'Lukas Braun',
        practiceDate: addDays(practice.date, -DAYS_PER_WEEK),
        note: 'Came after the check-in, stayed until the end.',
      },
    ],
  }
}

export function getSampleCheckIn(now: Date): CheckIn {
  const { practice } = weekOf(now)
  return {
    practice,
    practiceId: SAMPLE_PRACTICE_ID,
    isRecorded: false,
    isCancelled: false,
    canCheckIn: true,
    players: [...PLAYERS]
      .sort((a, b) => Number(b.answer === 'going') - Number(a.answer === 'going'))
      .map((player) => ({
        id: player.id,
        name: player.name,
        answer: player.answer,
        isPresent: false,
      })),
  }
}

export function getSampleSelection(now: Date): SquadSelection {
  const { monday, match } = weekOf(now)
  const wednesdayBefore = (weeksAgo: number): LocalDate =>
    addDays(monday, WEDNESDAY - weeksAgo * DAYS_PER_WEEK)
  const practices = [3, 2, 1, 0].map((weeksAgo) => ({
    id: `sample-practice-${String(weeksAgo)}`,
    date: wednesdayBefore(weeksAgo),
    isCancelled: false,
    isRecorded: weeksAgo > 0,
  }))
  const answers = new Map<string, Answer>(
    PLAYERS.flatMap((player) => (player.answer ? [[player.id, player.answer] as const] : [])),
  )
  const candidates = buildCandidates({
    players: PLAYERS.map((player) => ({
      id: player.id,
      name: player.name,
      isEcc1Eligible: !('isNew' in player),
    })),
    answers,
    isFirstTeam: true,
    practices,
    attendedByPlayer: new Map(
      PLAYERS.map((player) => [
        player.id,
        new Set(player.attended.map((weeksAgo) => `sample-practice-${String(weeksAgo)}`)),
      ]),
    ),
    carryOvers: CARRY_OVERS,
    noShows: NO_SHOWS,
    exceptions: new Set(),
    matchDate: match.date,
    today: getLocalDate(now),
    seasonStart: addDays(monday, -SEASON_LENGTH_SHOWN_DAYS),
  })

  return {
    fixtureId: SAMPLE_FIXTURE_ID,
    match,
    status: 'open',
    note: null,
    candidates,
    picks: [],
    notGoing: PLAYERS.filter((player) => player.answer === 'not-going').length,
    awaiting: PLAYERS.filter((player) => player.answer === null).length,
  }
}
