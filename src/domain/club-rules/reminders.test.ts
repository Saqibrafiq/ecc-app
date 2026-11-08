import { describe, expect, it } from 'vitest'

import { toLocalDate as day } from './local-time'
import { getDueReminderDay, type ReminderInput } from './reminders'

// Week of Saturday 8 May 2027: reminders from Monday 3 May, answers close Tuesday 4 May 23:59 CEST.
function due(now: string, overrides: Partial<ReminderInput> = {}) {
  return getDueReminderDay({
    now: new Date(now),
    firstReminderDay: day('2027-05-03'),
    deadline: new Date('2027-05-04T21:59:59.999Z'),
    hasAnswered: false,
    lastRemindedOn: null,
    ...overrides,
  })
}

describe('getDueReminderDay', () => {
  it('reminds on Monday from 11:00 club time', () => {
    // 09:00 UTC is 11:00 in Erlangen (CEST).
    expect(due('2027-05-03T09:00:00Z')).toBe('2027-05-03')
  })

  it('waits until 11:00', () => {
    expect(due('2027-05-03T08:59:00Z')).toBeNull()
  })

  it('does not remind before the first reminder day', () => {
    expect(due('2027-05-02T12:00:00Z')).toBeNull()
  })

  it('reminds once a day: not again the same day, again the next day', () => {
    expect(due('2027-05-03T15:00:00Z', { lastRemindedOn: day('2027-05-03') })).toBeNull()
    expect(due('2027-05-04T09:30:00Z', { lastRemindedOn: day('2027-05-03') })).toBe('2027-05-04')
  })

  it('stops once the member has answered', () => {
    expect(due('2027-05-04T09:30:00Z', { hasAnswered: true })).toBeNull()
  })

  it('stops once answers have closed', () => {
    expect(due('2027-05-05T09:30:00Z')).toBeNull()
  })

  it('uses winter time before the clocks go forward', () => {
    // Monday 22 March 2027 is CET: 11:00 in Erlangen is 10:00 UTC.
    const input = {
      firstReminderDay: day('2027-03-22'),
      deadline: new Date('2027-03-23T22:59:59.999Z'),
    }
    expect(due('2027-03-22T09:59:00Z', input)).toBeNull()
    expect(due('2027-03-22T10:00:00Z', input)).toBe('2027-03-22')
  })
})
