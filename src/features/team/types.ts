import type { Eligibility, SquadPick } from '@/domain/club-rules'
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

/** The captain's team this week: practices to check in, matches to select for. */
export type TeamWeek = {
  team: Team
  practices: TeamWeekPractice[]
  matches: TeamWeekMatch[]
}

export type CheckInPlayer = {
  id: string
  name: string
  answer: Answer | null
  /** Marked present: as recorded, or, before the first check-in, everyone who said Going. */
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

/** A player the captain may see in the selection: going, or carried over from the last match. */
export type Candidate = {
  id: string
  name: string
  answer: Answer | null
  eligibility: Eligibility
  attendance: { attended: number; required: number; isRuleActive: boolean }
  /** Last match's 12th man or reserve: in the XI without selection (R-13). */
  isCarriedOver: boolean
}

export type SquadSelection = {
  fixtureId: number
  match: ScheduledEvent
  status: SquadStatus
  /** Why the Board returned the squad, if it did. */
  note: string | null
  candidates: Candidate[]
  /** The squad as stored, or, before the first submission, the carried-over players. */
  picks: SquadPick[]
  /** Carried-over players who said Not going: they give up the automatic place (Q-14). */
  forfeited: { id: string; name: string }[]
  notGoing: number
  awaiting: number
}

export type SquadInput = { fixtureId: number; picks: SquadPick[] }
export type SquadOutcome = 'submitted' | 'invalid' | 'locked' | 'unauthorized' | 'error'
/** Submits the squad to the Board; the preview has none and keeps it in the page. */
export type SubmitSquad = (input: SquadInput) => Promise<{ status: SquadOutcome }>
