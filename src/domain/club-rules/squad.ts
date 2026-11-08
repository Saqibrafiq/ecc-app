/** R-12: a match squad is a playing XI and one 12th man; reserves may be added (motion 2023/09). */
export const PLAYING_XI_SIZE = 11
export const TWELFTH_MEN = 1

/**
 * - `playing`: in the playing XI.
 * - `twelfth`: the 12th man; plays the team's next match automatically (R-13, motion 2023/10).
 * - `reserve`: an extra player, e.g. for two games on one day; also plays the next match (R-13).
 */
export type SquadRole = 'playing' | 'twelfth' | 'reserve'

export type SquadPick = {
  playerId: string
  role: SquadRole
}

export type SquadProblem =
  | { code: 'playing-count'; count: number }
  | { code: 'twelfth-count'; count: number }
  | { code: 'duplicate'; playerId: string }
  /** A carried-over player who is available but not in the playing XI. */
  | { code: 'carry-over-not-playing'; playerId: string }

export type SquadCheck = {
  isValid: boolean
  problems: SquadProblem[]
  /**
   * Carried-over players who answered Not going: they give up the automatic place for this match
   * and are selected normally from the next match on (Q-14). They are told so.
   */
  forfeitedCarryOvers: string[]
}

export type SquadCheckInput = {
  picks: readonly SquadPick[]
  /** Players carried over from the team's previous match (R-13). */
  carryOvers: readonly string[]
  /** Players who answered Not going for this match. */
  notGoing: ReadonlySet<string>
}

/**
 * The players who play the team's next match without any selection: last match's 12th man and
 * its reserves (R-13).
 */
export function getCarryOvers(previousSquad: readonly SquadPick[]): string[] {
  return previousSquad.filter((pick) => pick.role !== 'playing').map((pick) => pick.playerId)
}

function findDuplicates(picks: readonly SquadPick[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const { playerId } of picks) {
    if (seen.has(playerId)) duplicates.add(playerId)
    seen.add(playerId)
  }
  return [...duplicates]
}

/**
 * Checks a captain's squad before it goes to the admin (R-12, R-13): exactly 11 playing and one
 * 12th man, nobody picked twice, and every available carried-over player in the playing XI.
 */
export function checkSquad({ picks, carryOvers, notGoing }: SquadCheckInput): SquadCheck {
  const problems: SquadProblem[] = []
  const count = (role: SquadRole) => picks.filter((pick) => pick.role === role).length

  if (count('playing') !== PLAYING_XI_SIZE) {
    problems.push({ code: 'playing-count', count: count('playing') })
  }
  if (count('twelfth') !== TWELFTH_MEN) {
    problems.push({ code: 'twelfth-count', count: count('twelfth') })
  }
  for (const playerId of findDuplicates(picks)) {
    problems.push({ code: 'duplicate', playerId })
  }

  const playing = new Set(picks.filter((p) => p.role === 'playing').map((p) => p.playerId))
  const forfeitedCarryOvers = carryOvers.filter((playerId) => notGoing.has(playerId))
  for (const playerId of carryOvers) {
    if (!notGoing.has(playerId) && !playing.has(playerId)) {
      problems.push({ code: 'carry-over-not-playing', playerId })
    }
  }

  return { isValid: problems.length === 0, problems, forfeitedCarryOvers }
}
