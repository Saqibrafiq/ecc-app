import type {
  AttendanceStanding,
  Countdown,
  DeadlineDay,
  LocalDate,
  LocalTime,
  PracticeOutcome,
} from '@/domain/club-rules'

export type Answer = 'going' | 'not-going'
export type EventKind = 'match' | 'practice'
export type MatchFormat = 't20' | 'fifty-over'

export type Team = {
  id: string
  name: string
}

/** A match or practice as scheduled, before anything about the member is known. */
export type ScheduledEvent = {
  id: string
  kind: EventKind
  team: Team
  date: LocalDate
  startTime: LocalTime
  ground: string
  /** Matches only. */
  opponent?: string
  competition?: string
  format?: MatchFormat
  isHome?: boolean
  /** Matches only: when availability closes; Tuesday unless the admin extended it. */
  deadlineDay?: DeadlineDay
}

export type MemberAnswer = {
  answer: Answer
  reason: string | null
}

/** An event as the member sees it this week. */
export type WeekEvent = ScheduledEvent & {
  /** When answers close, as an ISO instant. */
  closesAt: string
  isOpen: boolean
  isOwnTeam: boolean
  answer: Answer | null
  reason: string | null
}

export type WeekDay = {
  date: LocalDate
  isToday: boolean
  /** The member's own team's events on that day. */
  markers: EventKind[]
}

export type AttendanceSummary = {
  slots: { id: string; date: LocalDate; outcome: PracticeOutcome }[]
  attended: number
  required: number
  isRuleActive: boolean
  standing: AttendanceStanding
  countdown: Countdown
}

export type MyWeek = {
  today: LocalDate
  days: WeekDay[]
  ownTeam: Team
  /** The member's own team first: display order only (R-7). */
  ownEvents: WeekEvent[]
  otherEvents: WeekEvent[]
  /** Open own-team events the member has not answered yet. */
  openAnswers: number
  /** For the member's next match, or `null` without one this week. */
  attendance: AttendanceSummary | null
}
