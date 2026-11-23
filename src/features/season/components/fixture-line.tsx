import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'

import { describeOutcome } from '../domain/describe-outcome'
import type { MatchOutcome, SeasonFixture } from '../types'
import { ResultMark } from './result-mark'

export type FixtureLineProps = {
  fixture: SeasonFixture
  isNext: boolean
}

/** All legs decided: the fixture shows its result; otherwise when it starts. */
function decidedOutcomes(fixture: SeasonFixture): MatchOutcome[] | null {
  const decided = fixture.outcomes.filter((outcome): outcome is MatchOutcome => outcome !== null)
  return decided.length === fixture.outcomes.length ? decided : null
}

/** One ECC team's fixture on a match day: opponent, competition, and the result or start time. */
export function FixtureLine({ fixture, isNext }: FixtureLineProps) {
  const t = useTranslations('season')
  const outcomes = decidedOutcomes(fixture)
  const legs = fixture.outcomes.length
  const shortDetails = [
    fixture.isHome ? t('home') : t('away'),
    ...(legs > 1 ? [t('legs', { count: legs })] : []),
  ]

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-surface-card px-3 py-2.5',
        isNext ? 'border-accent-match/60' : 'border-transparent',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'text-xs font-bold tracking-wide uppercase',
            fixture.isOwnTeam ? 'text-accent-match' : 'text-text-muted',
          )}
        >
          {fixture.team.name}
        </span>
        <span className="font-semibold">{t('versus', { opponent: fixture.opponent })}</span>
        <span className="text-sm text-text-muted">
          {fixture.competition}
          {/* The short details stay whole: "2 matches" never breaks across lines. */}
          {shortDetails.map((detail) => (
            <span key={detail} className="whitespace-nowrap">
              {' · '}
              {detail}
            </span>
          ))}
        </span>
        {outcomes && (
          <ul className="mt-1 flex flex-col gap-1">
            {outcomes.map((outcome, leg) => (
              <li key={leg} className="flex items-center gap-2 text-sm">
                <ResultMark result={outcome.result} />
                {describeOutcome(outcome, (key, values) => t(`result.${key}`, values))}
              </li>
            ))}
          </ul>
        )}
      </div>
      {outcomes ? null : fixture.startTime ? (
        <span className="font-display text-2xl font-bold tabular-nums">{fixture.startTime}</span>
      ) : (
        <span className="max-w-20 text-right text-xs text-text-muted">{t('timeTbc')}</span>
      )}
    </li>
  )
}
