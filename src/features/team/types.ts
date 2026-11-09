import type { Eligibility, LocalDate, SquadPick } from '@/domain/club-rules'
import type { Answer, ScheduledEvent, Team } from '@/features/week'

/** Where a match squad stands, as the website stores it (ADR-0024 in the website). */
export type SquadStatus = 'open' | 'submitted' | 'approved' | 'returned'

export type TeamWeekPractice = {
  event: ScheduledEvent
  practiceId: number
  isRecorded: boolean
  isCancelled: boolean
  /** The check-in opens on the practice day. */
  canCheckIn: boolean
}

export type TeamWeekMatch = {
  event: ScheduledEvent
  fixtureId: number
  squadStatus: SquadStatus
}

/** A player's open request to be marked present at a practice (UC-18). */
export type TeamCorrection = {
  id: number
  playerName: string
  practiceDate: LocalDate
  note: string
}

export type CorrectionDecisionInput = { correctionId: number; isAccepted: boolean }
export type CorrectionDecisionOutcome = 'decided' | 'invalid' | 'unauthorized' | 'error'
/** Accepts or declines a request on the server; the preview has none and keeps it in the page. */
export type DecideCorrection = (
  input: CorrectionDecisionInput,
) => Promise<{ status: CorrectionDecisionOutcome }>

/** The captain's team this week: practices to check in, matches to select for. */
export type TeamWeek = {
  team: Team
  /** The teams an admin can switch between; empty for a captain, who has one team. */
  choices: Team[]
  practices: TeamWeekPractice[]
  matches: TeamWeekMatch[]
  /** Players' open requests to be marked present, oldest practice first. */
  corrections: TeamCorrection[]
}

export type CheckInPlayer = {
  id: string
  name: string
  answer: Answer | null
  /** Marked present as recorded; nobody is ticked before the captain does it. */
  isPresent: boolean
}

export type CheckIn = {
  practice: ScheduledEvent
  practiceId: number
  isRecorded: boolean
  isCancelled: boolean
  canCheckIn: boolean
  players: CheckInPlayer[]
}

export type CheckInInput = { practiceId: number; presentIds: string[] }
export type CheckInOutcome = 'saved' | 'invalid' | 'not-yet' | 'unauthorized' | 'error'
/** Saves the check-in on the server; the preview has none and keeps it in the page. */
export type SaveCheckIn = (input: CheckInInput) => Promise<{ status: CheckInOutcome }>

/** A player the captain may pick from: everyone who said Going. */
export type Candidate = {
  id: string
  name: string
  answer: Answer | null
  eligibility: Eligibility
  attendance: { attended: number; required: number; isRuleActive: boolean }
  /** Last match's 12th man or reserve: selectable despite the attendance rule (R-13). */
  isCarriedOver: boolean
}

export type SquadSelection = {
  fixtureId: number
  match: ScheduledEvent
  status: SquadStatus
  /** Why the Board returned the squad, if it did. */
  note: string | null
  candidates: Candidate[]
  /** The squad as saved; empty until the captain picks it: nothing is preselected. */
  picks: SquadPick[]
  notGoing: number
  awaiting: number
}

export type SquadInput = { fixtureId: number; picks: SquadPick[] }
export type SquadOutcome = 'submitted' | 'invalid' | 'locked' | 'unauthorized' | 'error'
/** Submits the squad to the Board; the preview has none and keeps it in the page. */
export type SubmitSquad = (input: SquadInput) => Promise<{ status: SquadOutcome }>
