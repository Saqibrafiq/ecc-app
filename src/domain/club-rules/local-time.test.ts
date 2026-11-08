import { describe, expect, it } from 'vitest'

import {
  addDays,
  daysBetween,
  endOfLocalDay,
  getLocalDate,
  getWeekday,
  isLocalDate,
  isLocalTime,
  startOfWeek,
  toInstant,
  toLocalDate,
  toLocalTime,
} from './local-time'

const day = toLocalDate
const time = toLocalTime

describe('isLocalDate', () => {
  it('accepts a real calendar day', () => {
    expect(isLocalDate('2027-05-08')).toBe(true)
    expect(isLocalDate('2028-02-29')).toBe(true)
  })

  it.each(['2027-02-29', '2027-13-01', '2027-04-31', '2027-5-8', '08.05.2027', ''])(
    'rejects %j',
    (value) => {
      expect(isLocalDate(value)).toBe(false)
    },
  )
})

describe('isLocalTime', () => {
  it.each(['00:00', '09:05', '18:30', '23:59'])('accepts %s', (value) => {
    expect(isLocalTime(value)).toBe(true)
  })

  it.each(['24:00', '18:60', '9:30', '18.30'])('rejects %s', (value) => {
    expect(isLocalTime(value)).toBe(false)
  })
})

describe('toLocalDate / toLocalTime', () => {
  it('fails fast on invalid input', () => {
    expect(() => toLocalDate('2027-02-30')).toThrow(RangeError)
    expect(() => toLocalTime('25:00')).toThrow(RangeError)
  })
})

describe('calendar arithmetic', () => {
  it('adds days across month and year ends', () => {
    expect(addDays(day('2026-12-30'), 3)).toBe('2027-01-02')
    expect(addDays(day('2027-03-01'), -1)).toBe('2027-02-28')
  })

  it('counts whole days, even across a clock change', () => {
    expect(daysBetween(day('2027-03-25'), day('2027-03-28'))).toBe(3)
    expect(daysBetween(day('2027-03-28'), day('2027-03-25'))).toBe(-3)
  })

  it('finds the Monday of the week, with Sunday as the last day', () => {
    expect(startOfWeek(day('2027-05-09'))).toBe('2027-05-03')
    expect(startOfWeek(day('2027-05-03'))).toBe('2027-05-03')
    expect(startOfWeek(day('2027-05-06'))).toBe('2027-05-03')
  })

  it('knows the weekday', () => {
    expect(getWeekday(day('2027-05-08'))).toBe('saturday')
    expect(getWeekday(day('2027-05-09'))).toBe('sunday')
    expect(getWeekday(day('2027-05-05'))).toBe('wednesday')
  })
})

describe('getLocalDate', () => {
  it('gives the Erlangen day of an instant, which can differ from the UTC day', () => {
    // 23:30 UTC on 8 May is already 9 May in Erlangen (CEST, UTC+2).
    expect(getLocalDate(new Date('2027-05-08T23:30:00Z'))).toBe('2027-05-09')
  })
})

describe('toInstant', () => {
  it('converts summer time (CEST, UTC+2)', () => {
    expect(toInstant(day('2027-04-01'), time('18:30')).toISOString()).toBe(
      '2027-04-01T16:30:00.000Z',
    )
  })

  it('converts winter time (CET, UTC+1)', () => {
    expect(toInstant(day('2027-03-25'), time('18:30')).toISOString()).toBe(
      '2027-03-25T17:30:00.000Z',
    )
  })

  it('handles the day the clocks go forward (last Sunday in March)', () => {
    expect(toInstant(day('2027-03-28'), time('01:00')).toISOString()).toBe(
      '2027-03-28T00:00:00.000Z',
    )
    expect(toInstant(day('2027-03-28'), time('11:00')).toISOString()).toBe(
      '2027-03-28T09:00:00.000Z',
    )
  })

  it('handles the day the clocks go back (last Sunday in October)', () => {
    expect(toInstant(day('2026-10-25'), time('11:00')).toISOString()).toBe(
      '2026-10-25T10:00:00.000Z',
    )
  })

  it('works for zones west of UTC and for UTC itself', () => {
    expect(toInstant(day('2027-01-15'), time('09:00'), 'America/New_York').toISOString()).toBe(
      '2027-01-15T14:00:00.000Z',
    )
    expect(toInstant(day('2027-01-15'), time('09:00'), 'UTC').toISOString()).toBe(
      '2027-01-15T09:00:00.000Z',
    )
  })
})

describe('endOfLocalDay', () => {
  it('is the last millisecond of the local day', () => {
    expect(endOfLocalDay(day('2027-05-04')).toISOString()).toBe('2027-05-04T21:59:59.999Z')
  })

  it('follows the clock change when the next day starts in winter time', () => {
    // Saturday 24 Oct 2026 is still summer time; the night it ends, clocks go back.
    expect(endOfLocalDay(day('2026-10-24')).toISOString()).toBe('2026-10-24T21:59:59.999Z')
    expect(endOfLocalDay(day('2026-10-25')).toISOString()).toBe('2026-10-25T22:59:59.999Z')
  })
})
