import { useFormatter } from 'next-intl'

import { cn } from '@/shared/lib/cn'

export type DateTileProps = {
  date: Date
  /** Match gold or practice blue, as everywhere in the app. */
  tone: 'match' | 'practice'
}

/** A day as on a scoreboard: weekday, a large day number and the month. */
export function DateTile({ date, tone }: DateTileProps) {
  const format = useFormatter()
  return (
    <div className="flex flex-col items-center border-r border-border-default pr-3">
      <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
        {format.dateTime(date, { weekday: 'short' })}
      </span>
      <span
        className={cn(
          'font-display text-5xl leading-none font-bold tabular-nums',
          tone === 'match' ? 'text-accent-match' : 'text-accent-practice',
        )}
      >
        {format.dateTime(date, { day: 'numeric' })}
      </span>
      <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
        {format.dateTime(date, { month: 'short' })}
      </span>
    </div>
  )
}
