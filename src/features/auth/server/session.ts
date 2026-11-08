import 'server-only'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { backendRequest, isAccessError, isBackendConfigured } from '@/shared/backend/client'
import { relationIdSchema } from '@/shared/backend/schemas'

import type { Member } from '../types'

/** HTTP-only, so scripts in the page never see the backend token (arc42 §8.2). */
export const SESSION_COOKIE = 'ecc-session'

const meSchema = z.object({
  user: z
    .object({
      id: z.number(),
      email: z.string(),
      name: z.string().nullish(),
      role: z.enum(['player', 'captain', 'admin']),
      player: relationIdSchema.nullish(),
      captainOf: relationIdSchema.nullish(),
    })
    .nullable(),
})

/** The backend token of the current session, if there is one. */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

/**
 * The signed-in member, or `null` without a valid session (none, expired, or revoked). In the
 * preview (no backend) there is never a member.
 */
export async function getCurrentMember(): Promise<Member | null> {
  if (!isBackendConfigured()) return null
  const token = await getSessionToken()
  if (!token) return null

  try {
    const { user } = await backendRequest({
      path: '/users/me',
      auth: { as: 'member', token },
      schema: meSchema,
    })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      playerId: user.player ?? null,
      captainOfTeamId: user.captainOf ?? null,
    }
  } catch (error) {
    if (isAccessError(error)) return null
    throw error
  }
}
