'use server'

import { z } from 'zod'

import { checkSquad } from '@/domain/club-rules'
import { backendRequest, isAccessError } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { planCheckIn } from '../domain/check-in'
import { isPickable } from '../domain/selection'
import type { CheckInOutcome, SquadOutcome } from '../types'
import { type CaptainRef, loadCheckIn, loadSelection } from './backend-team'
import { getCaptainAccess } from './captain'

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

async function getCaptain(): Promise<CaptainRef | null> {
  const access = await getCaptainAccess()
  return access.kind === 'captain' ? access.captain : null
}

function failure(message: string, error: unknown): { status: 'unauthorized' | 'error' } {
  if (isAccessError(error)) return { status: 'unauthorized' }
  logError(message, error)
  return { status: 'error' }
}

/**
 * Records who came to a practice and closes its check-in (UC-6), as the captain: the backend
 * checks the practice is their team's (ADR-0024 in the website). Opens on the practice day.
 */
export async function saveCheckInAction(input: unknown): Promise<{ status: CheckInOutcome }> {
  const parsed = checkInSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const captain = await getCaptain()
  if (!captain) return { status: 'unauthorized' }
  const { practiceId, presentIds } = parsed.data

  try {
    const data = await loadCheckIn(captain, practiceId, getNow())
    if (!data) return { status: 'invalid' }
    if (!data.checkIn.canCheckIn) return { status: 'not-yet' }
    const playerIds = data.checkIn.players.map((player) => player.id)
    if (presentIds.some((id) => !playerIds.includes(id))) return { status: 'invalid' }

    const auth = { as: 'member', token: captain.token } as const
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
                team: captain.teamId,
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
 * 12th man complete, carried-over players in the XI (R-12, R-13). Refused once announced.
 */
export async function submitSquadAction(input: unknown): Promise<{ status: SquadOutcome }> {
  const parsed = squadSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const captain = await getCaptain()
  if (!captain) return { status: 'unauthorized' }
  const { fixtureId, picks } = parsed.data

  try {
    const data = await loadSelection(captain, fixtureId, getNow())
    if (!data) return { status: 'invalid' }
    if (data.selection.status === 'approved') return { status: 'locked' }

    const byId = new Map(data.selection.candidates.map((candidate) => [candidate.id, candidate]))
    const isAllowed = picks.every((pick) => {
      const candidate = byId.get(pick.playerId)
      return candidate !== undefined && (candidate.isCarriedOver || isPickable(candidate))
    })
    const check = checkSquad({ picks, carryOvers: data.carryOvers, notGoing: data.notGoing })
    if (!isAllowed || !check.isValid) return { status: 'invalid' }

    await backendRequest({
      method: 'PATCH',
      path: `/squads/${String(data.squadId)}`,
      auth: { as: 'member', token: captain.token },
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
