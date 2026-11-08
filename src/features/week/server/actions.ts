'use server'

import { z } from 'zod'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import {
  getAvailabilityDeadline,
  getPracticeDeadline,
  isOpen,
  toLocalTime,
} from '@/domain/club-rules'
import { backendRequest, isAccessError } from '@/shared/backend/client'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { REASON_MAX_LENGTH } from '../domain/reason'
import { fixtureDocSchema, parseEventId, practiceDocSchema, toLocalDay } from './map-backend'

export type AnswerResult =
  | { status: 'saved' }
  | { status: 'invalid' }
  | { status: 'closed' }
  | { status: 'unauthorized' }
  | { status: 'error' }

const answerInputSchema = z
  .object({
    eventId: z.string(),
    answer: z.enum(['going', 'not-going']),
    reason: z.string().trim().max(REASON_MAX_LENGTH).nullable(),
  })
  .refine((input) => input.answer === 'going' || Boolean(input.reason), { path: ['reason'] })

const DEFAULT_PRACTICE_TIME = toLocalTime('18:30')

/** When answers for the event close, from the club rules, read fresh from the backend. */
async function getClosesAt(
  event: { kind: 'fixture' | 'practice'; backendId: number },
  token: string,
) {
  const auth = { as: 'member', token } as const
  if (event.kind === 'practice') {
    const practice = await backendRequest({
      path: `/practice-sessions/${String(event.backendId)}?depth=0`,
      auth,
      schema: practiceDocSchema,
    })
    const time = practice.startTime ? toLocalTime(practice.startTime) : DEFAULT_PRACTICE_TIME
    return getPracticeDeadline(toLocalDay(practice.date), time)
  }
  const [fixture, squads] = await Promise.all([
    backendRequest({
      path: `/fixtures/${String(event.backendId)}?depth=1`,
      auth,
      schema: fixtureDocSchema,
    }),
    backendRequest({
      path: `/squads?where[fixture][equals]=${String(event.backendId)}&depth=0&limit=1`,
      auth,
      schema: listOf(z.object({ deadlineDay: z.enum(['tuesday', 'wednesday', 'thursday']) })),
    }),
  ])
  return getAvailabilityDeadline(toLocalDay(fixture.date), squads.docs[0]?.deadlineDay)
}

/**
 * Saves the member's Going / Not going for a match or practice (UC-2), as the member: the backend
 * checks it is their own answer (ADR-0024 in the website). Refused after the deadline (R-5).
 */
export async function answerAction(input: unknown): Promise<AnswerResult> {
  const parsed = answerInputSchema.safeParse(input)
  const event = parsed.success ? parseEventId(parsed.data.eventId) : null
  if (!parsed.success || !event) return { status: 'invalid' }

  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member?.playerId || !token) return { status: 'unauthorized' }
  const auth = { as: 'member', token } as const

  try {
    if (!isOpen(getNow(), await getClosesAt(event, token))) return { status: 'closed' }

    const { docs } = await backendRequest({
      path: `/availability-responses?where[player][equals]=${String(member.playerId)}&where[${event.kind}][equals]=${String(event.backendId)}&depth=0&limit=1`,
      auth,
      schema: listOf(z.object({ id: z.number(), player: relationIdSchema })),
    })
    const body = {
      response: parsed.data.answer,
      reason: parsed.data.answer === 'not-going' ? parsed.data.reason : null,
    }
    const [existing] = docs
    if (existing) {
      await backendRequest({
        method: 'PATCH',
        path: `/availability-responses/${String(existing.id)}`,
        auth,
        body,
        schema: z.unknown(),
      })
    } else {
      await backendRequest({
        method: 'POST',
        path: '/availability-responses',
        auth,
        body: { ...body, player: member.playerId, [event.kind]: event.backendId },
        schema: z.unknown(),
      })
    }
    return { status: 'saved' }
  } catch (error) {
    if (isAccessError(error)) return { status: 'unauthorized' }
    logError('Saving an answer failed', error)
    return { status: 'error' }
  }
}
