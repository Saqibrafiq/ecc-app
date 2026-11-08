import type { DeadlineDay, SquadPick } from '@/domain/club-rules'
import type { Candidate, SquadSelection, SquadStatus } from '@/features/team'
import type { ScheduledEvent } from '@/features/week'

/** One of the week's matches as the Board sees it: where its squad stands. */
export type BoardMatch = {
  event: ScheduledEvent
  fixtureId: number
  squadStatus: SquadStatus
  deadlineDay: DeadlineDay
}

/** A match's squad for the Board's review: the captain's picks, the deadline, the exceptions. */
export type BoardSquad = {
  selection: SquadSelection
  deadlineDay: DeadlineDay
  /** When availability closes with that deadline, as an ISO instant. */
  closesAt: string
  /** Going players the rules block, and those the Board already allowed: exception candidates. */
  blocked: Candidate[]
  exceptionIds: string[]
  /** The picks with each player's name, in squad order: XI, 12th man, reserves. */
  squad: (SquadPick & { name: string })[]
}

export type BoardOutcome = 'saved' | 'invalid' | 'not-allowed' | 'unauthorized' | 'error'
export type BoardActionResult = { status: BoardOutcome }

/** The Board's decisions on a squad; the preview has none and keeps them in the page. */
export type BoardActions = {
  approve: (input: { fixtureId: number }) => Promise<BoardActionResult>
  sendBack: (input: { fixtureId: number; note: string }) => Promise<BoardActionResult>
  setDeadline: (input: {
    fixtureId: number
    deadlineDay: DeadlineDay
  }) => Promise<BoardActionResult>
  setException: (input: {
    fixtureId: number
    playerId: string
    isAllowed: boolean
  }) => Promise<BoardActionResult>
}
