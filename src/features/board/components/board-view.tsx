import { CalendarOff } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { getAvailabilityDeadline } from '@/domain/club-rules'
import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { buttonVariants } from '@/shared/ui/button-variants'
import { DateTile } from '@/shared/ui/date-tile'
import { ScreenHeader } from '@/shared/ui/screen-header'
import { StateCard } from '@/shared/ui/state-card'

import type { BoardResult } from '../server/queries'
import type { BoardMatch } from '../types'
import { BoardAccessState } from './board-access-state'
import { STATUS_CLASS } from './status'

export type BoardViewProps = {
  result: Exclude<BoardResult, { kind: 'signed-out' }>
}

function MatchItem({ match }: { match: BoardMatch }) {
  const t = useTranslations('board')
  const format = useFormatter()
  const { event, squadStatus } = match
  const closesAt = getAvailabilityDeadline(event.date, match.deadlineDay)
  const isWaiting = squadStatus === 'submitted'

  return (
    <li className="overflow-hidden rounded-2xl border border-border-default bg-surface-card">
      <div className="grid grid-cols-[4rem_1fr] items-center gap-4 px-4 py-4">
        <DateTile date={toDisplayDate(event.date)} tone="match" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-2xl leading-none font-bold text-balance uppercase">
            {t('match.title', { team: event.team.name, opponent: event.opponent ?? '' })}
          </h2>
          <span className="text-sm text-text-muted">
            {t('match.closes', {
              when: format.dateTime(closesAt, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              }),
            })}
          </span>
          <span className={cn('text-sm font-semibold', STATUS_CLASS[squadStatus])}>
            {t(`status.${squadStatus}`)}
          </span>
        </div>
      </div>
      <div className="border-t border-dashed border-border-default px-4 pt-3 pb-4">
        <Link
          href={`/board/squad/${String(match.fixtureId)}`}
          className={cn(buttonVariants({ variant: isWaiting ? 'primary' : 'outline' }), 'w-full')}
        >
          {t('match.review')}
        </Link>
      </div>
    </li>
  )
}

/** The Board's week: every club team's match and where its squad stands, most urgent first. */
export function BoardView({ result }: BoardViewProps) {
  const t = useTranslations('board')
  const format = useFormatter()
  if (result.kind === 'not-board') return <BoardAccessState kind="not-board" />

  const { matches, isPreview } = result
  const first = matches[0]

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        previewNote={
          isPreview && first
            ? t('preview', {
                date: format.dateTime(toDisplayDate(first.event.date), { weekday: 'long' }),
              })
            : undefined
        }
      />
      {matches.length === 0 ? (
        <StateCard
          icon={<CalendarOff aria-hidden="true" className="size-5" />}
          title={t('quiet.title')}
          text={t('quiet.text')}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchItem key={match.fixtureId} match={match} />
          ))}
        </ul>
      )}
    </div>
  )
}
