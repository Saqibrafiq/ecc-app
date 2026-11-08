import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { listOf, relationIdSchema } from './schemas'

describe('backend schemas', () => {
  it('reads a relationship at any depth', () => {
    expect(relationIdSchema.parse(7)).toBe(7)
    expect(relationIdSchema.parse({ id: 7, name: 'ECC-I' })).toBe(7)
  })

  it('reads the documents of a list', () => {
    expect(listOf(z.object({ id: z.number() })).parse({ docs: [{ id: 1 }], totalDocs: 1 })).toEqual(
      {
        docs: [{ id: 1 }],
      },
    )
  })
})
