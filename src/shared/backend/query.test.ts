import { describe, expect, it } from 'vitest'

import { dayStart, toQuery } from './query'

describe('toQuery', () => {
  it('encodes Payload where clauses after the default limit', () => {
    expect(toQuery({ 'where[team][equals]': '1' })).toBe('?limit=300&where%5Bteam%5D%5Bequals%5D=1')
  })

  it('lets a caller set its own limit', () => {
    expect(toQuery({ limit: '1' })).toBe('?limit=1')
  })
})

describe('dayStart', () => {
  it('is midnight UTC of the day', () => {
    expect(dayStart('2026-11-09')).toBe('2026-11-09T00:00:00.000Z')
  })
})
