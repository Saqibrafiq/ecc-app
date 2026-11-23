import type { PushMessage } from '@/features/notifications'
import type { ScheduledEvent } from '@/features/week'
import { toDisplayDate } from '@/shared/lib/display-date'

import type { DueNotification } from '../domain/plan-notifications'

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

/**
 * A due notification in the recipient device's language: what to do and where a tap leads. It
 * names events and counts only, never who answered what (ADR-0003).
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
        body: tools.t('selection.body', {
          day: tools.weekday(toDisplayDate(match.date)),
          opponent: match.opponent ?? '',
          going,
        }),
        url: `/team/squad/${match.id.replace('fixture-', '')}`,
        tag: `selection-${match.id}`,
      }
    }
  }
}
