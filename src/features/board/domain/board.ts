import type { SquadPick } from '@/domain/club-rules'
import type { Candidate, SquadStatus } from '@/features/team'

/** The longest note the Board can send back with a squad (the website stores up to 500). */
export const NOTE_MAX_LENGTH = 500

/** Only a squad the captain handed in can be approved (UC-11). */
export function canApprove(status: SquadStatus): boolean {
  return status === 'submitted'
}

/** The Board reopens a handed-in or announced squad for the captain, with a note (UC-11). */
export function canSendBack(status: SquadStatus): boolean {
  return status === 'submitted' || status === 'approved'
}

/** Deadlines and exceptions matter until the squad is announced (UC-10, UC-14). */
export function canChangeRules(status: SquadStatus): boolean {
  return status !== 'approved'
}

const STATUS_ORDER: Record<SquadStatus, number> = {
  submitted: 0,
  returned: 1,
  open: 2,
  approved: 3,
}

/** What needs the Board first: squads waiting for approval, then returned, open, announced. */
export function compareByUrgency(
  a: { squadStatus: SquadStatus; event: { date: string } },
  b: { squadStatus: SquadStatus; event: { date: string } },
): number {
  const byStatus = STATUS_ORDER[a.squadStatus] - STATUS_ORDER[b.squadStatus]
  return byStatus === 0 ? a.event.date.localeCompare(b.event.date) : byStatus
}

/** Going players with a rule against them: the ones the Board may make an exception for (R-8). */
export function getBlocked(candidates: readonly Candidate[]): Candidate[] {
  return candidates.filter((candidate) => candidate.eligibility.reasons.length > 0)
}

/** The exception list after the Board allows or stops allowing one player. */
export function toggleException(
  exceptionIds: readonly string[],
  playerId: string,
  isAllowed: boolean,
): string[] {
  const others = exceptionIds.filter((id) => id !== playerId)
  return isAllowed ? [...others, playerId] : others
}

const ROLE_ORDER = { playing: 0, twelfth: 1, reserve: 2 } as const

/** The picks in squad order with names: XI as picked, then the 12th man, then reserves. */
export function toSquadList(
  picks: readonly SquadPick[],
  names: Readonly<Record<string, string>>,
): (SquadPick & { name: string })[] {
  return picks
    .map((pick, index) => ({ pick, index }))
    .sort((a, b) => ROLE_ORDER[a.pick.role] - ROLE_ORDER[b.pick.role] || a.index - b.index)
    .map(({ pick }) => ({ ...pick, name: names[pick.playerId] ?? '' }))
}
