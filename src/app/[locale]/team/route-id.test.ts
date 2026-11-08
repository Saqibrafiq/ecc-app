import { describe, expect, it } from 'vitest'

import { parseRouteId } from './route-id'

describe('parseRouteId', () => {
  it('reads a positive whole number', () => {
    expect(parseRouteId('12')).toBe(12)
  })

  it('refuses anything else', () => {
    for (const value of ['abc', '0', '-3', '1.5', '']) expect(parseRouteId(value)).toBeNull()
  })
})
