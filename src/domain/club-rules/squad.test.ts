import { describe, expect, it } from 'vitest'

import { checkSquad, getCarryOvers, type SquadPick } from './squad'

function playing(...ids: string[]): SquadPick[] {
  return ids.map((playerId) => ({ playerId, role: 'playing' }))
}

const ELEVEN = playing('p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11')
const TWELFTH: SquadPick = { playerId: 'p12', role: 'twelfth' }

function check(picks: SquadPick[], carryOvers: string[] = [], notGoing: string[] = []) {
  return checkSquad({ picks, carryOvers, notGoing: new Set(notGoing) })
}

describe('getCarryOvers', () => {
  it("carries the 12th man and the reserves into the team's next match", () => {
    const previous: SquadPick[] = [
      ...ELEVEN,
      TWELFTH,
      { playerId: 'r1', role: 'reserve' },
      { playerId: 'r2', role: 'reserve' },
    ]

    expect(getCarryOvers(previous)).toEqual(['p12', 'r1', 'r2'])
  })

  it('carries nobody from a squad of only the playing XI', () => {
    expect(getCarryOvers(ELEVEN)).toEqual([])
  })
})

describe('checkSquad', () => {
  it('accepts a playing XI and a 12th man', () => {
    expect(check([...ELEVEN, TWELFTH])).toEqual({
      isValid: true,
      problems: [],
      forfeitedCarryOvers: [],
    })
  })

  it('accepts reserves on top, e.g. for two games on one day', () => {
    const reserves: SquadPick[] = [
      { playerId: 'r1', role: 'reserve' },
      { playerId: 'r2', role: 'reserve' },
    ]

    expect(check([...ELEVEN, TWELFTH, ...reserves]).isValid).toBe(true)
  })

  it('needs exactly 11 playing', () => {
    expect(check([...ELEVEN.slice(0, 10), TWELFTH]).problems).toEqual([
      { code: 'playing-count', count: 10 },
    ])
    expect(check([...ELEVEN, ...playing('p13'), TWELFTH]).problems).toEqual([
      { code: 'playing-count', count: 12 },
    ])
  })

  it('needs exactly one 12th man', () => {
    expect(check(ELEVEN).problems).toEqual([{ code: 'twelfth-count', count: 0 }])
  })

  it('does not pick anyone twice', () => {
    expect(check([...ELEVEN, { playerId: 'p1', role: 'twelfth' }]).problems).toEqual([
      { code: 'duplicate', playerId: 'p1' },
    ])
  })

  it("requires last match's 12th man and reserves in the playing XI", () => {
    const squad = [...ELEVEN, TWELFTH]

    expect(check(squad, ['p3', 'p12', 'x9']).problems).toEqual([
      { code: 'carry-over-not-playing', playerId: 'p12' },
      { code: 'carry-over-not-playing', playerId: 'x9' },
    ])
  })

  it('lets a carried-over player who answered Not going forfeit the automatic place', () => {
    const result = check([...ELEVEN, TWELFTH], ['x9'], ['x9'])

    expect(result).toEqual({ isValid: true, problems: [], forfeitedCarryOvers: ['x9'] })
  })
})
