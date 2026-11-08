import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'

import { buildWeek } from './domain/build-week'
import type { MyWeek, ScheduledEvent, Team, WeekEvent } from './types'

export const ECC_I: Team = { id: '1', name: 'ECC I' }
export const ECC_II: Team = { id: '14', name: 'ECC II' }
export const ECC_III: Team = { id: '72', name: 'ECC III' }

export const MATCH: ScheduledEvent = {
  id: 'fixture-12',
  kind: 'match',
  team: ECC_I,
  date: day('2026-11-14'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'NCC-I',
  competition: 'BCV Regionalliga Bayern',
  overs: 50,
  isHome: false,
}

export const PRACTICE: ScheduledEvent = {
  id: 'practice-5',
  kind: 'practice',
  team: ECC_I,
  date: day('2026-11-11'),
  startTime: time('18:30'),
  ground: 'Erlangen',
}

/** Monday 9 November 2026, 10:00 in Erlangen. */
export const MONDAY_MORNING = new Date('2026-11-09T09:00:00Z')

/** A week built by the real rules, so tests see what members see. */
export function makeWeek(events: readonly ScheduledEvent[] = [PRACTICE, MATCH]): MyWeek {
  return buildWeek({
    now: MONDAY_MORNING,
    ownTeam: ECC_I,
    events,
    answers: {},
    practices: [
      { id: 'practice-1', date: day('2026-10-21'), isCancelled: false, isRecorded: true },
      { id: 'practice-2', date: day('2026-10-28'), isCancelled: false, isRecorded: true },
      { id: 'practice-3', date: day('2026-11-04'), isCancelled: false, isRecorded: true },
      { id: 'practice-5', date: day('2026-11-11'), isCancelled: false, isRecorded: false },
    ],
    attendedPracticeIds: new Set(['practice-1', 'practice-3']),
    seasonStart: day('2026-01-01'),
  })
}

export function makeWeekEvent(overrides: Partial<WeekEvent> = {}): WeekEvent {
  return {
    ...MATCH,
    closesAt: '2026-11-10T22:59:59.999Z',
    isOpen: true,
    isOwnTeam: false,
    answer: null,
    reason: null,
    ...overrides,
  }
}
