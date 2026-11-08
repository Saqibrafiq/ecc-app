'use server'

import { z } from 'zod'

import { checkSquad } from '@/domain/club-rules'
import { backendRequest, isAccessError } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { planCheckIn } from '../domain/check-in'
import { isPickable } from '../domain/selection'
import type { CheckInOutcome, SquadOutcome, SquadStatus } from '../types'
import { loadCheckIn, loadSelection } from './backend-team'
import { getTeamAccess, type TeamActor } from './team-access'

/** A captain changes a squad only before handing it in, or after the Board returned it. */
const EDITABLE_STATUSES: readonly SquadStatus[] = ['open', 'returned']

/** The largest squad list the app accepts: far above any real one, against abuse. */
const MAX_PLAYERS = 60

const playerIdSchema = z.string().regex(/^\d+$/)
const checkInSchema = z.object({
  practiceId: z.number().int().positive(),
  presentIds: z.array(playerIdSchema).max(MAX_PLAYERS),
})
const squadSchema = z.object({
  fixtureId: z.number().int().positive(),
  picks: z
    .array(z.object({ playerId: playerIdSchema, role: z.enum(['playing', 'twelfth', 'reserve']) }))
    .max(MAX_PLAYERS),
})

async function getActor(): Promise<TeamActor | null> {
  const access = await getTeamAccess()
  return access.kind === 'allowed' ? access.actor : null
}

function failure(message: string, error: unknown): { status: 'unauthorized' | 'error' } {
  if (isAccessError(error)) return { status: 'unauthorized' }
  logError(message, error)
  return { status: 'error' }
}

/**
 * Records who came to a practice and closes its check-in (UC-6), as the captain or an admin: the
 * backend checks the practice is theirs to record (ADR-0024 in the website). Opens on the practice day.
 */
export async function saveCheckInAction(input: unknown): Promise<{ status: CheckInOutcome }> {
  const parsed = checkInSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const actor = await getActor()
  if (!actor) return { status: 'unauthorized' }
  const { practiceId, presentIds } = parsed.data

  try {
    const data = await loadCheckIn(actor, practiceId, getNow())
    if (!data) return { status: 'invalid' }
    if (!data.checkIn.canCheckIn) return { status: 'not-yet' }
    const playerIds = data.checkIn.players.map((player) => player.id)
    if (presentIds.some((id) => !playerIds.includes(id))) return { status: 'invalid' }

    const auth = { as: 'member', token: actor.token } as const
    const changes = planCheckIn({
      records: data.records,
      presentIds: new Set(presentIds),
      playerIds,
      answers: data.answers,
    })
    await Promise.all(
      changes.map((change) =>
        change.kind === 'create'
          ? backendRequest({
              method: 'POST',
              path: '/attendance',
              auth,
              body: {
                practice: practiceId,
                player: Number(change.playerId),
                team: data.teamId,
                attended: true,
                isWalkIn: change.isWalkIn,
              },
              schema: z.unknown(),
            })
          : backendRequest({
              method: 'PATCH',
              path: `/attendance/${String(change.recordId)}`,
              auth,
              body: { attended: change.attended },
              schema: z.unknown(),
            }),
      ),
    )
    if (!data.checkIn.isRecorded) {
      await backendRequest({
        method: 'PATCH',
        path: `/practice-sessions/${String(practiceId)}`,
        auth,
        body: { isRecorded: true },
        schema: z.unknown(),
      })
    }
    return { status: 'saved' }
  } catch (error) {
    return failure('Saving a check-in failed', error)
  }
}

/**
 * Submits the captain's squad to the Board (UC-9): only players they may pick, the XI and the
 * 12th man complete (R-12). Once submitted it is the Board's: refused until they reopen it.
 */
export async function submitSquadAction(input: unknown): Promise<{ status: SquadOutcome }> {
  const parsed = squadSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const actor = await getActor()
  if (!actor) return { status: 'unauthorized' }
  const { fixtureId, picks } = parsed.data

  try {
    const data = await loadSelection(actor, fixtureId, getNow())
    if (!data) return { status: 'invalid' }
    // Once submitted, only the Board reopens a squad (status returned or open).
    if (!EDITABLE_STATUSES.includes(data.selection.status)) return { status: 'locked' }

    const byId = new Map(data.selection.candidates.map((candidate) => [candidate.id, candidate]))
    const isAllowed = picks.every((pick) => {
      const candidate = byId.get(pick.playerId)
      return candidate !== undefined && isPickable(candidate)
    })
    // The captain picks every player themselves, carried-over ones included: none is required.
    const check = checkSquad({ picks, carryOvers: [], notGoing: new Set() })
    if (!isAllowed || !check.isValid) return { status: 'invalid' }

    await backendRequest({
      method: 'PATCH',
      path: `/squads/${String(data.squadId)}`,
      auth: { as: 'member', token: actor.token },
      body: {
        status: 'submitted',
        picks: picks.map((pick) => ({
          player: Number(pick.playerId),
          role: pick.role,
          isBorrowed: false,
        })),
      },
      schema: z.unknown(),
    })
    return { status: 'submitted' }
  } catch (error) {
    return failure('Submitting a squad failed', error)
  }
}
