import 'server-only'

import { z } from 'zod'

import { fixtureDocSchema, toMatchEvent } from '@/features/week'
import { type BackendAuth, BackendError, backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { buildTeamSheet } from '../domain/build-team-sheet'
import type { TeamSheet } from '../types'

const NOT_FOUND = 404

const squadDocSchema = z.object({
  status: z.enum(['open', 'submitted', 'approved', 'returned']),
  // Members read the picks only once the squad is announced (the website's field access).
  picks: z
    .array(z.object({ player: relationIdSchema, role: z.enum(['playing', 'twelfth', 'reserve']) }))
    .nullish(),
})

export type BackendTeamSheet =
  { kind: 'sheet'; sheet: TeamSheet } | { kind: 'not-announced' } | { kind: 'not-found' }

/** The viewer: their session, and their player to find on the sheet (`null` if not linked). */
export type SheetViewer = { token: string; playerId: number | null }

async function findFixture(auth: BackendAuth, fixtureId: number) {
  try {
    return await backendRequest({
      path: `/fixtures/${String(fixtureId)}?depth=1`,
      auth,
      schema: fixtureDocSchema,
    })
  } catch (error) {
    if (error instanceof BackendError && error.status === NOT_FOUND) return null
    throw error
  }
}

async function findSquad(auth: BackendAuth, fixtureId: number) {
  const { docs } = await backendRequest({
    path: `/squads${toQuery({ 'where[fixture][equals]': String(fixtureId), depth: '0' })}`,
    auth,
    schema: listOf(squadDocSchema),
  })
  return docs[0] ?? null
}

async function getNames(auth: BackendAuth, playerIds: readonly string[]) {
  const { docs } = await backendRequest({
    path: `/players${toQuery({ 'where[id][in]': playerIds.join(','), depth: '0' })}`,
    auth,
    schema: listOf(z.object({ id: z.number(), name: z.string() })),
  })
  return new Map(docs.map((doc) => [String(doc.id), doc.name]))
}

/**
 * A match's announced squad, read as the member (UC-12): any member may see it once the Board has
 * announced it, and nobody but the captain and the Board before.
 */
export async function loadTeamSheet(
  viewer: SheetViewer,
  fixtureId: number,
): Promise<BackendTeamSheet> {
  const auth: BackendAuth = { as: 'member', token: viewer.token }
  const fixture = await findFixture(auth, fixtureId)
  const match = fixture ? toMatchEvent(fixture) : null
  if (!match) return { kind: 'not-found' }

  const squad = await findSquad(auth, fixtureId)
  if (squad?.status !== 'approved') return { kind: 'not-announced' }

  const picks = (squad.picks ?? []).map((pick) => ({
    playerId: String(pick.player),
    role: pick.role,
  }))
  const names =
    picks.length === 0
      ? new Map<string, string>()
      : await getNames(
          auth,
          picks.map((pick) => pick.playerId),
        )
  const viewerId = viewer.playerId === null ? null : String(viewer.playerId)
  return {
    kind: 'sheet',
    sheet: { fixtureId, match, players: buildTeamSheet(picks, names, viewerId) },
  }
}
