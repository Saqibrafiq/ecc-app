import { useFormatter, useTranslations } from 'next-intl'

import type { MyWeek } from '../types'
import { toDisplayDate } from '@/shared/lib/display-date'

export type WeekHeaderProps = {
  week: MyWeek
  memberName: string
  isPreview: boolean
}

const INITIALS_LENGTH = 2

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, INITIALS_LENGTH)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/** Greeting, the member's team and the week's dates, and their avatar. */
export function WeekHeader({ week, memberName, isPreview }: WeekHeaderProps) {
  const t = useTranslations('week')
  const format = useFormatter()
  const first = week.days[0]
  const last = week.days.at(-1)
  const dayMonth = { day: 'numeric', month: 'short' } as const

  return (
    <header className="flex flex-col gap-3">
      {isPreview && (
        <p className="self-start rounded-full border border-accent-practice/40 px-3 py-1 text-xs font-semibold text-accent-practice">
          {t('preview', {
            date: format.dateTime(toDisplayDate(week.today), {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            }),
          })}
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-sm font-semibold tracking-[0.2em] text-accent-match uppercase">
            {first && last
              ? t('teamWeek', {
                  team: week.ownTeam.name,
                  from: format.dateTime(toDisplayDate(first.date), dayMonth),
                  to: format.dateTime(toDisplayDate(last.date), dayMonth),
                })
              : week.ownTeam.name}
          </span>
          <h1 className="font-display text-4xl leading-none font-bold uppercase">
            {t('greeting', { name: memberName.split(' ')[0] ?? memberName })}
          </h1>
        </div>
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-lg font-bold text-accent-match"
        >
          {getInitials(memberName)}
        </span>
      </div>
    </header>
  )
}
