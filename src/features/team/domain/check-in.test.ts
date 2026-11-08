import { describe, expect, it } from 'vitest'

import type { Answer } from '@/features/week'

import { isInitiallyPresent, planCheckIn } from './check-in'

describe('planCheckIn', () => {
  const answers = new Map<string, Answer>([
    ['1', 'going'],
    ['2', 'going'],
    ['3', 'not-going'],
  ])

  it('records who came, marking those who had not said Going as walk-ins', () => {
    expect(
      planCheckIn({
        records: [],
        presentIds: new Set(['1', '3', '4']),
        playerIds: ['1', '2', '3', '4'],
        answers,
      }),
    ).toEqual([
      { kind: 'create', playerId: '1', isWalkIn: false },
      { kind: 'create', playerId: '3', isWalkIn: true },
      { kind: 'create', playerId: '4', isWalkIn: true },
    ])
  })

  it('flips only the records a correction changes, and deletes nothing', () => {
    expect(
      planCheckIn({
        records: [
          { id: 10, playerId: '1', attended: true },
          { id: 11, playerId: '2', attended: false },
          { id: 12, playerId: '3', attended: true },
        ],
        presentIds: new Set(['1', '2']),
        playerIds: ['1', '2', '3'],
        answers,
      }),
    ).toEqual([
      { kind: 'update', recordId: 11, attended: true },
      { kind: 'update', recordId: 12, attended: false },
    ])
  })
})

describe('isInitiallyPresent', () => {
  it('shows the recorded attendance', () => {
    expect(isInitiallyPresent({ id: 1, playerId: '1', attended: false }, 'going', true)).toBe(false)
    expect(isInitiallyPresent({ id: 1, playerId: '1', attended: true }, null, true)).toBe(true)
  })

  it('ticks who said Going before the first check-in, and nobody unrecorded after it', () => {
    expect(isInitiallyPresent(undefined, 'going', false)).toBe(true)
    expect(isInitiallyPresent(undefined, 'not-going', false)).toBe(false)
    expect(isInitiallyPresent(undefined, 'going', true)).toBe(false)
  })
})
