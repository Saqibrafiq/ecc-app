import type { MatchOutcome } from '../types'

export type OutcomeMessageKey =
  | 'wonByRuns'
  | 'wonByWickets'
  | 'lostByRuns'
  | 'lostByWickets'
  | MatchOutcome['result']
  | 'dls'
  | 'walkoverWon'
  | 'walkoverLost'
  | 'forfeitWon'
  | 'forfeitLost'

/** A translator for the `season.result` messages, e.g. next-intl's `t`. */
export type OutcomeTranslator = (
  key: OutcomeMessageKey,
  values?: Record<string, string | number>,
) => string

/** The outcome from the ECC side in one line, e.g. "Won by 4 wickets" or "Tied (DLS)". */
export function describeOutcome(outcome: MatchOutcome, t: OutcomeTranslator): string {
  const { result, margin, method } = outcome
  const isDecided = result === 'won' || result === 'lost'

  if (isDecided && (method === 'walkover' || method === 'forfeit')) {
    return t(`${method}${result === 'won' ? 'Won' : 'Lost'}`)
  }
  const text =
    isDecided && margin
      ? t(`${result}By${margin.unit === 'runs' ? 'Runs' : 'Wickets'}`, { value: margin.value })
      : t(result)
  return method === 'dls' ? t('dls', { result: text }) : text
}
