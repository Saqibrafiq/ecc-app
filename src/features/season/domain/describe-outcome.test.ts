import { describe, expect, it } from 'vitest'

import type { MatchOutcome } from '../types'
import { describeOutcome, type OutcomeTranslator } from './describe-outcome'

/** Echoes the key and its values, so the tests see which message is chosen. */
const t: OutcomeTranslator = (key, values) =>
  values ? `${key}(${Object.values(values).join(',')})` : key

const outcome = (overrides: Partial<MatchOutcome>): MatchOutcome => ({
  result: 'won',
  margin: null,
  method: null,
  ...overrides,
})

describe('describeOutcome', () => {
  it('states a win or a loss with its margin in runs or wickets', () => {
    expect(describeOutcome(outcome({ margin: { unit: 'runs', value: 32 } }), t)).toBe(
      'wonByRuns(32)',
    )
    expect(
      describeOutcome(outcome({ result: 'lost', margin: { unit: 'wickets', value: 4 } }), t),
    ).toBe('lostByWickets(4)')
  })

  it('states a win without a published margin plainly', () => {
    expect(describeOutcome(outcome({}), t)).toBe('won')
  })

  it('marks a result decided by DLS', () => {
    expect(describeOutcome(outcome({ margin: { unit: 'runs', value: 9 }, method: 'dls' }), t)).toBe(
      'dls(wonByRuns(9))',
    )
    expect(describeOutcome(outcome({ result: 'tied', method: 'dls' }), t)).toBe('dls(tied)')
  })

  it('states awarded matches for and against the ECC team', () => {
    expect(describeOutcome(outcome({ method: 'walkover' }), t)).toBe('walkoverWon')
    expect(describeOutcome(outcome({ result: 'lost', method: 'forfeit' }), t)).toBe('forfeitLost')
  })

  it('names the other results', () => {
    for (const result of ['tied', 'no-result', 'abandoned', 'cancelled'] as const) {
      expect(describeOutcome(outcome({ result }), t)).toBe(result)
    }
  })
})
