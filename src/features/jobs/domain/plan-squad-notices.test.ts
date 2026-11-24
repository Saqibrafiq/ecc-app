import { describe, expect, it, vi } from 'vitest'

import { at, MATCH_I, MATCH_II, squad, STAMP, tickInput } from '../test-factories'
import type { TickInput } from '../types'

vi.mock('server-only', () => ({}))

const { planSquadNotices } = await import('./plan-squad-notices')

const plan = (overrides: Partial<TickInput>) =>
  planSquadNotices(tickInput({ now: at('2026-11-12T20:00'), ...overrides }))

describe('planSquadNotices: approval (UC-11)', () => {
  it('tells every Board member a handed-in squad is waiting for them', () => {
    expect(plan({ squads: [squad('fixture-60', 'submitted')] })).toEqual([
      { kind: 'approval', key: `approval:fixture-60:${STAMP}:6`, userId: 6, match: MATCH_I },
      { kind: 'approval', key: `approval:fixture-60:${STAMP}:7`, userId: 7, match: MATCH_I },
    ])
  })

  it('tells them again when the captain hands it in a second time after a return', () => {
    const again = squad('fixture-60', 'submitted', { statusChangedAt: '2026-11-12T18:00:00.000Z' })

    expect(plan({ squads: [again] }).map((item) => item.key)).toEqual([
      'approval:fixture-60:2026-11-12T18:00:00.000Z:6',
      'approval:fixture-60:2026-11-12T18:00:00.000Z:7',
    ])
  })
})

describe('planSquadNotices: returned (UC-11)', () => {
  it("tells the team's captain the Board sent the squad back", () => {
    expect(plan({ squads: [squad('fixture-61', 'returned')] })).toEqual([
      { kind: 'returned', key: `returned:fixture-61:${STAMP}:3`, userId: 3, match: MATCH_II },
    ])
  })
})

describe('planSquadNotices: selection notices (UC-12)', () => {
  const announced = squad('fixture-60', 'approved', {
    picks: [
      { playerId: 101, role: 'playing' },
      // Borrowed from ECC II with both captains' agreement (R-16).
      { playerId: 103, role: 'twelfth' },
      { playerId: 1003, role: 'reserve' },
    ],
  })

  it('tells everyone who said Going whether they were picked, and in which role', () => {
    const due = plan({
      squads: [announced],
      going: new Map([['fixture-60', new Set([101, 102, 103])]]),
    })

    expect(due).toEqual([
      expect.objectContaining({ kind: 'announcement', userId: 1, role: 'playing' }),
      expect.objectContaining({ kind: 'announcement', userId: 2, role: null }),
      expect.objectContaining({ kind: 'announcement', userId: 3, role: 'twelfth' }),
    ])
    expect(due[0]).toMatchObject({ key: `announcement:fixture-60:${STAMP}:1`, match: MATCH_I })
  })

  it('tells a picked player even without an answer, and skips players without an account', () => {
    expect(plan({ squads: [announced], going: new Map() }).map((item) => item.userId)).toEqual([
      1, 3,
    ])
  })
})

describe('planSquadNotices: nothing to tell', () => {
  it('stays silent for an open squad, one without a stamp, or a match already played', () => {
    expect(plan({ squads: [squad('fixture-60', 'open')] })).toEqual([])
    expect(plan({ squads: [squad('fixture-60', 'submitted', { statusChangedAt: null })] })).toEqual(
      [],
    )
    expect(
      plan({ now: at('2026-11-15T09:00'), squads: [squad('fixture-60', 'submitted')] }),
    ).toEqual([])
  })

  it("ignores a squad whose match is not among the week's events", () => {
    expect(plan({ squads: [squad('fixture-99', 'submitted')] })).toEqual([])
  })
})
