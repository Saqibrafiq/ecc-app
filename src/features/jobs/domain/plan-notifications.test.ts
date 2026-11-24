import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

import {
  at,
  MATCH_I,
  MATCH_II,
  MEMBERS,
  PRACTICE_I,
  PRACTICE_II,
  squad,
  tickInput,
} from '../test-factories'
import type { TickInput } from '../types'

vi.mock('server-only', () => ({}))

const { planNotifications } = await import('./plan-notifications')

const plan = (overrides: Partial<TickInput> = {}) => planNotifications(tickInput(overrides))

const summary = (notifications: ReturnType<typeof plan>) =>
  notifications.map((notification) => notification.key)

describe('planNotifications: reminders (UC-4, R-10)', () => {
  it('asks nobody before 11:00 on Monday', () => {
    expect(plan({ now: at('2026-11-09T10:59') })).toEqual([])
  })

  it('reminds each member once a day about everything their team has open', () => {
    const due = plan({ answers: new Map([[102, new Set(['fixture-60'])]]) })

    expect(summary(due)).toEqual([
      'reminder:2026-11-09:1',
      'reminder:2026-11-09:2',
      'reminder:2026-11-09:3',
      'reminder:2026-11-09:7',
    ])
    const events = (userId: number) => {
      const found = due.find((item) => item.userId === userId)
      return found?.kind === 'reminder' ? found.events.map((event) => event.id) : []
    }
    expect(events(1)).toEqual(['fixture-60', 'practice-7'])
    expect(events(2)).toEqual(['practice-7'])
    expect(events(3)).toEqual(['fixture-61', 'practice-8'])
  })

  it('reminds nobody who has answered everything', () => {
    const answered = new Set(['fixture-60', 'practice-7', 'fixture-61', 'practice-8'])
    const answers = new Map([101, 102, 103, 107].map((player) => [player, answered]))

    expect(summary(plan({ answers }))).toEqual([])
  })

  it('stops reminding about an event once its answers have closed', () => {
    // Wednesday noon: both matches closed on Tuesday, ECC I's practice at 06:30 today.
    const due = plan({ now: at('2026-11-11T12:00') })

    expect(due).toEqual([
      expect.objectContaining({ key: 'reminder:2026-11-11:3', events: [PRACTICE_II] }),
      expect.objectContaining({ key: 'reminder:2026-11-11:7', events: [PRACTICE_II] }),
      expect.objectContaining({ kind: 'selection' }),
      expect.objectContaining({ kind: 'selection' }),
    ])
  })
})

describe('planNotifications: check-in (UC-6)', () => {
  const evening = (overrides: Partial<TickInput> = {}) =>
    plan({ now: at('2026-11-11T21:30'), ...overrides }).filter((item) => item.kind === 'check-in')

  it('asks the captain to check in from 21:00 on practice day, with how many said Going', () => {
    expect(evening()).toEqual([
      {
        kind: 'check-in',
        key: 'check-in:practice-7:1',
        userId: 1,
        practice: PRACTICE_I,
        going: 9,
      },
    ])
    expect(plan({ now: at('2026-11-11T20:59') }).some((item) => item.kind === 'check-in')).toBe(
      false,
    )
  })

  it('still asks after a late tick, until the next evening', () => {
    const nextDay = (now: string) =>
      plan({ now: at(now) }).filter((item) => item.key.startsWith('check-in:practice-7'))

    expect(nextDay('2026-11-12T20:59')).toHaveLength(1)
    expect(nextDay('2026-11-12T21:00')).toHaveLength(0)
  })

  it('asks nobody once the practice is recorded, or for a team without a captain', () => {
    expect(evening({ recordedPracticeIds: new Set(['practice-7']) })).toEqual([])
    expect(
      evening({ members: MEMBERS.map((member) => ({ ...member, captainOfTeamId: null })) }),
    ).toEqual([])
  })
})

describe('planNotifications: squad selection (UC-9)', () => {
  const selections = (overrides: Partial<TickInput> = {}) =>
    plan({ now: at('2026-11-11T12:00'), ...overrides }).filter((item) => item.kind === 'selection')

  it('asks the captain to pick the squad once answers have closed, with how many said Going', () => {
    expect(selections()).toEqual([
      { kind: 'selection', key: 'selection:fixture-60:1', userId: 1, match: MATCH_I, going: 14 },
      { kind: 'selection', key: 'selection:fixture-61:3', userId: 3, match: MATCH_II, going: 0 },
    ])
  })

  it('waits for an extended deadline', () => {
    const extended = { ...MATCH_II, deadlineDay: 'thursday' as const }

    expect(summary(selections({ events: [MATCH_I, extended] }))).toEqual(['selection:fixture-60:1'])
  })

  it('asks nobody before the deadline, after the captain acted, or once the match is past', () => {
    expect(
      summary(plan({ now: at('2026-11-10T23:59') })).some((key) => key.startsWith('sel')),
    ).toBe(false)
    expect(
      summary(
        selections({ squads: [squad('fixture-60', 'submitted'), squad('fixture-61', 'returned')] }),
      ),
    ).toEqual([])
    expect(summary(selections({ squads: [squad('fixture-60', 'open')] }))).toHaveLength(2)
    expect(summary(plan({ now: at('2026-11-16T12:00') }))).toEqual([])
  })
})

describe('planNotifications', () => {
  it("adds each squad's step and the attendance warnings to the scheduled prompts", () => {
    const due = plan({
      now: at('2026-11-11T12:00'),
      squads: [squad('fixture-60', 'submitted')],
      recordedPracticeIds: new Set(['practice-7']),
      attendance: [
        {
          teamId: '1',
          seasonStart: day('2026-01-01'),
          practices: ['10-21', '10-28', '11-04', '11-11'].map((date, index) => ({
            id: `practice-${String(index + 4)}`,
            date: day(`2026-${date}`),
            isCancelled: false,
            isRecorded: true,
          })),
          attended: new Map(),
          selectableAnyway: new Set(),
        },
      ],
    })

    expect(new Set(due.map((item) => item.kind))).toEqual(
      new Set(['reminder', 'selection', 'approval', 'attendance']),
    )
  })
})
