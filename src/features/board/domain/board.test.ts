import { describe, expect, it } from 'vitest'

import type { Candidate, SquadStatus } from '@/features/team'

import {
  canApprove,
  canChangeRules,
  canSendBack,
  compareByUrgency,
  getBlocked,
  toggleException,
  toSquadList,
} from './board'

const STATUSES: SquadStatus[] = ['open', 'submitted', 'returned', 'approved']

describe('what the Board may do with a squad', () => {
  it('approves only a handed-in squad', () => {
    expect(STATUSES.filter(canApprove)).toEqual(['submitted'])
  })

  it('sends back a handed-in or announced squad', () => {
    expect(STATUSES.filter(canSendBack)).toEqual(['submitted', 'approved'])
  })

  it('changes the deadline and exceptions until the squad is announced', () => {
    expect(STATUSES.filter(canChangeRules)).toEqual(['open', 'submitted', 'returned'])
  })
})

describe('compareByUrgency', () => {
  const match = (squadStatus: SquadStatus, date: string) => ({ squadStatus, event: { date } })

  it('puts squads waiting for approval first, then by date', () => {
    const sorted = [
      match('approved', '2026-11-14'),
      match('open', '2026-11-15'),
      match('submitted', '2026-11-15'),
      match('returned', '2026-11-14'),
      match('submitted', '2026-11-14'),
    ].sort(compareByUrgency)

    expect(sorted).toEqual([
      match('submitted', '2026-11-14'),
      match('submitted', '2026-11-15'),
      match('returned', '2026-11-14'),
      match('open', '2026-11-15'),
      match('approved', '2026-11-14'),
    ])
  })
})

const candidate = (id: string, reasons: Candidate['eligibility']['reasons']): Candidate => ({
  id,
  name: `Player ${id}`,
  answer: 'going',
  eligibility: {
    verdict: reasons.length > 0 ? 'not-selectable' : 'selectable',
    reasons,
    override: null,
  },
  attendance: { attended: 2, required: 2, isRuleActive: true },
  isCarriedOver: false,
})

describe('getBlocked', () => {
  it('lists the going players a rule is against', () => {
    expect(
      getBlocked([
        candidate('1', []),
        candidate('2', ['no-show']),
        candidate('3', ['attendance']),
      ]).map((c) => c.id),
    ).toEqual(['2', '3'])
  })
})

describe('toggleException', () => {
  it('adds or removes one player and keeps the others', () => {
    expect(toggleException(['2'], '3', true)).toEqual(['2', '3'])
    expect(toggleException(['2', '3'], '2', false)).toEqual(['3'])
    expect(toggleException(['2'], '2', true)).toEqual(['2'])
  })
})

describe('toSquadList', () => {
  it('orders the XI as picked, then the 12th man, then reserves, with names', () => {
    expect(
      toSquadList(
        [
          { playerId: '3', role: 'reserve' },
          { playerId: '1', role: 'twelfth' },
          { playerId: '2', role: 'playing' },
          { playerId: '4', role: 'playing' },
        ],
        { '1': 'Ali', '2': 'Bilal', '3': 'Omar' },
      ),
    ).toEqual([
      { playerId: '2', role: 'playing', name: 'Bilal' },
      { playerId: '4', role: 'playing', name: '' },
      { playerId: '1', role: 'twelfth', name: 'Ali' },
      { playerId: '3', role: 'reserve', name: 'Omar' },
    ])
  })
})
