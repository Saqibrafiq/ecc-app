import 'server-only'

import { z } from 'zod'

import type { Member } from '@/features/auth'
import { getClubTeams } from '@/features/week'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { relationIdSchema } from '@/shared/backend/schemas'

import type { Profile } from '../types'

const playerSchema = z.object({ name: z.string(), squadTeam: relationIdSchema.nullish() })

async function getPlayer(auth: BackendAuth, playerId: number) {
  return backendRequest({
    path: `/players/${String(playerId)}?depth=0`,
    auth,
    schema: playerSchema,
  })
}

/** The member's profile, read as the member: their player record and team names. */
export async function getBackendProfile(member: Member, token: string): Promise<Profile> {
  const auth: BackendAuth = { as: 'member', token }
  const [teams, player] = await Promise.all([
    getClubTeams(auth),
    member.playerId === null ? Promise.resolve(null) : getPlayer(auth, member.playerId),
  ])
  const teamName = (id: number | null | undefined) =>
    id === null || id === undefined ? null : (teams.get(id)?.name ?? null)

  return {
    name: member.name ?? player?.name ?? member.email,
    email: member.email,
    role: member.role,
    teamName: teamName(player?.squadTeam),
    captainOfName: member.role === 'captain' ? teamName(member.captainOfTeamId) : null,
    playerName: player?.name ?? null,
  }
}
