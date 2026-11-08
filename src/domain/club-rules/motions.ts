/**
 * The General Meeting motions the app enforces or reminds members of. Every rule that blocks or
 * warns a member names its motion, so the app can always say why (arc42 §1.1, "Club motions").
 */
export const MOTIONS = {
  /** At least 2 of the last 4 club training sessions to be eligible to play. */
  trainingAttendance: '2023/01',
  /** Captains and vice-captains available for at least 80 % of the season. */
  captainAvailability: '2023/05',
  /** Every player available for at least 50 % of away matches. */
  awayAvailability: '2023/06',
  /** The twelfth man plays the next match; a selected player who fails to appear sits it out. */
  twelfthMan: '2023/10',
  /** New members without a long-term commitment may not play in an upper league. */
  newMembersUpperLeagues: '2024/06',
  /** Squads of fifteen; borrowing only when a squad cannot field an XI, with both captains' agreement. */
  squadSelection: '2026/02',
  /** ECC league matches come first; no declaring oneself unavailable to play tennis- or tape-ball. */
  leaguePriority: '2026/03',
  /** The club records every squad's availability for matches and training, open to all members. */
  availabilitySheet: '2026/06',
} as const

export type MotionId = (typeof MOTIONS)[keyof typeof MOTIONS]
