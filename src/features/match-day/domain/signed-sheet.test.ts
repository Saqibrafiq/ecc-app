import { describe, expect, it } from 'vitest'

import { fitWithin, SHEET_MAX_EDGE } from './signed-sheet'

describe('fitWithin', () => {
  it('scales a large photo so its longest edge fits', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: SHEET_MAX_EDGE, height: 1200 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: SHEET_MAX_EDGE })
  })

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
