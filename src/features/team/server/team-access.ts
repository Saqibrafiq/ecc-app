import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'

/**
 * Who works on a team's screens: its captain, for the team they lead, or an admin, for any team
 * (a stand-in when the captain is away). The backend checks the same (ADR-0024 in the website).
 */
export type TeamActor = {
  token: string
  /** The team a captain leads; `null` for an admin, who may act for every team. */
  teamId: number | null
  isAdmin: boolean
}

export type TeamAccess =
  | { kind: 'allowed'; actor: TeamActor }
  | { kind: 'signed-out' }
  /** Signed in, but neither a captain nor an admin: the team screens are not theirs. */
  | { kind: 'not-captain' }

export function canManageTeam(actor: TeamActor, teamId: number): boolean {
  return actor.isAdmin || actor.teamId === teamId
}

export async function getTeamAccess(): Promise<TeamAccess> {
  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  if (member.role === 'admin') {
    return { kind: 'allowed', actor: { token, teamId: null, isAdmin: true } }
  }
  if (member.role !== 'captain' || member.captainOfTeamId === null) return { kind: 'not-captain' }
  return { kind: 'allowed', actor: { token, teamId: member.captainOfTeamId, isAdmin: false } }
}
