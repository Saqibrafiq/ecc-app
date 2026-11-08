import { describe, expect, it } from 'vitest'

import { type TeamPractice, toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'

import type { ScheduledEvent, Team } from '../types'
import { buildWeek, type WeekInput } from './build-week'

const ECC_I: Team = { id: 'ecc-1', name: 'ECC I' }
const ECC_II: Team = { id: 'ecc-2', name: 'ECC II' }

const MATCH: ScheduledEvent = {
  id: 'm1',
  kind: 'match',
  team: ECC_I,
  date: day('2027-05-08'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'Nürnberg CC',
  competition: 'BCV Regionalliga',
  overs: 20,
  isHome: false,
}
const PRACTICE: ScheduledEvent = {
  id: 'p-week',
  kind: 'practice',
  team: ECC_I,
  date: day('2027-05-05'),
  startTime: time('18:30'),
  ground: 'Erlangen',
}
const OTHER_MATCH: ScheduledEvent = { ...MATCH, id: 'm2', team: ECC_II, date: day('2027-05-09') }

const PRACTICES: TeamPractice[] = [
  { id: 'p1', date: day('2027-04-21'), isCancelled: false, isRecorded: true },
  { id: 'p2', date: day('2027-04-28'), isCancelled: false, isRecorded: true },
  { id: 'p3', date: day('2027-04-30'), isCancelled: false, isRecorded: true },
  { id: 'p-week', date: day('2027-05-05'), isCancelled: false, isRecorded: false },
]

function week(overrides: Partial<WeekInput> = {}) {
  return buildWeek({
    // Monday 3 May 2027, 10:00 in Erlangen.
    now: new Date('2027-05-03T08:00:00Z'),
    ownTeam: ECC_I,
    events: [OTHER_MATCH, MATCH, PRACTICE],
    answers: {},
    practices: PRACTICES,
    attendedPracticeIds: new Set(['p1', 'p3']),
    seasonStart: day('2027-03-15'),
    ...overrides,
  })
}

describe('buildWeek', () => {
  it('lays out Monday to Sunday with today and the own team’s events marked', () => {
    const { days, today } = week()

    expect(today).toBe('2027-05-03')
    expect(days.map((d) => d.date)).toEqual([
      '2027-05-03',
      '2027-05-04',
      '2027-05-05',
      '2027-05-06',
      '2027-05-07',
      '2027-05-08',
      '2027-05-09',
    ])
    expect(days.find((d) => d.isToday)?.date).toBe('2027-05-03')
    expect(days[2]?.markers).toEqual(['practice'])
    expect(days[5]?.markers).toEqual(['match'])
    // ECC II's Sunday match is not one of the member's own markers.
    expect(days[6]?.markers).toEqual([])
  })

  it('puts the own team first, in date order, and the other team below', () => {
    const { ownEvents, otherEvents } = week()

    expect(ownEvents.map((e) => e.id)).toEqual(['p-week', 'm1'])
    expect(otherEvents.map((e) => e.id)).toEqual(['m2'])
  })

  it('gives each event its deadline from the club rules', () => {
    const { ownEvents } = week()
    const [practice, match] = ownEvents

    // Practice: 12 hours before 18:30 → 06:30 CEST. Match: end of Tuesday.
    expect(practice?.closesAt).toBe('2027-05-05T04:30:00.000Z')
    expect(match?.closesAt).toBe('2027-05-04T21:59:59.999Z')
    expect(match?.isOpen).toBe(true)
  })

  it('follows an admin’s deadline extension', () => {
    const { ownEvents } = week({ events: [{ ...MATCH, deadlineDay: 'thursday' }] })

    expect(ownEvents[0]?.closesAt).toBe('2027-05-06T21:59:59.999Z')
  })

  it('counts the open own-team events still without an answer', () => {
    expect(week().openAnswers).toBe(2)
    expect(week({ answers: { m1: { answer: 'going', reason: null } } }).openAnswers).toBe(1)
  })

  it('carries the member’s answer and reason', () => {
    const { ownEvents } = week({
      answers: { 'p-week': { answer: 'not-going', reason: 'Working late' } },
    })

    expect(ownEvents[0]).toMatchObject({ answer: 'not-going', reason: 'Working late' })
  })

  it('does not count an event whose answers have closed', () => {
    // Wednesday 12:00: the practice (closed 06:30) and the match (closed Tuesday) no longer count.
    const result = week({ now: new Date('2027-05-05T10:00:00Z') })

    expect(result.ownEvents.every((event) => !event.isOpen)).toBe(true)
    expect(result.openAnswers).toBe(0)
  })

  it('shows the attendance standing for the next match', () => {
    const { attendance } = week()

    expect(attendance).toMatchObject({
      attended: 2,
      required: 2,
      isRuleActive: true,
      standing: 'met',
      countdown: { kind: 'met' },
    })
    expect(attendance?.slots.map((slot) => slot.outcome)).toEqual([
      'attended',
      'missed',
      'attended',
      'upcoming',
    ])
  })

  it('has no attendance standing in a week without a match', () => {
    expect(week({ events: [PRACTICE] }).attendance).toBeNull()
  })
})
