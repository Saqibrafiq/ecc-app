import { describe, expect, it } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

import { areSelected, canRecordNoShows } from './no-shows'

describe('canRecordNoShows', () => {
  it('opens on the match day and stays open afterwards', () => {
    expect(canRecordNoShows(day('2026-11-14'), day('2026-11-14'))).toBe(true)
    expect(canRecordNoShows(day('2026-11-14'), day('2026-11-20'))).toBe(true)
  })

  it('stays closed before the match is played', () => {
    expect(canRecordNoShows(day('2026-11-14'), day('2026-11-13'))).toBe(false)
  })
})

describe('areSelected', () => {
  it('accepts players who were in the squad', () => {
    expect(areSelected(['1', '3'], ['1', '2', '3'])).toBe(true)
    expect(areSelected([], ['1'])).toBe(true)
  })

  it('refuses anyone who was not selected', () => {
    expect(areSelected(['4'], ['1', '2', '3'])).toBe(false)
    expect(areSelected(['1', '4'], ['1'])).toBe(false)
  })
})
