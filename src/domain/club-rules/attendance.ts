import type { LocalDate } from './local-time'

/** R-2: how many practices are looked at, and how many of them a player must have attended. */
export const ATTENDANCE_WINDOW = 4
export const REQUIRED_PRACTICES = 2

export type TeamPractice = {
  id: string
  date: LocalDate
  isCancelled: boolean
  /** The captain has completed the check-in; anyone not marked present missed it. */
  isRecorded: boolean
}

/**
 * - `attended`: marked present by the captain.
 * - `missed`: the check-in is done and the player was not there.
 * - `upcoming`: the practice has not happened yet.
 * - `unrecorded`: it has happened but the captain has not done the check-in; nobody is counted
 *   as missing it until then.
 */
export type PracticeOutcome = 'attended' | 'missed' | 'upcoming' | 'unrecorded'

export type AttendanceSlot = {
  practice: TeamPractice
  outcome: PracticeOutcome
}

/**
 * - `met`: the rule is fulfilled.
 * - `possible`: not yet, but the practices still open can fulfil it.
 * - `out`: it can no longer be fulfilled for this match.
 */
export type AttendanceStanding = 'met' | 'possible' | 'out'

export type AttendanceStatus = {
  /** The practices that count for the match, oldest first. */
  slots: AttendanceSlot[]
  attended: number
  /** Practices still open: upcoming or not yet recorded. */
  open: number
  /** Whether the rule applies yet: only once 4 practices of this season count for the match (R-11). */
  isRuleActive: boolean
  /** What the rule asks for: 2 once it applies, otherwise none. */
  required: number
  standing: AttendanceStanding
  stillNeeded: number
}

export type AttendanceInput = {
  /** The team's practices (any order); cancelled ones never count (Q-2). */
  practices: readonly TeamPractice[]
  /** Ids of the practices this player attended, including walk-ins. */
  attendedPracticeIds: ReadonlySet<string>
  /** The match the status is for. */
  matchDate: LocalDate
  /** Today in club-local time. */
  today: LocalDate
  /** Only practices from this day on count (pre-season included), so last season's never do. */
  seasonStart: LocalDate
}

function getOutcome(
  practice: TeamPractice,
  attended: ReadonlySet<string>,
  today: LocalDate,
): PracticeOutcome {
  if (attended.has(practice.id)) return 'attended'
  if (practice.isRecorded) return 'missed'
  return practice.date < today ? 'unrecorded' : 'upcoming'
}

function getStanding(attended: number, open: number, required: number): AttendanceStanding {
  if (attended >= required) return 'met'
  return attended + open >= required ? 'possible' : 'out'
}

/**
 * A player's standing under the attendance rule for one match (R-2): the team's last 4 practices
 * this season, pre-season included, up to and including the practice before the match (Q-9), and
 * how many they attended. The rule applies once there are 4 such practices; before that, nobody
 * needs a minimum (R-11).
 */
export function getAttendanceStatus({
  practices,
  attendedPracticeIds,
  matchDate,
  today,
  seasonStart,
}: AttendanceInput): AttendanceStatus {
  const window = practices
    .filter((p) => !p.isCancelled && p.date >= seasonStart && p.date < matchDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ATTENDANCE_WINDOW)
    .reverse()

  const slots = window.map((practice) => ({
    practice,
    outcome: getOutcome(practice, attendedPracticeIds, today),
  }))
  const attended = slots.filter((slot) => slot.outcome === 'attended').length
  const open = slots.filter((s) => s.outcome === 'upcoming' || s.outcome === 'unrecorded').length
  const isRuleActive = slots.length === ATTENDANCE_WINDOW
  const required = isRuleActive ? REQUIRED_PRACTICES : 0

  return {
    slots,
    attended,
    open,
    isRuleActive,
    required,
    standing: getStanding(attended, open, required),
    stillNeeded: Math.max(0, required - attended),
  }
}

export type Countdown =
  | { kind: 'met' }
  /** e.g. "attend 2 of the next 3" (R-3). */
  | { kind: 'needs'; needed: number; of: number }
  | { kind: 'out' }

/** What the player is told after each practice (R-3), derived from their status. */
export function getCountdown(status: AttendanceStatus): Countdown {
  switch (status.standing) {
    case 'met':
      return { kind: 'met' }
    case 'possible':
      return { kind: 'needs', needed: status.stillNeeded, of: status.open }
    case 'out':
      return { kind: 'out' }
  }
}
