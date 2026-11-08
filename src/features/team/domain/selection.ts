import {
  getAttendanceStatus,
  getEligibility,
  type LocalDate,
  PLAYING_XI_SIZE,
  type SquadPick,
  type SquadRole,
  type TeamPractice,
  TWELFTH_MEN,
} from '@/domain/club-rules'
import type { Answer } from '@/features/week'

import type { Candidate } from '../types'

export function countRole(picks: readonly SquadPick[], role: SquadRole): number {
  return picks.filter((pick) => pick.role === role).length
}

/** The role the captain's next tap gives: the XI first, then the 12th man, then reserves. */
export function getNextRole(picks: readonly SquadPick[]): SquadRole {
  if (countRole(picks, 'playing') < PLAYING_XI_SIZE) return 'playing'
  if (countRole(picks, 'twelfth') < TWELFTH_MEN) return 'twelfth'
  return 'reserve'
}

/** A tap on a player: takes them out of the squad, or puts them in the next open role. */
export function togglePick(picks: readonly SquadPick[], playerId: string): SquadPick[] {
  if (picks.some((pick) => pick.playerId === playerId)) {
    return picks.filter((pick) => pick.playerId !== playerId)
  }
  return [...picks, { playerId, role: getNextRole(picks) }]
}

/** Whether the captain can tap a candidate: anyone the rules allow; nothing is picked for them. */
export function isPickable(candidate: Candidate): boolean {
  return candidate.eligibility.verdict !== 'not-selectable'
}

const VERDICT_ORDER = { selectable: 0, conditional: 1, 'not-selectable': 2 } as const

function compareCandidates(a: Candidate, b: Candidate): number {
  const byVerdict = VERDICT_ORDER[a.eligibility.verdict] - VERDICT_ORDER[b.eligibility.verdict]
  return byVerdict === 0 ? a.name.localeCompare(b.name) : byVerdict
}

export type CandidateInput = {
  players: readonly { id: string; name: string; isEcc1Eligible: boolean }[]
  answers: ReadonlyMap<string, Answer>
  isFirstTeam: boolean
  practices: readonly TeamPractice[]
  attendedByPlayer: ReadonlyMap<string, ReadonlySet<string>>
  carryOvers: readonly string[]
  noShows: ReadonlySet<string>
  exceptions: ReadonlySet<string>
  matchDate: LocalDate
  today: LocalDate
  seasonStart: LocalDate
}

/**
 * The players the captain chooses from: everyone who said Going, each with their eligibility
 * (R-2, R-4, R-8, R-13, R-14). Selectable first, then possible and not selectable, each by name.
 */
export function buildCandidates(input: CandidateInput): Candidate[] {
  const carryOvers = new Set(input.carryOvers)
  return input.players
    .filter((player) => input.answers.get(player.id) === 'going')
    .map((player) => {
      const status = getAttendanceStatus({
        practices: input.practices,
        attendedPracticeIds: input.attendedByPlayer.get(player.id) ?? new Set(),
        matchDate: input.matchDate,
        today: input.today,
        seasonStart: input.seasonStart,
      })
      const isCarriedOver = carryOvers.has(player.id)
      return {
        id: player.id,
        name: player.name,
        answer: input.answers.get(player.id) ?? null,
        eligibility: getEligibility({
          isFirstTeam: input.isFirstTeam,
          isEcc1Eligible: player.isEcc1Eligible,
          attendance: status.standing,
          missedPreviousMatch: input.noShows.has(player.id),
          isCarriedOver,
          hasException: input.exceptions.has(player.id),
        }),
        attendance: {
          attended: status.attended,
          required: status.required,
          isRuleActive: status.isRuleActive,
        },
        isCarriedOver,
      }
    })
    .sort(compareCandidates)
}

/** The club's first team ("ECC I"), where only ECC I eligible players play (R-4, motion 2024/06). */
export function isFirstTeam(teamName: string): boolean {
  return /\sI$/.test(teamName.trim())
}
