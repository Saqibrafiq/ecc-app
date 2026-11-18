import { describe, expect, it } from 'vitest'

import { getInitials } from './initials'

describe('getInitials', () => {
  it('takes the first letters of the first two names', () => {
    expect(getInitials('saqib rafiq')).toBe('SR')
    expect(getInitials('  Ganesh Venkata Rao ')).toBe('GV')
    expect(getInitials('Ullas')).toBe('U')
  })
})
