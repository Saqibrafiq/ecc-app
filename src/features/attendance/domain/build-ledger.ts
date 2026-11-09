import {
  getAttendanceStatus,
  getAwayAvailabilityTarget,
  getCaptainAvailabilityTarget,
  type LocalDate,
  type TeamPractice,
} from '@/domain/club-rules'
import type { Answer, Team } from '@/features/week'

import type {
  AttendanceLedger,
  CorrectionStatus,
  LedgerMonth,
  LedgerOutcome,
  LedgerPractice,
  LedgerTarget,
} from '../types'

/** One of the team's matches this season, with the member's answer. */
export type LedgerMatch = {
  date: LocalDate
  isHome: boolean
  /** When answers closed or close, as an instant. */
  closesAt: Date
  answer: Answer | null
}

export type LedgerInput = {
  team: Team
  now: Date
  today: LocalDate
  seasonStart: LocalDate
  practices: readonly TeamPractice[]
  attendedPracticeIds: ReadonlySet<string>
  /** The member's correction requests by the app's practice id ("practice-5"). */
  corrections: ReadonlyMap<string, CorrectionStatus>
  matches: readonly LedgerMatch[]
  /** Captains also have the 80 % target on all matches (motion 2023/05). */
  isCaptain: boolean
  /** Matches before this day do not count for the targets (set by the Board); `null`: all do. */
  targetsStartOn: LocalDate | null
}

const MONTH_LENGTH = 7

/** The backend id in the app's practice id ("practice-5" → 5). */
const toPracticeId = (id: string) => Number(id.replace('practice-', ''))

function toOutcome(
  practice: TeamPractice,
  attended: ReadonlySet<string>,
  today: LocalDate,
): LedgerOutcome {
  if (practice.isCancelled) return 'cancelled'
  if (attended.has(practice.id)) return 'attended'
  if (practice.date > today) return 'upcoming'
  return practice.isRecorded ? 'missed' : 'unrecorded'
}

function toPractice(practice: TeamPractice, input: LedgerInput): LedgerPractice {
  const outcome = toOutcome(practice, input.attendedPracticeIds, input.today)
  const correction = input.corrections.get(practice.id) ?? null
  return {
    practiceId: toPracticeId(practice.id),
    date: practice.date,
    outcome,
    correction,
    canRequestCorrection: outcome === 'missed' && correction === null,
  }
}

/** The season's practices by month, newest first. */
function toMonths(practices: readonly LedgerPractice[]): LedgerMonth[] {
  const months = new Map<string, LedgerPractice[]>()
  for (const practice of [...practices].sort((a, b) => b.date.localeCompare(a.date))) {
    const month = practice.date.slice(0, MONTH_LENGTH)
    months.set(month, [...(months.get(month) ?? []), practice])
  }
  return [...months].map(([month, list]) => ({ month, practices: list }))
}

/** Closed matches count as answered or not (no answer is not available); open ones are to come. */
function toTargetInput(matches: readonly LedgerMatch[], now: Date) {
  const closed = matches.filter((match) => match.closesAt <= now)
  return {
    closed: closed.length,
    available: closed.filter((match) => match.answer === 'going').length,
    upcoming: matches.length - closed.length,
  }
}

function getTargets(input: LedgerInput): LedgerTarget[] {
  const { targetsStartOn } = input
  const counted = input.matches.filter(
    (match) => targetsStartOn === null || match.date >= targetsStartOn,
  )
  const away = counted.filter((match) => !match.isHome)
  const targets: LedgerTarget[] = [
    { ...getAwayAvailabilityTarget(toTargetInput(away, input.now)), kind: 'away' },
  ]
  if (input.isCaptain) {
    targets.push({
      ...getCaptainAvailabilityTarget(toTargetInput(counted, input.now)),
      kind: 'captain',
    })
  }
  return targets
}

/**
 * A member's season from the club rules (UC-7, UC-20): the attendance standing for the team's next
 * match (R-2, R-11), the availability targets (R-15) and every practice with its outcome and any
 * correction request (UC-18).
 */
export function buildLedger(input: LedgerInput): AttendanceLedger {
  const nextMatch = input.matches
    .filter((match) => match.date >= input.today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const matchDate = nextMatch?.date ?? null
  const status = getAttendanceStatus({
    practices: input.practices,
    attendedPracticeIds: input.attendedPracticeIds,
    matchDate: matchDate ?? input.today,
    today: input.today,
    seasonStart: input.seasonStart,
  })

  return {
    team: input.team,
    season: input.seasonStart.slice(0, 4),
    standing: {
      slots: status.slots.map(({ practice, outcome }) => ({
        practiceId: toPracticeId(practice.id),
        date: practice.date,
        outcome,
      })),
      attended: status.attended,
      required: status.required,
      isRuleActive: status.isRuleActive,
      standing: status.standing,
      stillNeeded: status.stillNeeded,
      matchDate,
    },
    targets: getTargets(input),
    months: toMonths(
      input.practices
        .filter((practice) => practice.date >= input.seasonStart)
        .map((practice) => toPractice(practice, input)),
    ),
  }
}
