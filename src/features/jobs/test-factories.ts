import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

import type { JobMember, SquadState, TickInput } from './types'

export const ECC_I = { id: '1', name: 'ECC I' }
export const ECC_II = { id: '14', name: 'ECC II' }

// The week of Monday 9 November 2026: ECC I plays Saturday and practises Wednesday, ECC II plays
// Sunday and practises Thursday (R-1). Answers for both matches close at the end of Tuesday.
export const MATCH_I: ScheduledEvent = {
  id: 'fixture-60',
  kind: 'match',
  team: ECC_I,
  date: day('2026-11-14'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'NCC-I',
  isHome: false,
}
export const PRACTICE_I: ScheduledEvent = {
  id: 'practice-7',
  kind: 'practice',
  team: ECC_I,
  date: day('2026-11-11'),
  startTime: time('18:30'),
  ground: 'Erlangen',
}
export const MATCH_II: ScheduledEvent = {
  ...MATCH_I,
  id: 'fixture-61',
  team: ECC_II,
  date: day('2026-11-15'),
  opponent: 'TSVGC',
}
export const PRACTICE_II: ScheduledEvent = {
  ...PRACTICE_I,
  id: 'practice-8',
  team: ECC_II,
  date: day('2026-11-12'),
}

export const MEMBERS: JobMember[] = [
  { userId: 1, playerId: 101, teamId: '1', captainOfTeamId: '1', isBoard: false },
  { userId: 2, playerId: 102, teamId: '1', captainOfTeamId: null, isBoard: false },
  { userId: 3, playerId: 103, teamId: '14', captainOfTeamId: '14', isBoard: false },
  // Not linked to a player yet, and linked but in no squad: nothing to answer.
  { userId: 4, playerId: null, teamId: null, captainOfTeamId: null, isBoard: false },
  { userId: 5, playerId: 105, teamId: null, captainOfTeamId: null, isBoard: false },
  // The Board: two admins, one of whom also plays.
  { userId: 6, playerId: null, teamId: null, captainOfTeamId: null, isBoard: true },
  { userId: 7, playerId: 107, teamId: '14', captainOfTeamId: null, isBoard: true },
]

/** An instant in Erlangen (CET, UTC+1 in November). */
export const at = (localDateTime: string) => new Date(`${localDateTime}+01:00`)

/** `count` players without an account who said Going. */
export const others = (count: number) =>
  new Set(Array.from({ length: count }, (_, index) => 1000 + index))

/** When the website last stamped a squad's status: Wednesday evening. */
export const STAMP = '2026-11-11T19:00:00.000Z'

export function squad(
  matchId: string,
  status: SquadState['status'],
  overrides: Partial<SquadState> = {},
): SquadState {
  return { matchId, status, statusChangedAt: STAMP, picks: [], ...overrides }
}

/** Monday 11:30 of that week, nothing answered, recorded or handed in yet. */
export function tickInput(overrides: Partial<TickInput> = {}): TickInput {
  return {
    now: at('2026-11-09T11:30'),
    events: [MATCH_I, PRACTICE_I, MATCH_II, PRACTICE_II],
    members: MEMBERS,
    answers: new Map(),
    going: new Map([
      ['practice-7', others(9)],
      ['fixture-60', others(14)],
    ]),
    recordedPracticeIds: new Set(),
    squads: [],
    attendance: [],
    ...overrides,
  }
}
