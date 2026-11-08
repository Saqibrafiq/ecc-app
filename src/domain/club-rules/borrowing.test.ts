import { describe, expect, it } from 'vitest'

import { checkBorrowing } from './borrowing'

describe('checkBorrowing', () => {
  it('allows borrowing when the squad cannot field an XI and the other captain agrees', () => {
    expect(checkBorrowing({ ownAvailable: 9, hasOtherCaptainAgreed: true })).toEqual({
      isAllowed: true,
      problems: [],
    })
  })

  it('does not allow borrowing while the own squad can field an XI', () => {
    expect(checkBorrowing({ ownAvailable: 11, hasOtherCaptainAgreed: true }).problems).toEqual([
      'own-squad-can-field-xi',
    ])
  })

  it("needs the other captain's agreement", () => {
    expect(checkBorrowing({ ownAvailable: 9, hasOtherCaptainAgreed: false }).problems).toEqual([
      'other-captain-not-agreed',
    ])
  })

  it('lists both problems at once', () => {
    expect(checkBorrowing({ ownAvailable: 12, hasOtherCaptainAgreed: false })).toEqual({
      isAllowed: false,
      problems: ['own-squad-can-field-xi', 'other-captain-not-agreed'],
    })
  })
})
