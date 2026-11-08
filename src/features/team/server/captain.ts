import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'

import type { CaptainRef } from './backend-team'

export type CaptainAccess =
  | { kind: 'captain'; captain: CaptainRef }
  | { kind: 'signed-out' }
  /** Signed in, but leads no team: the team screens are not theirs. */
  | { kind: 'not-captain' }

/** Who may use the team screens: a captain, for the team they lead (ADR-0024 in the website). */
export async function getCaptainAccess(): Promise<CaptainAccess> {
  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  if (member.role !== 'captain' || member.captainOfTeamId === null) return { kind: 'not-captain' }
  return { kind: 'captain', captain: { teamId: member.captainOfTeamId, token } }
}
