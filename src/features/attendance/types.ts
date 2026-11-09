import type { AttendanceStanding, AvailabilityTarget, LocalDate } from '@/domain/club-rules'
import type { Team } from '@/features/week'

/** Where a member's request to be marked present stands (UC-18). */
export type CorrectionStatus = 'requested' | 'accepted' | 'declined'

/** How a practice went for the member; a cancelled one never counts (Q-2). */
export type LedgerOutcome = 'attended' | 'missed' | 'unrecorded' | 'upcoming' | 'cancelled'

export type LedgerPractice = {
  practiceId: number
  date: LocalDate
  outcome: LedgerOutcome
  correction: CorrectionStatus | null
  /** A missed practice without a request yet: the member can ask to be marked present. */
  canRequestCorrection: boolean
}

export type LedgerMonth = {
  /** The month as `YYYY-MM`, newest first. */
  month: string
  practices: LedgerPractice[]
}

export type LedgerStanding = {
  /** The last practices that count, oldest first. */
  slots: { practiceId: number; date: LocalDate; outcome: LedgerOutcome }[]
  attended: number
  required: number
  isRuleActive: boolean
  standing: AttendanceStanding
  stillNeeded: number
  /** The match the standing is for, or `null` when the team has none left this season. */
  matchDate: LocalDate | null
}

/** An availability target with whose it is: every player's away share, or a captain's overall. */
export type LedgerTarget = AvailabilityTarget & { kind: 'away' | 'captain' }

/** A member's season: attendance standing, availability targets and every practice (UC-7, UC-20). */
export type AttendanceLedger = {
  team: Team
  season: string
  standing: LedgerStanding
  targets: LedgerTarget[]
  months: LedgerMonth[]
}

export type CorrectionInput = { practiceId: number; note: string }
export type CorrectionOutcome = 'requested' | 'invalid' | 'unauthorized' | 'error'
/** Sends a correction request; the preview has none and keeps it in the page. */
export type RequestCorrection = (input: CorrectionInput) => Promise<{ status: CorrectionOutcome }>
