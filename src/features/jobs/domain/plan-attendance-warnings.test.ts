import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

import { at, MATCH_I, MATCH_II, PRACTICE_I, tickInput } from '../test-factories'
import type { TeamAttendance, TickInput } from '../types'

vi.mock('server-only', () => ({}))

const { planAttendanceWarnings } = await import('./plan-attendance-warnings')

/** ECC I's last four practices; the latest, Wednesday's, is practice-7 of this week. */
const practice = (id: number, date: string, isRecorded = true) => ({
  id: `practice-${String(id)}`,
  date: day(date),
  isCancelled: false,
  isRecorded,
})
const SEASON: TeamAttendance['practices'] = [
  practice(4, '2026-10-21'),
  practice(5, '2026-10-28'),
  practice(6, '2026-11-04'),
  practice(7, '2026-11-11'),
]

function team(overrides: Partial<TeamAttendance> = {}): TeamAttendance {
  return {
    teamId: '1',
    seasonStart: day('2026-01-01'),
    practices: SEASON,
    attended: new Map([
      // The captain came to three of four; player 102 only to Wednesday's.
      [101, new Set(['practice-5', 'practice-6', 'practice-7'])],
      [102, new Set(['practice-7'])],
    ]),
    selectableAnyway: new Set(),
    ...overrides,
  }
}

const plan = (overrides: Partial<TickInput> = {}) =>
  planAttendanceWarnings(
    tickInput({
      now: at('2026-11-11T21:30'),
      recordedPracticeIds: new Set(['practice-7']),
      attendance: [team()],
      ...overrides,
    }),
  )

describe('planAttendanceWarnings (UC-8, R-3)', () => {
  it('tells a player the rule holds back that they cannot be picked, once per practice', () => {
    expect(plan()).toEqual([
      {
        kind: 'attendance',
        key: 'attendance:practice-7:2',
        userId: 2,
        match: MATCH_I,
        countdown: { kind: 'out' },
      },
    ])
  })

  it('tells them what they still need while an earlier practice is not recorded', () => {
    const unrecorded = SEASON.map((item) =>
      item.id === 'practice-6' ? { ...item, isRecorded: false } : item,
    )

    expect(plan({ attendance: [team({ practices: unrecorded })] })).toEqual([
      expect.objectContaining({ userId: 2, countdown: { kind: 'needs', needed: 1, of: 1 } }),
    ])
  })

  it('leaves out a player carried over or excepted, who is selectable anyway (R-8, R-13)', () => {
    expect(plan({ attendance: [team({ selectableAnyway: new Set([102]) })] })).toEqual([])
  })

  it('warns nobody before the rule applies with 4 practices of the season (R-11)', () => {
    expect(plan({ attendance: [team({ seasonStart: day('2026-10-25') })] })).toEqual([])
  })

  it("waits until the practice is recorded, and stops once the team's match is played", () => {
    expect(plan({ recordedPracticeIds: new Set() })).toEqual([])
    expect(plan({ now: at('2026-11-15T09:00') })).toEqual([])
  })

  it("needs the attendance of the practice's team", () => {
    expect(plan({ attendance: [] })).toEqual([])
    expect(plan({ attendance: [team({ teamId: '14' })] })).toEqual([])
  })

  it("speaks of the team's next match when it plays twice this week", () => {
    const sunday = { ...MATCH_II, id: 'fixture-62', team: MATCH_I.team }

    expect(plan({ events: [sunday, PRACTICE_I, MATCH_I] })).toEqual([
      expect.objectContaining({ userId: 2, match: MATCH_I }),
    ])
  })
})
