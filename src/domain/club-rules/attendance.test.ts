import { describe, expect, it } from 'vitest'

import {
  type AttendanceInput,
  getAttendanceStatus,
  getCountdown,
  type TeamPractice,
} from './attendance'
import { toLocalDate as day } from './local-time'

function practice(id: string, date: string, overrides: Partial<TeamPractice> = {}): TeamPractice {
  return { id, date: day(date), isCancelled: false, isRecorded: true, ...overrides }
}

// ECC I's practices before Saturday 8 May 2027 (the last one, 5 May, not yet played).
const PRACTICES = [
  practice('p1', '2027-04-14'),
  practice('p2', '2027-04-21'),
  practice('p3', '2027-04-28'),
  practice('p4', '2027-05-01'),
  practice('p5', '2027-05-05', { isRecorded: false }),
]

function status(overrides: Partial<AttendanceInput> = {}) {
  return getAttendanceStatus({
    practices: PRACTICES,
    attendedPracticeIds: new Set(),
    matchDate: day('2027-05-08'),
    today: day('2027-05-03'),
    seasonStart: day('2027-04-01'),
    ...overrides,
  })
}

describe('getAttendanceStatus', () => {
  it('counts the last 4 practices before the match, including the upcoming one, oldest first', () => {
    const result = status({ attendedPracticeIds: new Set(['p2', 'p4']) })

    expect(result.slots.map((slot) => [slot.practice.id, slot.outcome])).toEqual([
      ['p2', 'attended'],
      ['p3', 'missed'],
      ['p4', 'attended'],
      ['p5', 'upcoming'],
    ])
  })

  it('is met with 2 practices attended', () => {
    const result = status({ attendedPracticeIds: new Set(['p2', 'p4']) })

    expect(result).toMatchObject({
      attended: 2,
      open: 1,
      required: 2,
      standing: 'met',
      stillNeeded: 0,
    })
  })

  it('is possible with 1 attended and the upcoming practice still to come', () => {
    const result = status({ attendedPracticeIds: new Set(['p3']) })

    expect(result).toMatchObject({ attended: 1, open: 1, standing: 'possible', stillNeeded: 1 })
  })

  it('is out when the practices still open cannot make up the difference', () => {
    expect(status().standing).toBe('out')
  })

  it('never counts a cancelled practice, and looks further back instead', () => {
    const practices = PRACTICES.map((p) => (p.id === 'p3' ? { ...p, isCancelled: true } : p))
    const result = status({ practices, attendedPracticeIds: new Set(['p1', 'p2']) })

    expect(result.slots.map((slot) => slot.practice.id)).toEqual(['p1', 'p2', 'p4', 'p5'])
    expect(result.standing).toBe('met')
  })

  it('does not count anyone as missing a practice the captain has not recorded yet', () => {
    const practices = PRACTICES.map((p) => (p.id === 'p4' ? { ...p, isRecorded: false } : p))
    const result = status({ practices, attendedPracticeIds: new Set(['p2']) })

    expect(result.slots.find((slot) => slot.practice.id === 'p4')?.outcome).toBe('unrecorded')
    expect(result).toMatchObject({ open: 2, standing: 'possible' })
  })

  it('treats a practice on the day itself as upcoming until it is recorded', () => {
    const result = status({ today: day('2027-05-05') })

    expect(result.slots.at(-1)?.outcome).toBe('upcoming')
  })

  it('ignores practices on or after the match day', () => {
    const practices = [...PRACTICES, practice('later', '2027-05-12', { isRecorded: false })]

    expect(status({ practices }).slots.map((slot) => slot.practice.id)).not.toContain('later')
  })

  it("ignores last season's practices", () => {
    const practices = [practice('old', '2026-09-02'), practice('first', '2027-05-05')]
    const result = status({ practices, attendedPracticeIds: new Set(['old']) })

    expect(result.slots.map((slot) => slot.practice.id)).toEqual(['first'])
  })

  it('does not apply until 4 practices of this season count for the match', () => {
    // Pre-season practices from 15 March, first match on 1 April: everyone can be picked.
    const practices = [
      practice('pre1', '2027-03-15'),
      practice('pre2', '2027-03-22'),
      practice('pre3', '2027-03-29'),
    ]
    const result = status({
      practices,
      matchDate: day('2027-04-01'),
      today: day('2027-03-30'),
      seasonStart: day('2027-03-15'),
    })

    expect(result).toMatchObject({ isRuleActive: false, required: 0, standing: 'met' })
    expect(result.slots).toHaveLength(3)
  })

  it('applies as soon as 4 practices count, pre-season ones included', () => {
    const practices = [
      practice('pre1', '2027-03-15'),
      practice('pre2', '2027-03-22'),
      practice('wk1', '2027-03-31'),
      practice('wk2', '2027-04-07', { isRecorded: false }),
    ]
    const result = status({
      practices,
      attendedPracticeIds: new Set(['pre1']),
      matchDate: day('2027-04-10'),
      today: day('2027-04-05'),
      seasonStart: day('2027-03-15'),
    })

    expect(result).toMatchObject({
      isRuleActive: true,
      required: 2,
      attended: 1,
      open: 1,
      standing: 'possible',
    })
  })
})

describe('getCountdown', () => {
  it('says nothing more is needed once the rule is met', () => {
    expect(getCountdown(status({ attendedPracticeIds: new Set(['p2', 'p4']) }))).toEqual({
      kind: 'met',
    })
  })

  it('says how many of the open practices are still needed', () => {
    const practices = PRACTICES.map((p) =>
      ['p3', 'p4'].includes(p.id) ? { ...p, isRecorded: false } : p,
    )

    // Missed one of four: attend 2 of the next 3.
    expect(getCountdown(status({ practices, today: day('2027-04-22') }))).toEqual({
      kind: 'needs',
      needed: 2,
      of: 3,
    })
  })

  it('says when the rule can no longer be met for this match', () => {
    expect(getCountdown(status())).toEqual({ kind: 'out' })
  })
})
