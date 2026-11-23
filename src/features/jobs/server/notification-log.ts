import 'server-only'

import { z } from 'zod'

import { BackendError, backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf } from '@/shared/backend/schemas'

const SERVICE = { as: 'service' } as const
const HTTP_BAD_REQUEST = 400

/** The keys among these that the log already holds: sent by an earlier tick. */
export async function findLoggedKeys(keys: readonly string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set()
  const { docs } = await backendRequest({
    path: `/notification-log${toQuery({ 'where[key][in]': keys.join(','), depth: '0' })}`,
    auth: SERVICE,
    schema: listOf(z.object({ key: z.string() })),
  })
  return new Set(docs.map((doc) => doc.key))
}

/**
 * Records a notification before it is sent, under its unique key (ADR-0004). Returns `false` when
 * the key is already taken: a tick running at the same time has claimed it, so this one sends
 * nothing. Claiming first means a send never repeats; a failed send is not retried.
 */
export async function claimNotification(key: string, kind: string, userId: number) {
  try {
    await backendRequest({
      method: 'POST',
      path: '/notification-log',
      auth: SERVICE,
      body: { key, kind, user: userId },
      schema: z.unknown(),
    })
    return true
  } catch (error) {
    // The key is the only field that can be refused: the unique index says it is taken.
    if (error instanceof BackendError && error.status === HTTP_BAD_REQUEST) return false
    throw error
  }
}
