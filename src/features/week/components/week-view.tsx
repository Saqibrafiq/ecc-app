import { CalendarOff, Link2Off, Users } from 'lucide-react'
import { getFormatter, getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { WeekResult } from '../server/queries'
import type { SaveAnswer, WeekEvent } from '../types'
import { AttendanceCard } from './attendance-card'
import { toDisplayDate } from './dates'
import { OtherTeamEvents } from './other-team-events'
import { OwnWeek } from './own-week'
import { WeekHeader } from './week-header'
import { WeekStrip } from './week-strip'

export type WeekViewProps = {
  result: Exclude<WeekResult, { kind: 'signed-out' }>
  saveAnswer?: SaveAnswer
}

function StateCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-2xl border border-border-default bg-surface-card p-5">
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-raised text-accent-practice">
        {icon}
      </span>
      <h2 className="font-display text-2xl leading-none font-bold uppercase">{title}</h2>
      <p className="text-text-muted">{text}</p>
    </section>
  )
}

/** The other teams' events, one section per team (own team first is display order only, R-7). */
function groupByTeam(events: readonly WeekEvent[]) {
  const groups = new Map<string, { name: string; events: WeekEvent[] }>()
  for (const event of events) {
    const group = groups.get(event.team.id) ?? { name: event.team.name, events: [] }
    group.events.push(event)
    groups.set(event.team.id, group)
  }
  return [...groups.entries()]
}

/** A player's week: what to answer, what counts for selection, and the other teams' events. */
export async function WeekView({ result, saveAnswer }: WeekViewProps) {
  const t = await getTranslations('weekState')
  const format = await getFormatter()

  if (result.kind === 'unlinked') {
    return (
      <StateCard
        icon={<Link2Off aria-hidden="true" className="size-5" />}
        title={t('unlinked.title')}
        text={t('unlinked.text')}
      />
    )
  }
  if (result.kind === 'no-squad') {
    return (
      <StateCard
        icon={<Users aria-hidden="true" className="size-5" />}
        title={t('noSquad.title')}
        text={t('noSquad.text')}
      />
    )
  }

  const { week, memberName, isPreview, nextMatch } = result
  const match = week.ownEvents.find((event) => event.kind === 'match')
  const day = (date: WeekEvent['date']) => format.dateTime(toDisplayDate(date), { weekday: 'long' })
  const nextMatchText =
    nextMatch &&
    t('quiet.next', {
      title: nextMatch.opponent ?? '',
      date: format.dateTime(toDisplayDate(nextMatch.date), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    })

  return (
    <div className="flex flex-col gap-4">
      <WeekHeader week={week} memberName={memberName} isPreview={isPreview} />
      <WeekStrip days={week.days} />
      {week.ownEvents.length > 0 ? (
        <OwnWeek events={week.ownEvents} saveAnswer={saveAnswer} />
      ) : (
        <StateCard
          icon={<CalendarOff aria-hidden="true" className="size-5" />}
          title={t('quiet.title')}
          text={[t('quiet.text'), nextMatchText].filter(Boolean).join(' ')}
        />
      )}
      {week.attendance && match && (
        <AttendanceCard attendance={week.attendance} matchDay={day(match.date)} />
      )}
      {groupByTeam(week.otherEvents).map(([teamId, group]) => (
        <OtherTeamEvents
          key={teamId}
          teamName={group.name}
          events={group.events}
          saveAnswer={saveAnswer}
        />
      ))}
    </div>
  )
}
