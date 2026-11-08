'use server'

import { z } from 'zod'

import { loadSelection, type SelectionData, type TeamActor } from '@/features/team'
import { backendRequest, isAccessError } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import {
  canApprove,
  canChangeRules,
  canSendBack,
  NOTE_MAX_LENGTH,
  toggleException,
} from '../domain/board'
import type { BoardActionResult } from '../types'
import { getBoardAccess } from './board-access'

const fixtureSchema = z.object({ fixtureId: z.number().int().positive() })

type Decision<T> = {
  schema: z.ZodType<T & { fixtureId: number }>
  isAllowed: (data: SelectionData) => boolean
  toChange: (input: T, data: SelectionData) => Record<string, unknown>
  failure: string
}

/**
 * One Board decision on a squad, as the admin: the input is checked, the squad read fresh, the
 * decision allowed for its status, then the squad changed (ADR-0024 in the website).
 */
async function decide<T>(input: unknown, decision: Decision<T>): Promise<BoardActionResult> {
  const parsed = decision.schema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const access = await getBoardAccess()
  if (access.kind !== 'board') return { status: 'unauthorized' }
  const actor: TeamActor = access.actor

  try {
    const data = await loadSelection(actor, parsed.data.fixtureId, getNow())
    if (!data) return { status: 'invalid' }
    if (!decision.isAllowed(data)) return { status: 'not-allowed' }
    await backendRequest({
      method: 'PATCH',
      path: `/squads/${String(data.squadId)}`,
      auth: { as: 'member', token: actor.token },
      body: decision.toChange(parsed.data, data),
      schema: z.unknown(),
    })
    return { status: 'saved' }
  } catch (error) {
    if (isAccessError(error)) return { status: 'unauthorized' }
    logError(decision.failure, error)
    return { status: 'error' }
  }
}

/** Approves and announces a handed-in squad (UC-11). */
export async function approveSquadAction(input: unknown): Promise<BoardActionResult> {
  return decide(input, {
    schema: fixtureSchema,
    isAllowed: (data) => canApprove(data.selection.status),
    toChange: () => ({ status: 'approved', approvedAt: getNow().toISOString() }),
    failure: 'Approving a squad failed',
  })
}

/** Reopens a handed-in or announced squad for the captain, with the Board's note (UC-11). */
export async function sendBackSquadAction(input: unknown): Promise<BoardActionResult> {
  return decide(input, {
    schema: fixtureSchema.extend({ note: z.string().trim().min(1).max(NOTE_MAX_LENGTH) }),
    isAllowed: (data) => canSendBack(data.selection.status),
    toChange: ({ note }) => ({ status: 'returned', note }),
    failure: 'Sending a squad back failed',
  })
}

/** Moves the availability deadline to Tuesday, Wednesday or Thursday (UC-10). */
export async function setDeadlineAction(input: unknown): Promise<BoardActionResult> {
  return decide(input, {
    schema: fixtureSchema.extend({ deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']) }),
    isAllowed: (data) => canChangeRules(data.selection.status),
    toChange: ({ deadlineDay }) => ({ deadlineDay }),
    failure: 'Changing a deadline failed',
  })
}

/** Makes a blocked player selectable for this match, or takes that back (UC-14, R-8). */
export async function setExceptionAction(input: unknown): Promise<BoardActionResult> {
  return decide(input, {
    schema: fixtureSchema.extend({ playerId: z.string().regex(/^\d+$/), isAllowed: z.boolean() }),
    isAllowed: (data) => canChangeRules(data.selection.status),
    toChange: ({ playerId, isAllowed }, data) => ({
      exceptions: toggleException(data.exceptionIds, playerId, isAllowed).map(Number),
    }),
    failure: 'Changing an exception failed',
  })
}
