'use server'

import { getTranslations } from 'next-intl/server'
import { z } from 'zod'

import { getCurrentMember } from '@/features/auth'
import { logError } from '@/shared/lib/log'

import { describeDevice, deviceSubscriptionSchema } from '../domain/subscription'
import type { ForgetSubscriptionOutcome, SaveSubscriptionOutcome, TestPushOutcome } from '../types'
import { getVapidDetails, sendPush } from './send-push'
import { forgetSubscription, getSubscriptions, saveSubscription } from './subscriptions'

/** A user agent is a single header line; anything longer is not one. */
const MAX_USER_AGENT_LENGTH = 500

const saveSchema = z.object({
  subscription: deviceSubscriptionSchema,
  userAgent: z.string().max(MAX_USER_AGENT_LENGTH),
})
const endpointSchema = deviceSubscriptionSchema.shape.endpoint

/** Registers this device for the signed-in member's notifications (ADR-0003). */
export async function savePushSubscriptionAction(
  input: unknown,
): Promise<{ status: SaveSubscriptionOutcome }> {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { status: 'invalid' }
  if (!getVapidDetails()) return { status: 'unavailable' }
  const member = await getCurrentMember()
  if (!member) return { status: 'unauthorized' }

  try {
    await saveSubscription(
      member.id,
      parsed.data.subscription,
      describeDevice(parsed.data.userAgent),
    )
    return { status: 'saved' }
  } catch (error) {
    logError('Saving a push subscription failed', error)
    return { status: 'error' }
  }
}

/** Removes this device from the signed-in member's notifications. */
export async function forgetPushSubscriptionAction(
  endpoint: unknown,
): Promise<{ status: ForgetSubscriptionOutcome }> {
  const parsed = endpointSchema.safeParse(endpoint)
  if (!parsed.success) return { status: 'invalid' }
  const member = await getCurrentMember()
  if (!member) return { status: 'unauthorized' }

  try {
    await forgetSubscription(member.id, parsed.data)
    return { status: 'forgotten' }
  } catch (error) {
    logError('Removing a push subscription failed', error)
    return { status: 'error' }
  }
}

/** Sends a test notification to every device of the signed-in member, in their language. */
export async function sendTestPushAction(): Promise<{ status: TestPushOutcome }> {
  if (!getVapidDetails()) return { status: 'unavailable' }
  const member = await getCurrentMember()
  if (!member) return { status: 'unauthorized' }

  try {
    const [t, subscriptions] = await Promise.all([
      getTranslations('notifications.test'),
      getSubscriptions([member.id]),
    ])
    if (subscriptions.length === 0) return { status: 'no-device' }
    const report = await sendPush(subscriptions, {
      title: t('title'),
      body: t('body'),
      url: '/profile',
      tag: 'test',
    })
    if (report.sent > 0) return { status: 'sent' }
    return { status: report.failed > 0 ? 'error' : 'no-device' }
  } catch (error) {
    logError('Sending a test notification failed', error)
    return { status: 'error' }
  }
}
