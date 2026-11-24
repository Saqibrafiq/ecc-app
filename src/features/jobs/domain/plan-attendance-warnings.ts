import { getAttendanceStatus, getCountdown, getLocalDate } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

import type { DueNotification, TeamAttendance, TickInput } from '../types'
import { players } from './recipients'

/** The team's next match this week: the one its attendance standing is for. */
function nextMatchOf(input: TickInput, teamId: string): ScheduledEvent | undefined {
  const today = getLocalDate(input.now)
  return input.events
    .filter((event) => event.kind === 'match' && event.team.id === teamId && event.date >= today)
    .toSorted((a, b) => a.date.localeCompare(b.date))[0]
}

function warn(
  input: TickInput,
  practice: ScheduledEvent,
  match: ScheduledEvent,
  team: TeamAttendance,
): DueNotification[] {
  const today = getLocalDate(input.now)
  return players(input.members)
    .filter((member) => member.teamId === team.teamId)
    .filter((member) => !team.selectableAnyway.has(member.playerId))
    .flatMap((member): DueNotification[] => {
      const countdown = getCountdown(
        getAttendanceStatus({
          practices: team.practices,
          attendedPracticeIds: team.attended.get(member.playerId) ?? new Set(),
          matchDate: match.date,
          today,
          seasonStart: team.seasonStart,
        }),
      )
      if (countdown.kind === 'met') return []
      return [
        {
          kind: 'attendance',
          key: `attendance:${practice.id}:${String(member.userId)}`,
          userId: member.userId,
          match,
          countdown,
        },
      ]
    })
}

/**
 * UC-8, R-3: once a team's practice is recorded, every player of that squad whom the attendance
 * rule (R-2) holds back for the week's match learns what they still need, or that they cannot be
 * picked. A player carried over (R-13) or excepted by the Board (R-8) is selectable anyway and is
 * not warned; nor is anyone before the rule applies (R-11). Once per practice and player.
 */
export function planAttendanceWarnings(input: TickInput): DueNotification[] {
  return input.events
    .filter((event) => event.kind === 'practice' && input.recordedPracticeIds.has(event.id))
    .flatMap((practice) => {
      const match = nextMatchOf(input, practice.team.id)
      const team = input.attendance.find((item) => item.teamId === practice.team.id)
      return match && team ? warn(input, practice, match, team) : []
    })
}
