import { describe, expect, it } from 'vitest'

import { getAwayAvailabilityTarget, getCaptainAvailabilityTarget } from './availability-target'

describe('getAwayAvailabilityTarget', () => {
  it('is met once half of the season’s away matches are covered', () => {
    // 8 away matches in the season: 4 needed; available for 4 of the 5 played so far.
    expect(getAwayAvailabilityTarget({ available: 4, closed: 5, upcoming: 3 })).toEqual({
      motion: '2023/06',
      share: 0.5,
      required: 4,
      available: 4,
      stillNeeded: 0,
      upcoming: 3,
      standing: 'met',
    })
  })

  it('says how many of the remaining away matches are still needed', () => {
    // 8 away matches: 4 needed; available for 2 so far, 4 still to come.
    expect(getAwayAvailabilityTarget({ available: 2, closed: 4, upcoming: 4 })).toMatchObject({
      required: 4,
      stillNeeded: 2,
      standing: 'on-track',
    })
  })

  it('rounds the requirement up for an odd number of away matches', () => {
    expect(getAwayAvailabilityTarget({ available: 0, closed: 0, upcoming: 7 }).required).toBe(4)
  })

  it('is missed when the remaining away matches can no longer make up the difference', () => {
    expect(getAwayAvailabilityTarget({ available: 0, closed: 6, upcoming: 2 })).toMatchObject({
      stillNeeded: 4,
      standing: 'missed',
    })
  })
})

describe('getCaptainAvailabilityTarget', () => {
  it('asks captains for 80 % of all matches', () => {
    // 14 matches: 12 needed (80 % rounded up); available for 9 of 10 so far, 4 to come.
    expect(getCaptainAvailabilityTarget({ available: 9, closed: 10, upcoming: 4 })).toMatchObject({
      motion: '2023/05',
      share: 0.8,
      required: 12,
      stillNeeded: 3,
      standing: 'on-track',
    })
  })
})
