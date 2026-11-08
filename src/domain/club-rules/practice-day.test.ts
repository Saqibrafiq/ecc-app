import { describe, expect, it } from 'vitest'

import { toLocalDate as day } from './local-time'
import { getPracticeDate, planPractices } from './practice-day'

describe('getPracticeDate', () => {
  it('puts practice on the Wednesday before a Saturday match', () => {
    expect(getPracticeDate(day('2027-05-08'))).toBe('2027-05-05')
  })

  it('puts practice on the Thursday before a Sunday match', () => {
    expect(getPracticeDate(day('2027-05-09'))).toBe('2027-05-06')
  })

  it('creates no practice for a match on a weekday', () => {
    expect(getPracticeDate(day('2027-05-05'))).toBeNull()
  })

  it('stays on the right day in the week the clocks go forward', () => {
    expect(getPracticeDate(day('2027-03-28'))).toBe('2027-03-25')
  })
})

describe('planPractices', () => {
  it('plans one practice per team for its weekend match', () => {
    expect(
      planPractices([
        { id: 'f1', teamId: 'ecc-1', date: day('2027-05-08') },
        { id: 'f2', teamId: 'ecc-2', date: day('2027-05-09') },
      ]),
    ).toEqual([
      { teamId: 'ecc-1', date: '2027-05-05', fixtureId: 'f1' },
      { teamId: 'ecc-2', date: '2027-05-06', fixtureId: 'f2' },
    ])
  })

  it('plans a single practice, before the first match, for a team playing Saturday and Sunday', () => {
    expect(
      planPractices([
        { id: 'sun', teamId: 'ecc-1', date: day('2027-05-09') },
        { id: 'sat', teamId: 'ecc-1', date: day('2027-05-08') },
      ]),
    ).toEqual([{ teamId: 'ecc-1', date: '2027-05-05', fixtureId: 'sat' }])
  })

  it('plans a practice in each week a team plays at the weekend', () => {
    expect(
      planPractices([
        { id: 'w1', teamId: 'ecc-1', date: day('2027-05-08') },
        { id: 'w2', teamId: 'ecc-1', date: day('2027-05-15') },
      ]).map((practice) => practice.date),
    ).toEqual(['2027-05-05', '2027-05-12'])
  })

  it('plans nothing for weekday matches or no matches', () => {
    expect(planPractices([{ id: 'f', teamId: 'ecc-1', date: day('2027-05-05') }])).toEqual([])
    expect(planPractices([])).toEqual([])
  })
})
