import 'server-only'

import { getTeamAccess, type TeamActor } from '@/features/team'

export type BoardAccess =
  | { kind: 'board'; actor: TeamActor }
  | { kind: 'signed-out' }
  /** Signed in, but not on the Board: approvals are theirs alone (ADR-0024 in the website). */
  | { kind: 'not-board' }

/** The Board screens are for admins only. */
export async function getBoardAccess(): Promise<BoardAccess> {
  const access = await getTeamAccess()
  if (access.kind === 'signed-out') return access
  if (access.kind === 'allowed' && access.actor.isAdmin) {
    return { kind: 'board', actor: access.actor }
  }
  return { kind: 'not-board' }
}
