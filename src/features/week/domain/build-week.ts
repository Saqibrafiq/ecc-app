import {
  addDays,
  getAttendanceStatus,
  getAvailabilityDeadline,
  getCountdown,
  getLocalDate,
  getPracticeDeadline,
  isOpen,
  type LocalDate,
  startOfWeek,
  type TeamPractice,
} from '@/domain/club-rules'

import type {
  AttendanceSummary,
  MemberAnswer,
  MyWeek,
  ScheduledEvent,
  Team,
  WeekDay,
  WeekEvent,
} from '../types'

const DAYS_PER_WEEK = 7

export type WeekInput = {
  now: Date
  ownTeam: Team
  /** Every team's events this week. */
  events: readonly ScheduledEvent[]
  /** The member's answers, by event id. */
  answers: Readonly<Record<string, MemberAnswer>>
  /** The own team's practices this season, for the attendance rule. */
  practices: readonly TeamPractice[]
  attendedPracticeIds: ReadonlySet<string>
  seasonStart: LocalDate
}

function getClosesAt(event: ScheduledEvent): Date {
  return event.kind === 'match'
    ? getAvailabilityDeadline(event.date, event.deadlineDay)
    : getPracticeDeadline(event.date, event.startTime)
}

function toWeekEvent(event: ScheduledEvent, input: WeekInput): WeekEvent {
  const closesAt = getClosesAt(event)
  const answer = input.answers[event.id]
  return {
    ...event,
    closesAt: closesAt.toISOString(),
    isOpen: isOpen(input.now, closesAt),
    isOwnTeam: event.team.id === input.ownTeam.id,
    answer: answer?.answer ?? null,
    reason: answer?.reason ?? null,
  }
}

function byDateAndTime(a: ScheduledEvent, b: ScheduledEvent): number {
  return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
}

function getAttendance(input: WeekInput, events: readonly WeekEvent[], today: LocalDate) {
  const match = events.find((event) => event.kind === 'match')
  if (!match) return null
  const status = getAttendanceStatus({
    practices: input.practices,
    attendedPracticeIds: input.attendedPracticeIds,
    matchDate: match.date,
    today,
    seasonStart: input.seasonStart,
  })
  const summary: AttendanceSummary = {
    slots: status.slots.map(({ practice, outcome }) => ({
      id: practice.id,
      date: practice.date,
      outcome,
    })),
    attended: status.attended,
    required: status.required,
    isRuleActive: status.isRuleActive,
    standing: status.standing,
    countdown: getCountdown(status),
  }
  return summary
}

/**
 * The member's week, Monday to Sunday, from the club rules: each event with its deadline and
 * answer, the days with their markers, how many answers are still needed, and the attendance
 * standing for the next match.
 */
export function buildWeek(input: WeekInput): MyWeek {
  const today = getLocalDate(input.now)
  const monday = startOfWeek(today)
  const events = [...input.events].sort(byDateAndTime).map((event) => toWeekEvent(event, input))
  const ownEvents = events.filter((event) => event.isOwnTeam)
  const otherEvents = events.filter((event) => !event.isOwnTeam)

  const days: WeekDay[] = Array.from({ length: DAYS_PER_WEEK }, (_, index) => {
    const date = addDays(monday, index)
    return {
      date,
      isToday: date === today,
      markers: ownEvents.filter((event) => event.date === date).map((event) => event.kind),
    }
  })

  return {
    today,
    days,
    ownTeam: input.ownTeam,
    ownEvents,
    otherEvents,
    openAnswers: ownEvents.filter((event) => event.isOpen && event.answer === null).length,
    attendance: getAttendance(input, ownEvents, today),
  }
}
