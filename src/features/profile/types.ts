import type { Role } from '@/features/auth'

/** The signed-in member as their profile shows them. */
export type Profile = {
  name: string
  email: string
  role: Role
  /** The team squad the member plays in, or `null` until the Board assigns one. */
  teamName: string | null
  /** The team a captain leads. */
  captainOfName: string | null
  /** The linked player record's name, or `null` while the account is not linked. */
  playerName: string | null
}
