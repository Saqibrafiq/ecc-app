import { describe, expect, it } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

import { buildLedger, type LedgerInput, type LedgerMatch } from './build-ledger'

const practice = (
  id: number,
  date: string,
  extra: { isRecorded?: boolean; isCancelled?: boolean } = {},
) => ({
  id: `practice-${String(id)}`,
  date: day(date),
  isRecorded: extra.isRecorded ?? true,
  isCancelled: extra.isCancelled ?? false,
})

const match = (
  date: string,
  isHome: boolean,
  answer: LedgerMatch['answer'],
  closesAt = `${date}T00:00:00Z`,
): LedgerMatch => ({ date: day(date), isHome, answer, closesAt: new Date(closesAt) })

function input(overrides: Partial<LedgerInput> = {}): LedgerInput {
  return {
    team: { id: '1', name: 'ECC I' },
    now: new Date('2026-11-09T09:00:00Z'),
    today: day('2026-11-09'),
    seasonStart: day('2026-01-01'),
    practices: [
      practice(1, '2026-10-14'),
      practice(2, '2026-10-21'),
      practice(3, '2026-10-28'),
      practice(4, '2026-11-04'),
      practice(5, '2026-11-11', { isRecorded: false }),
      practice(6, '2026-09-30', { isCancelled: true }),
    ],
    attendedPracticeIds: new Set(['practice-1', 'practice-3']),
    corrections: new Map([['practice-2', 'requested']]),
    matches: [
      match('2026-10-17', false, 'going'),
      match('2026-10-24', false, null),
      match('2026-10-31', true, 'not-going'),
      match('2026-11-14', false, null, '2026-11-10T22:59:59Z'),
    ],
    isCaptain: false,
    targetsStartOn: null,
    ...overrides,
  }
}

describe('buildLedger', () => {
  it('lists the season’s practices by month, newest first, with their outcome', () => {
    const { months, season } = buildLedger(input())

    expect(season).toBe('2026')
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10', '2026-09'])
    expect(months[0]?.practices.map((p) => [p.practiceId, p.outcome])).toEqual([
      [5, 'upcoming'],
      [4, 'missed'],
    ])
    expect(months[2]?.practices[0]?.outcome).toBe('cancelled')
  })

  it('offers a correction for a missed practice without a request', () => {
    const october = buildLedger(input()).months[1]?.practices ?? []

    expect(
      october.map((p) => [p.practiceId, p.outcome, p.correction, p.canRequestCorrection]),
    ).toEqual([
      [3, 'attended', null, false],
      [2, 'missed', 'requested', false],
      [1, 'attended', null, false],
    ])
    expect(buildLedger(input()).months[0]?.practices[1]?.canRequestCorrection).toBe(true)
  })

  it('shows a practice the captain has not recorded yet as such', () => {
    const ledger = buildLedger(input({ today: day('2026-11-12') }))

    expect(ledger.months[0]?.practices[0]?.outcome).toBe('unrecorded')
  })

  it('gives the attendance standing for the team’s next match', () => {
    const { standing } = buildLedger(input())

    expect(standing).toMatchObject({
      matchDate: '2026-11-14',
      attended: 1,
      required: 2,
      isRuleActive: true,
      standing: 'possible',
      stillNeeded: 1,
    })
    expect(standing.slots.map((slot) => [slot.practiceId, slot.outcome])).toEqual([
      [2, 'missed'],
      [3, 'attended'],
      [4, 'missed'],
      [5, 'upcoming'],
    ])
  })

  it('falls back to today without a match left this season', () => {
    const { standing } = buildLedger(input({ matches: [] }))

    expect(standing.matchDate).toBeNull()
  })

  it('counts the away target over closed away matches, the open ones still to come', () => {
    const [away] = buildLedger(input()).targets

    expect(away).toMatchObject({
      kind: 'away',
      available: 1,
      upcoming: 1,
      required: 2,
      standing: 'on-track',
    })
  })

  it('counts only matches from the day the Board set for the targets', () => {
    const targets = buildLedger(
      input({ isCaptain: true, targetsStartOn: day('2026-10-24') }),
    ).targets

    expect(targets[0]).toMatchObject({ kind: 'away', available: 0, upcoming: 1, required: 1 })
    expect(targets[1]).toMatchObject({ kind: 'captain', available: 0, upcoming: 1, required: 3 })
  })

  it('adds the 80 % target on all matches for a captain', () => {
    const targets = buildLedger(input({ isCaptain: true })).targets

    expect(targets.map((t) => t.kind)).toEqual(['away', 'captain'])
    expect(targets[1]).toMatchObject({ available: 1, upcoming: 1, required: 4, standing: 'missed' })
  })

  it('leaves out practices from before the season', () => {
    const old = practice(9, '2025-12-10')
    const ledger = buildLedger(input({ practices: [old], attendedPracticeIds: new Set() }))

    expect(ledger.months).toEqual([])
    expect(ledger.standing.matchDate).toBe('2026-11-14')
  })
})
