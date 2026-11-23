import 'server-only'

import { sendNotification, WebPushError } from 'web-push'

import { getServerEnv } from '@/shared/config/env'
import { logError } from '@/shared/lib/log'

import type { PushMessage, SendReport } from '../types'
import { deleteSubscription, type StoredSubscription } from './subscriptions'

/** A reminder that arrives a day late is no longer worth showing. */
const TIME_TO_LIVE_SECONDS = 24 * 60 * 60
/** The push service no longer knows the subscription: the member revoked it, or it expired. */
const GONE = new Set([404, 410])

/** The VAPID key pair and subject, or `null` when this server sends no notifications. */
export function getVapidDetails() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = getServerEnv()
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return null
  return { subject: VAPID_SUBJECT, publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY }
}

/** The key the browser subscribes with, or `null` when notifications are unavailable. */
export function getPushPublicKey(): string | null {
  return getVapidDetails()?.publicKey ?? null
}

type Delivery = 'sent' | 'expired' | 'failed'

async function deliver(
  subscription: StoredSubscription,
  payload: string,
  vapidDetails: NonNullable<ReturnType<typeof getVapidDetails>>,
): Promise<Delivery> {
  try {
    await sendNotification(subscription, payload, {
      vapidDetails,
      TTL: TIME_TO_LIVE_SECONDS,
      urgency: 'normal',
    })
    return 'sent'
  } catch (error) {
    if (error instanceof WebPushError && GONE.has(error.statusCode)) {
      await deleteSubscription(subscription.id)
      return 'expired'
    }
    logError('Sending a push notification failed', error)
    return 'failed'
  }
}

/**
 * Sends one message to these devices, encrypted for each (ADR-0003). A device the push service no
 * longer knows is removed; one failure never stops the others.
 */
export async function sendPush(
  subscriptions: readonly StoredSubscription[],
  message: PushMessage,
): Promise<SendReport> {
  const report: SendReport = { sent: 0, expired: 0, failed: 0 }
  const vapidDetails = getVapidDetails()
  if (!vapidDetails) return { ...report, failed: subscriptions.length }

  const payload = JSON.stringify(message)
  const results = await Promise.all(
    subscriptions.map((subscription) => deliver(subscription, payload, vapidDetails)),
  )
  for (const result of results) report[result] += 1
  return report
}
