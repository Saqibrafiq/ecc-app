import { CalendarOff } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { StateCard } from '@/shared/ui/state-card'

import type { Season, SeasonRecord } from '../types'
import { SeasonTimeline } from './season-timeline'

export type SeasonViewProps = {
  season: Season
  /** True while the screen shows sample data (no backend configured). */
  isPreview: boolean
}

function RecordLine({ record }: { record: SeasonRecord }) {
  const t = useTranslations('season')
  return (
    <p className="text-text-muted">
      {t('record', {
        team: record.team.name,
        played: record.played,
        won: record.won,
        lost: record.lost,
      })}
      {' · '}
      {t('remaining', { count: record.remaining })}
    </p>
  )
}

/** The club's whole season as a timeline: every ECC match, month by month, the next one marked. */
export function SeasonView({ season, isPreview }: SeasonViewProps) {
  const t = useTranslations('season')

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        {isPreview && (
          <p className="self-start rounded-full border border-accent-practice/40 px-3 py-1 text-xs font-semibold text-accent-practice">
            {t('preview')}
          </p>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-sm font-semibold tracking-[0.2em] text-accent-match uppercase">
            {t('eyebrow', { year: season.year })}
          </span>
          <h1 className="font-display text-4xl leading-none font-bold uppercase">{t('title')}</h1>
        </div>
        {season.record && <RecordLine record={season.record} />}
      </header>

      {season.months.length === 0 ? (
        <StateCard
          icon={<CalendarOff aria-hidden="true" className="size-5" />}
          title={t('empty.title')}
          text={t('empty.text')}
        />
      ) : (
        <SeasonTimeline
          months={season.months}
          today={season.today}
          hasNext={season.nextDate !== null}
        />
      )}
    </div>
  )
}
