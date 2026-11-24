import 'server-only'

import { getFormatter, getTranslations } from 'next-intl/server'

import {
  getSubscriptions,
  type SendReport,
  sendPush,
  type StoredSubscription,
} from '@/features/notifications'
import type { Locale } from '@/i18n/routing'

import { planNotifications } from '../domain/plan-notifications'
import type { DueNotification } from '../types'
import { loadTickData } from './load-tick-data'
import { claimNotification, findLoggedKeys } from './notification-log'
import { type MessageTools, renderMessage } from './render-message'

/** What a tick did: notifications due, already sent earlier, sent now, and the deliveries. */
export type TickReport = {
  due: number
  alreadySent: number
  sent: number
  deliveries: SendReport
}

async function getTools(locale: Locale): Promise<MessageTools> {
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: 'jobs' }),
    getFormatter({ locale }),
  ])
  return {
    // The message keys are typed per namespace; renderMessage's keys are checked by its tests.
    t: (key, values) => (t as (key: string, values?: object) => string)(key, values),
    weekday: (date) => format.dateTime(date, { weekday: 'long' }),
    list: (items) => format.list(items, { type: 'conjunction' }),
  }
}

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of items) groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item])
  return groups
}

async function deliver(
  notification: DueNotification,
  devices: readonly StoredSubscription[],
  report: SendReport,
): Promise<void> {
  for (const [locale, group] of groupBy(devices, (device) => device.locale)) {
    const result = await sendPush(group, renderMessage(notification, await getTools(locale)))
    report.sent += result.sent
    report.expired += result.expired
    report.failed += result.failed
  }
}

/**
 * One scheduled tick (ADR-0004): creates the week's missing practices, works out every
 * notification due now, and sends each one exactly once to the recipient's devices, each in its
 * own language. Members without a registered device are skipped: there is nothing to send to.
 */
export async function runTick(now: Date): Promise<TickReport> {
  const due = planNotifications(await loadTickData(now))
  const devices = groupBy(
    await getSubscriptions([...new Set(due.map((notification) => notification.userId))]),
    (device) => device.userId,
  )
  const reachable = due.flatMap((notification) => {
    const recipientDevices = devices.get(notification.userId)
    return recipientDevices ? [{ notification, recipientDevices }] : []
  })
  const logged = await findLoggedKeys(reachable.map((item) => item.notification.key))

  const report: TickReport = {
    due: due.length,
    alreadySent: logged.size,
    sent: 0,
    deliveries: { sent: 0, expired: 0, failed: 0 },
  }
  for (const { notification, recipientDevices } of reachable) {
    if (logged.has(notification.key)) continue
    const isClaimed = await claimNotification(
      notification.key,
      notification.kind,
      notification.userId,
    )
    if (!isClaimed) {
      report.alreadySent += 1
      continue
    }
    await deliver(notification, recipientDevices, report.deliveries)
    report.sent += 1
  }
  return report
}
