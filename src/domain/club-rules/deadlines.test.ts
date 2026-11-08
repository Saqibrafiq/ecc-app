import { describe, expect, it } from 'vitest'

import {
  getAvailabilityDeadline,
  getPracticeDeadline,
  getSelectionDeadline,
  isOpen,
} from './deadlines'
import { toLocalDate as day, toLocalTime as time } from './local-time'

describe('getAvailabilityDeadline', () => {
  it('closes at the end of Tuesday of the match week by default', () => {
    // Saturday 8 May 2027 → Tuesday 4 May, 23:59:59.999 CEST.
    expect(getAvailabilityDeadline(day('2027-05-08')).toISOString()).toBe(
      '2027-05-04T21:59:59.999Z',
    )
  })

  it('uses the same Tuesday for a Sunday match', () => {
    expect(getAvailabilityDeadline(day('2027-05-09')).toISOString()).toBe(
      '2027-05-04T21:59:59.999Z',
    )
  })

  it('moves to the end of Wednesday or Thursday when the admin extends it', () => {
    expect(getAvailabilityDeadline(day('2027-05-08'), 'wednesday').toISOString()).toBe(
      '2027-05-05T21:59:59.999Z',
    )
    expect(getAvailabilityDeadline(day('2027-05-08'), 'thursday').toISOString()).toBe(
      '2027-05-06T21:59:59.999Z',
    )
  })

  it('closes the day before a match that is on or before the deadline day', () => {
    // A Tuesday match: availability closes at the end of Monday.
    expect(getAvailabilityDeadline(day('2027-05-04')).toISOString()).toBe(
      '2027-05-03T21:59:59.999Z',
    )
    // A Wednesday match with a Thursday extension still closes on Tuesday night.
    expect(getAvailabilityDeadline(day('2027-05-05'), 'thursday').toISOString()).toBe(
      '2027-05-04T21:59:59.999Z',
    )
  })

  it('uses winter time in the week before the clocks go forward', () => {
    // Sunday 28 March 2027: clocks go forward that morning; Tuesday 23 March is still CET.
    expect(getAvailabilityDeadline(day('2027-03-28')).toISOString()).toBe(
      '2027-03-23T22:59:59.999Z',
    )
  })

  it('uses summer time in the week before the clocks go back', () => {
    // Sunday 25 October 2026: clocks go back that night; Tuesday 20 October is still CEST.
    expect(getAvailabilityDeadline(day('2026-10-25')).toISOString()).toBe(
      '2026-10-20T21:59:59.999Z',
    )
  })
})

describe('getSelectionDeadline', () => {
  it('announces teams by the end of Thursday, after the practice, for Saturday and Sunday matches', () => {
    expect(getSelectionDeadline(day('2027-05-08')).toISOString()).toBe('2027-05-06T21:59:59.999Z')
    expect(getSelectionDeadline(day('2027-05-09')).toISOString()).toBe('2027-05-06T21:59:59.999Z')
  })

  it('selects by the day before a match early in the week', () => {
    expect(getSelectionDeadline(day('2027-05-06')).toISOString()).toBe('2027-05-05T21:59:59.999Z')
  })
})

describe('getPracticeDeadline', () => {
  it('closes 12 hours before the practice starts', () => {
    // Wednesday 18:30 practice → answers close at 06:30 that morning (CEST).
    expect(getPracticeDeadline(day('2027-05-05'), time('18:30')).toISOString()).toBe(
      '2027-05-05T04:30:00.000Z',
    )
  })

  it('reaches into the day before for a morning practice', () => {
    // Saturday 10:00 practice → answers close at 22:00 on Friday.
    expect(getPracticeDeadline(day('2027-05-08'), time('10:00')).toISOString()).toBe(
      '2027-05-07T20:00:00.000Z',
    )
  })
})

describe('isOpen', () => {
  const deadline = new Date('2027-05-04T21:59:59.999Z')

  it('accepts answers up to and including the deadline', () => {
    expect(isOpen(new Date('2027-05-04T21:00:00Z'), deadline)).toBe(true)
    expect(isOpen(deadline, deadline)).toBe(true)
  })

  it('rejects answers after the deadline', () => {
    expect(isOpen(new Date('2027-05-04T22:00:00Z'), deadline)).toBe(false)
  })
})
