import { describe, expect, it } from 'vitest'

import { cn } from './cn'

describe('cn', () => {
  it('joins class names and drops falsy ones', () => {
    expect(cn('px-4', false, undefined, 'py-2')).toBe('px-4 py-2')
  })

  it('lets a later Tailwind class override an earlier one', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })
})
