import type { PushMessage } from '@/features/notifications'
import type { ScheduledEvent } from '@/features/week'
import { toDisplayDate } from '@/shared/lib/display-date'

import type { DueNotification } from '../types'

/** The parts of next-intl a message needs, for one locale. */
export type MessageTools = {
  /** Translates a key of the `jobs` messages. */
  t: (key: string, values?: Record<string, string | number>) => string
  weekday: (date: Date) => string
  list: (items: readonly string[]) => string
}

function describeEvent(event: ScheduledEvent, tools: MessageTools): string {
  const day = tools.weekday(toDisplayDate(event.date))
  return event.kind === 'match'
    ? tools.t('event.match', { day, opponent: event.opponent ?? '' })
    : tools.t('event.practice', { day })
}

/** The day and opponent of a match, as the match messages name it. */
function matchValues(match: ScheduledEvent, tools: MessageTools) {
  return { day: tools.weekday(toDisplayDate(match.date)), opponent: match.opponent ?? '' }
}

const fixtureNumber = (match: ScheduledEvent) => match.id.replace('fixture-', '')

/**
 * A due notification in the recipient device's language: what to do and where a tap leads. It
 * names events and counts, and only the recipient's own standing or place in a squad: never who
 * else answered or was picked (ADR-0003).
 */
export function renderMessage(notification: DueNotification, tools: MessageTools): PushMessage {
  switch (notification.kind) {
    case 'reminder': {
      const events = notification.events.map((event) => describeEvent(event, tools))
      const [only] = events
      return {
        title: tools.t('reminder.title'),
        body:
          events.length === 1 && only
            ? tools.t('reminder.one', { event: only })
            : tools.t('reminder.many', { count: events.length, events: tools.list(events) }),
        url: '/',
        // Today's reminder replaces yesterday's on the lock screen.
        tag: 'reminder',
      }
    }
    case 'check-in': {
      const { practice, going } = notification
      return {
        title: tools.t('checkIn.title', { day: tools.weekday(toDisplayDate(practice.date)) }),
        body: tools.t('checkIn.body', { going }),
        url: `/team/check-in/${practice.id.replace('practice-', '')}`,
        tag: `check-in-${practice.id}`,
      }
    }
    case 'selection': {
      const { match, going } = notification
      return {
        title: tools.t('selection.title'),
        body: tools.t('selection.body', { ...matchValues(match, tools), going }),
        url: `/team/squad/${fixtureNumber(match)}`,
        tag: `selection-${match.id}`,
      }
    }
    case 'approval': {
      const { match } = notification
      return {
        title: tools.t('approval.title'),
        body: tools.t('approval.body', { ...matchValues(match, tools), team: match.team.name }),
        url: `/board/squad/${fixtureNumber(match)}`,
        tag: `approval-${match.id}`,
      }
    }
    case 'returned': {
      const { match } = notification
      return {
        title: tools.t('returned.title'),
        body: tools.t('returned.body', matchValues(match, tools)),
        url: `/team/squad/${fixtureNumber(match)}`,
        // Replaces the prompt to pick the squad: the captain picks again.
        tag: `selection-${match.id}`,
      }
    }
    case 'announcement': {
      const { match, role } = notification
      const values = matchValues(match, tools)
      return {
        title: tools.t('announcement.title', { day: values.day }),
        body: tools.t('announcement.body', { ...values, role: role ?? 'none' }),
        url: `/squad/${fixtureNumber(match)}`,
        tag: `announcement-${match.id}`,
      }
    }
    case 'attendance': {
      const { match, countdown } = notification
      const { day } = matchValues(match, tools)
      return {
        title: tools.t('attendance.title'),
        body:
          countdown.kind === 'needs'
            ? tools.t('attendance.needs', { needed: countdown.needed, of: countdown.of, day })
            : tools.t('attendance.out', { day }),
        url: '/attendance',
        tag: 'attendance',
      }
    }
  }
}
