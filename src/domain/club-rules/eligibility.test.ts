import { describe, expect, it } from 'vitest'

import { type EligibilityInput, getEligibility, REASON_MOTIONS } from './eligibility'

function eligibility(overrides: Partial<EligibilityInput> = {}) {
  return getEligibility({
    isFirstTeam: false,
    isEcc1Eligible: false,
    attendance: 'met',
    missedPreviousMatch: false,
    isCarriedOver: false,
    hasException: false,
    ...overrides,
  })
}

describe('getEligibility', () => {
  it('lets the captain pick a player who met the attendance rule', () => {
    expect(eligibility()).toEqual({ verdict: 'selectable', reasons: [], override: null })
  })

  it('makes a player conditional while the practice still to come can decide it', () => {
    expect(eligibility({ attendance: 'possible' }).verdict).toBe('conditional')
  })

  it('blocks a player who can no longer meet the attendance rule', () => {
    expect(eligibility({ attendance: 'out' })).toEqual({
      verdict: 'not-selectable',
      reasons: ['attendance'],
      override: null,
    })
  })

  it('blocks ECC I selection without the ECC I flag', () => {
    expect(eligibility({ isFirstTeam: true }).reasons).toEqual(['not-ecc1-eligible'])
  })

  it('allows ECC I selection with the ECC I flag', () => {
    expect(eligibility({ isFirstTeam: true, isEcc1Eligible: true }).verdict).toBe('selectable')
  })

  it('lists every reason at once', () => {
    expect(eligibility({ isFirstTeam: true, attendance: 'out' }).reasons).toEqual([
      'attendance',
      'not-ecc1-eligible',
    ])
  })

  it("lets an admin's exception override the rules, and still shows what it overrides", () => {
    expect(eligibility({ isFirstTeam: true, attendance: 'out', hasException: true })).toEqual({
      verdict: 'selectable',
      reasons: ['attendance', 'not-ecc1-eligible'],
      override: 'exception',
    })
  })

  it("makes last match's 12th man or reserve selectable without any process", () => {
    expect(eligibility({ attendance: 'out', isCarriedOver: true })).toEqual({
      verdict: 'selectable',
      reasons: ['attendance'],
      override: 'carry-over',
    })
  })

  it('names the carry-over when a player is also an exception', () => {
    expect(eligibility({ isCarriedOver: true, hasException: true }).override).toBe('carry-over')
  })

  it('leaves out of this match a player who was selected for the last one and did not appear', () => {
    expect(eligibility({ missedPreviousMatch: true })).toEqual({
      verdict: 'not-selectable',
      reasons: ['no-show'],
      override: null,
    })
  })
})

describe('REASON_MOTIONS', () => {
  it('names the General Meeting motion behind every reason', () => {
    expect(REASON_MOTIONS).toEqual({
      attendance: '2023/01',
      'not-ecc1-eligible': '2024/06',
      'no-show': '2023/10',
    })
  })
})
