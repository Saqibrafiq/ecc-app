'use server'

import { z } from 'zod'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { backendRequest, isAccessError } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { CORRECTION_NOTE_MAX_LENGTH } from '../domain/correction'
import type { CorrectionOutcome } from '../types'
import { getBackendLedger } from './backend-attendance'

const correctionSchema = z.object({
  practiceId: z.number().int().positive(),
  note: z.string().trim().min(1).max(CORRECTION_NOTE_MAX_LENGTH),
})

/**
 * Asks the captain to mark the member present at a practice they were recorded absent from
 * (UC-18), as the member: the backend only lets them ask for themselves (ADR-0024 in the website).
 */
export async function requestCorrectionAction(
  input: unknown,
): Promise<{ status: CorrectionOutcome }> {
  const parsed = correctionSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member?.playerId || !token) return { status: 'unauthorized' }
  const { practiceId, note } = parsed.data

  try {
    const result = await getBackendLedger(
      { playerId: member.playerId, token, isCaptain: member.role === 'captain' },
      getNow(),
    )
    const practice =
      result.kind === 'ledger'
        ? result.ledger.months
            .flatMap((month) => month.practices)
            .find((entry) => entry.practiceId === practiceId)
        : undefined
    if (!practice?.canRequestCorrection) return { status: 'invalid' }

    await backendRequest({
      method: 'POST',
      path: '/attendance-corrections',
      auth: { as: 'member', token },
      body: { practice: practiceId, player: member.playerId, note },
      schema: z.unknown(),
    })
    return { status: 'requested' }
  } catch (error) {
    if (isAccessError(error)) return { status: 'unauthorized' }
    logError('Requesting an attendance correction failed', error)
    return { status: 'error' }
  }
}
