import { describe, expect, it } from 'vitest'

import { type SquadPick, toLocalDate as day } from '@/domain/club-rules'
import type { Answer } from '@/features/week'

import type { Candidate } from '../types'
import {
  buildCandidates,
  type CandidateInput,
  countRole,
  getInitialPicks,
  getNextRole,
  isFirstTeam,
  isPickable,
  togglePick,
} from './selection'

const playing = (count: number): SquadPick[] =>
  Array.from({ length: count }, (_, index) => ({ playerId: `p${String(index)}`, role: 'playing' }))

describe('getNextRole', () => {
  it('fills the XI, then the 12th man, then reserves', () => {
    expect(getNextRole([])).toBe('playing')
    expect(getNextRole(playing(10))).toBe('playing')
    expect(getNextRole(playing(11))).toBe('twelfth')
    expect(getNextRole([...playing(11), { playerId: 't', role: 'twelfth' }])).toBe('reserve')
  })
})

describe('togglePick', () => {
  it('adds a player in the next open role and takes a picked one out', () => {
    const withEleven = togglePick(playing(10), 'new')
    expect(withEleven.at(-1)).toEqual({ playerId: 'new', role: 'playing' })
    expect(countRole(withEleven, 'playing')).toBe(11)

    expect(togglePick(withEleven, 'twelfth').at(-1)).toEqual({
      playerId: 'twelfth',
      role: 'twelfth',
    })
    expect(togglePick(withEleven, 'p3')).toHaveLength(10)
  })

  it('refills the XI before reserves when an XI player is taken out', () => {
    const full = [...playing(11), { playerId: 't', role: 'twelfth' as const }]
    const withoutOne = togglePick(full, 'p0')

    expect(togglePick(withoutOne, 'next').at(-1)).toEqual({ playerId: 'next', role: 'playing' })
  })
})

const ECC_I_PRACTICES = [
  { id: 'practice-1', date: day('2026-10-21'), isCancelled: false, isRecorded: true },
  { id: 'practice-2', date: day('2026-10-28'), isCancelled: false, isRecorded: true },
  { id: 'practice-3', date: day('2026-11-04'), isCancelled: false, isRecorded: true },
  { id: 'practice-4', date: day('2026-11-11'), isCancelled: false, isRecorded: false },
]

function input(overrides: Partial<CandidateInput> = {}): CandidateInput {
  return {
    players: [
      { id: '1', name: 'Saqib Rafiq', isEcc1Eligible: true },
      { id: '2', name: 'Ali Shaan', isEcc1Eligible: true },
      { id: '3', name: 'Bilal Mir', isEcc1Eligible: true },
      { id: '4', name: 'Omar Farooq', isEcc1Eligible: true },
      { id: '5', name: 'Usman Khan', isEcc1Eligible: false },
      { id: '6', name: 'Danish Ali', isEcc1Eligible: true },
      { id: '7', name: 'Zain Malik', isEcc1Eligible: true },
    ],
    answers: new Map<string, Answer>([
      ['1', 'going'],
      ['3', 'going'],
      ['4', 'going'],
      ['5', 'going'],
      ['6', 'not-going'],
    ]),
    isFirstTeam: true,
    practices: ECC_I_PRACTICES,
    attendedByPlayer: new Map([
      ['1', new Set(['practice-1', 'practice-3'])],
      ['2', new Set(['practice-2', 'practice-3'])],
      ['3', new Set(['practice-3'])],
      ['4', new Set(['practice-1', 'practice-2'])],
      ['5', new Set(['practice-1', 'practice-2', 'practice-3'])],
    ]),
    carryOvers: ['2', '6'],
    noShows: new Set(['4']),
    exceptions: new Set(),
    matchDate: day('2026-11-14'),
    today: day('2026-11-11'),
    seasonStart: day('2026-01-01'),
    ...overrides,
  }
}

describe('buildCandidates', () => {
  it('shows who said Going and the carried-over players who did not say Not going', () => {
    const candidates = buildCandidates(input())

    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'Ali Shaan',
      'Saqib Rafiq',
      'Bilal Mir',
      'Omar Farooq',
      'Usman Khan',
    ])
  })

  it('gives each their eligibility, attendance and carry-over', () => {
    const byName = new Map(buildCandidates(input()).map((c) => [c.name, c]))

    expect(byName.get('Ali Shaan')).toMatchObject({
      answer: null,
      isCarriedOver: true,
      eligibility: { verdict: 'selectable', override: 'carry-over' },
    })
    expect(byName.get('Saqib Rafiq')).toMatchObject({
      answer: 'going',
      eligibility: { verdict: 'selectable' },
      attendance: { attended: 2, required: 2, isRuleActive: true },
    })
    expect(byName.get('Bilal Mir')?.eligibility.verdict).toBe('conditional')
    expect(byName.get('Omar Farooq')?.eligibility).toMatchObject({
      verdict: 'not-selectable',
      reasons: ['no-show'],
    })
    expect(byName.get('Usman Khan')?.eligibility.reasons).toEqual(['not-ecc1-eligible'])
  })

  it('lets an exception or a lower team set a rule aside', () => {
    const byName = new Map(
      buildCandidates(input({ isFirstTeam: false, exceptions: new Set(['4']) })).map((c) => [
        c.name,
        c,
      ]),
    )

    expect(byName.get('Omar Farooq')?.eligibility.override).toBe('exception')
    expect(byName.get('Usman Khan')?.eligibility.verdict).toBe('selectable')
  })

  it('counts a player without attendance as having attended nothing', () => {
    const [candidate] = buildCandidates(
      input({
        players: [{ id: '9', name: 'New Player', isEcc1Eligible: true }],
        answers: new Map([['9', 'going']]),
      }),
    )

    expect(candidate?.attendance.attended).toBe(0)
  })
})

const candidate = (overrides: Partial<Candidate>): Candidate => ({
  id: '1',
  name: 'Saqib Rafiq',
  answer: 'going',
  eligibility: { verdict: 'selectable', reasons: [], override: null },
  attendance: { attended: 2, required: 2, isRuleActive: true },
  isCarriedOver: false,
  ...overrides,
})

describe('isPickable', () => {
  it('lets the captain tap selectable and possible players only', () => {
    expect(isPickable(candidate({}))).toBe(true)
    expect(
      isPickable(
        candidate({ eligibility: { verdict: 'conditional', reasons: [], override: null } }),
      ),
    ).toBe(true)
    expect(
      isPickable(
        candidate({
          eligibility: { verdict: 'not-selectable', reasons: ['no-show'], override: null },
        }),
      ),
    ).toBe(false)
    expect(isPickable(candidate({ isCarriedOver: true }))).toBe(false)
  })
})

describe('getInitialPicks', () => {
  it('starts from the saved squad', () => {
    const saved: SquadPick[] = [{ playerId: '3', role: 'twelfth' }]

    expect(getInitialPicks(saved, [candidate({ isCarriedOver: true })])).toEqual(saved)
  })

  it('puts the carried-over players in the XI of a new squad', () => {
    expect(
      getInitialPicks([], [candidate({ id: '2', isCarriedOver: true }), candidate({ id: '3' })]),
    ).toEqual([{ playerId: '2', role: 'playing' }])
  })
})

describe('isFirstTeam', () => {
  it('recognises ECC I only', () => {
    expect(isFirstTeam('ECC I')).toBe(true)
    expect(isFirstTeam('ECC II')).toBe(false)
    expect(isFirstTeam('ECC III')).toBe(false)
  })
})
