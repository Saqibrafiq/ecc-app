import type { Countdown, LocalDate, SquadRole, TeamPractice } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

/** A member as the jobs see them: who they are, their team, the team they lead, the Board. */
export type JobMember = {
  userId: number
  /** `null` until the Board links the account to a player. */
  playerId: number | null
  /** The team squad the member belongs to. */
  teamId: string | null
  /** The team a captain leads. */
  captainOfTeamId: string | null
  /** An admin: approves squads (UC-11). */
  isBoard: boolean
}

/** A squad's status in the website (ADR-0024 there). */
export type SquadStatus = 'open' | 'submitted' | 'approved' | 'returned'

/** Where a squad of this week's matches stands, and since when (the website's status stamp). */
export type SquadState = {
  matchId: string
  status: SquadStatus
  /** When the status last changed: versions each submission, return and approval. */
  statusChangedAt: string | null
  picks: readonly { playerId: number; role: SquadRole }[]
}

/** What a team's attendance standing needs (R-2, R-11), for a team whose practice was recorded. */
export type TeamAttendance = {
  teamId: string
  seasonStart: LocalDate
  /** The team's practices this season. */
  practices: readonly TeamPractice[]
  /** The practices each player attended, by player id. */
  attended: ReadonlyMap<number, ReadonlySet<string>>
  /** Players the rule does not hold back this week: carried over (R-13) or excepted (R-8). */
  selectableAnyway: ReadonlySet<number>
}

export type TickInput = {
  now: Date
  /** This week's matches (with their deadline day) and the practices that take place. */
  events: readonly ScheduledEvent[]
  members: readonly JobMember[]
  /** The event ids each player has answered, by player id. */
  answers: ReadonlyMap<number, ReadonlySet<string>>
  /** The players who said Going, by event id. */
  going: ReadonlyMap<string, ReadonlySet<number>>
  recordedPracticeIds: ReadonlySet<string>
  squads: readonly SquadState[]
  attendance: readonly TeamAttendance[]
}

/** A selection notice: the recipient's place in the announced squad, or `null` when not picked. */
export type AnnouncedRole = SquadRole | null

/** A notification that is due now for one member, under a key that makes sending it idempotent. */
export type DueNotification =
  | { kind: 'reminder'; key: string; userId: number; events: ScheduledEvent[] }
  | { kind: 'check-in'; key: string; userId: number; practice: ScheduledEvent; going: number }
  | { kind: 'selection'; key: string; userId: number; match: ScheduledEvent; going: number }
  | { kind: 'approval'; key: string; userId: number; match: ScheduledEvent }
  | { kind: 'returned'; key: string; userId: number; match: ScheduledEvent }
  | {
      kind: 'announcement'
      key: string
      userId: number
      match: ScheduledEvent
      role: AnnouncedRole
    }
  | {
      kind: 'attendance'
      key: string
      userId: number
      match: ScheduledEvent
      countdown: Exclude<Countdown, { kind: 'met' }>
    }
