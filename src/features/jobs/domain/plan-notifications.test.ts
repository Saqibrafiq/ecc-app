import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

vi.mock('server-only', () => ({}))

const { planNotifications } = await import('./plan-notifications')
type Input = Parameters<typeof planNotifications>[0]

const ECC_I = { id: '1', name: 'ECC I' }
const ECC_II = { id: '14', name: 'ECC II' }

// The week of Monday 9 November 2026: ECC I plays Saturday and practises Wednesday, ECC II plays
// Sunday and practises Thursday (R-1). Answers for both matches close at the end of Tuesday.
const MATCH_I: ScheduledEvent = {
  id: 'fixture-60',
  kind: 'match',
  team: ECC_I,
  date: day('2026-11-14'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'NCC-I',
  isHome: false,
}
const PRACTICE_I: ScheduledEvent = {
  id: 'practice-7',
  kind: 'practice',
  team: ECC_I,
  date: day('2026-11-11'),
  startTime: time('18:30'),
  ground: 'Erlangen',
}
const MATCH_II: ScheduledEvent = {
  ...MATCH_I,
  id: 'fixture-61',
  team: ECC_II,
  date: day('2026-11-15'),
  opponent: 'TSVGC',
}
const PRACTICE_II: ScheduledEvent = {
  ...PRACTICE_I,
  id: 'practice-8',
  team: ECC_II,
  date: day('2026-11-12'),
}

const MEMBERS = [
  { userId: 1, playerId: 101, teamId: '1', captainOfTeamId: '1' },
  { userId: 2, playerId: 102, teamId: '1', captainOfTeamId: null },
  { userId: 3, playerId: 103, teamId: '14', captainOfTeamId: '14' },
  // Not linked to a player yet, and linked but in no squad: nothing to answer.
  { userId: 4, playerId: null, teamId: null, captainOfTeamId: null },
  { userId: 5, playerId: 105, teamId: null, captainOfTeamId: null },
]

/** An instant in Erlangen (CET, UTC+1 in November). */
const at = (localDateTime: string) => new Date(`${localDateTime}+01:00`)

function plan(overrides: Partial<Input> = {}) {
  return planNotifications({
    now: at('2026-11-09T11:30'),
    events: [MATCH_I, PRACTICE_I, MATCH_II, PRACTICE_II],
    members: MEMBERS,
    answers: new Map(),
    going: new Map([
      ['practice-7', 9],
      ['fixture-60', 14],
    ]),
    recordedPracticeIds: new Set(),
    decidedFixtureIds: new Set(),
    ...overrides,
  })
}

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
    const answers = new Map([101, 102, 103].map((player) => [player, answered]))

    expect(summary(plan({ answers }))).toEqual([])
  })

  it('stops reminding about an event once its answers have closed', () => {
    // Wednesday noon: both matches closed on Tuesday, ECC I's practice at 06:30 today.
    const due = plan({ now: at('2026-11-11T12:00') })

    expect(due).toEqual([
      expect.objectContaining({ key: 'reminder:2026-11-11:3', events: [PRACTICE_II] }),
      expect.objectContaining({ kind: 'selection' }),
      expect.objectContaining({ kind: 'selection' }),
    ])
  })
})

describe('planNotifications: check-in (UC-6)', () => {
  const evening = (overrides: Partial<Input> = {}) =>
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
  const selections = (overrides: Partial<Input> = {}) =>
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
      summary(selections({ decidedFixtureIds: new Set(['fixture-60', 'fixture-61']) })),
    ).toEqual([])
    expect(summary(plan({ now: at('2026-11-16T12:00') }))).toEqual([])
  })
})
