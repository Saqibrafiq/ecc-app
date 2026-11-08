export type Role = 'player' | 'captain' | 'admin'

/** The signed-in member, as the backend knows them (ADR-0024 in the website). */
export type Member = {
  id: number
  email: string
  name: string | null
  role: Role
  /** The player record this account belongs to; `null` until the Board links it. */
  playerId: number | null
  /** The team a captain leads. */
  captainOfTeamId: number | null
}
