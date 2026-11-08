import { getFormatter } from 'next-intl/server'

import type { WeekResult } from '../server/queries'
import { AttendanceCard } from './attendance-card'
import { toDisplayDate } from './dates'
import { OtherTeamEvents } from './other-team-events'
import { OwnWeek } from './own-week'
import { WeekHeader } from './week-header'
import { WeekStrip } from './week-strip'

export type WeekViewProps = WeekResult & {
  memberName: string
}

/** A player's week: what to answer, what counts for selection, and the other team's events. */
export async function WeekView({ week, isPreview, memberName }: WeekViewProps) {
  const format = await getFormatter()
  const match = week.ownEvents.find((event) => event.kind === 'match')
  const otherTeam = week.otherEvents[0]?.team

  return (
    <div className="flex flex-col gap-4">
      <WeekHeader week={week} memberName={memberName} isPreview={isPreview} />
      <WeekStrip days={week.days} />
      <OwnWeek events={week.ownEvents} />
      {week.attendance && match && (
        <AttendanceCard
          attendance={week.attendance}
          matchDay={format.dateTime(toDisplayDate(match.date), { weekday: 'long' })}
        />
      )}
      {otherTeam && <OtherTeamEvents teamName={otherTeam.name} events={week.otherEvents} />}
    </div>
  )
}
