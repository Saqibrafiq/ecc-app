import 'server-only'

import { z } from 'zod'

import { backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import type { Locale } from '@/i18n/routing'

import type { DeviceSubscription } from '../types'

const SERVICE = { as: 'service' } as const

const subscriptionDocSchema = z.object({
  id: z.number(),
  user: relationIdSchema,
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  locale: z.enum(['en', 'de']).catch('en'),
})

/** A stored device, ready to send to, in the language it was registered in. */
export type StoredSubscription = { id: number; userId: number; locale: Locale } & DeviceSubscription

function toStored(doc: z.infer<typeof subscriptionDocSchema>): StoredSubscription {
  return {
    id: doc.id,
    userId: doc.user,
    locale: doc.locale,
    endpoint: doc.endpoint,
    keys: { p256dh: doc.p256dh, auth: doc.auth },
  }
}

async function findByEndpoint(endpoint: string) {
  const { docs } = await backendRequest({
    path: `/push-subscriptions${toQuery({ 'where[endpoint][equals]': endpoint, depth: '0' })}`,
    auth: SERVICE,
    schema: listOf(subscriptionDocSchema),
  })
  return docs
}

/**
 * Registers a device for a member, or moves it to them: an endpoint belongs to one browser, so
 * when someone else signs in on a shared phone, the device follows the new member. Written by the
 * app's service account after the app checked the member's session (ADR-0002).
 */
export async function saveSubscription(
  userId: number,
  subscription: DeviceSubscription,
  device: string,
  locale: Locale,
): Promise<void> {
  const body = {
    user: userId,
    locale,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: device,
  }
  const [existing] = await findByEndpoint(subscription.endpoint)
  await backendRequest({
    method: existing ? 'PATCH' : 'POST',
    path: existing ? `/push-subscriptions/${String(existing.id)}` : '/push-subscriptions',
    auth: SERVICE,
    body,
    schema: z.unknown(),
  })
}

/** Removes a member's device; someone else's device with that endpoint is left alone. */
export async function forgetSubscription(userId: number, endpoint: string): Promise<void> {
  const docs = (await findByEndpoint(endpoint)).filter((doc) => doc.user === userId)
  await Promise.all(docs.map((doc) => deleteSubscription(doc.id)))
}

export async function deleteSubscription(id: number): Promise<void> {
  await backendRequest({
    method: 'DELETE',
    path: `/push-subscriptions/${String(id)}`,
    auth: SERVICE,
    schema: z.unknown(),
  })
}

/** Every registered device of these members. */
export async function getSubscriptions(userIds: readonly number[]): Promise<StoredSubscription[]> {
  if (userIds.length === 0) return []
  const { docs } = await backendRequest({
    path: `/push-subscriptions${toQuery({ 'where[user][in]': userIds.join(','), depth: '0' })}`,
    auth: SERVICE,
    schema: listOf(subscriptionDocSchema),
  })
  return docs.map(toStored)
}
