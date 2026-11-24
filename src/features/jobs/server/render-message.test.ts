import { createFormatter, createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'
import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'
import { TIME_ZONE } from '@/i18n/routing'

import { type MessageTools, renderMessage } from './render-message'

/** The real catalogues: a missing or misspelt key fails here, not on a member's phone. */
function tools(locale: 'en' | 'de'): MessageTools {
  const t = createTranslator({ locale, messages: locale === 'en' ? en : de, namespace: 'jobs' })
  const format = createFormatter({ locale, timeZone: TIME_ZONE })
  return {
    t: (key, values) => (t as (key: string, values?: object) => string)(key, values),
    weekday: (date) => format.dateTime(date, { weekday: 'long' }),
    list: (items) => format.list(items, { type: 'conjunction' }),
  }
}

const TEAM = { id: '1', name: 'ECC I' }
const MATCH: ScheduledEvent = {
  id: 'fixture-60',
  kind: 'match',
  team: TEAM,
  date: day('2026-11-14'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'NCC-I',
}
const PRACTICE: ScheduledEvent = {
  id: 'practice-7',
  kind: 'practice',
  team: TEAM,
  date: day('2026-11-11'),
  startTime: time('18:30'),
  ground: 'Erlangen',
}

const reminder = (events: ScheduledEvent[]) =>
  ({ kind: 'reminder', key: 'k', userId: 1, events }) as const

describe('renderMessage', () => {
  it('asks for one answer, or lists every answer still needed', () => {
    expect(renderMessage(reminder([MATCH]), tools('en'))).toEqual({
      title: 'Are you in?',
      body: "Answer for Saturday's match vs NCC-I.",
      url: '/',
      tag: 'reminder',
    })
    expect(renderMessage(reminder([MATCH, PRACTICE]), tools('en')).body).toBe(
      "2 answers needed: Saturday's match vs NCC-I and Wednesday's practice.",
    )
  })

  it('speaks the language the device was registered in', () => {
    expect(renderMessage(reminder([MATCH, PRACTICE]), tools('de'))).toMatchObject({
      title: 'Bist du dabei?',
      body: '2 Antworten fehlen: das Spiel am Samstag gegen NCC-I und das Training am Mittwoch.',
    })
  })

  it('takes the captain to the practice check-in, with how many said Going', () => {
    const checkIn = (going: number) =>
      renderMessage(
        { kind: 'check-in', key: 'k', userId: 1, practice: PRACTICE, going },
        tools('en'),
      )

    expect(checkIn(9)).toEqual({
      title: "Check in Wednesday's practice",
      body: "9 players said they're going. Mark who came.",
      url: '/team/check-in/7',
      tag: 'check-in-practice-7',
    })
    expect(checkIn(0).body).toBe("Nobody said they're going. Mark who came.")
    expect(checkIn(1).body).toBe("1 player said they're going. Mark who came.")
  })

  it('leaves the opponent out while it is not known', () => {
    const unknown = { ...MATCH, opponent: undefined }
    expect(renderMessage(reminder([unknown]), tools('en')).body).toBe(
      "Answer for Saturday's match vs .",
    )
    expect(
      renderMessage(
        { kind: 'selection', key: 'k', userId: 1, match: unknown, going: 1 },
        tools('en'),
      ).body,
    ).toBe("Answers for Saturday's match vs  have closed: 1 player going.")
  })

  it('takes the captain to the squad selection once answers have closed', () => {
    expect(
      renderMessage(
        { kind: 'selection', key: 'k', userId: 1, match: MATCH, going: 14 },
        tools('de'),
      ),
    ).toEqual({
      title: 'Stell deinen Kader auf',
      body: 'Die Antworten für das Spiel am Samstag gegen NCC-I sind geschlossen: 14 Zusagen.',
      url: '/team/squad/60',
      tag: 'selection-fixture-60',
    })
  })

  it('asks the Board to approve a handed-in squad', () => {
    expect(
      renderMessage({ kind: 'approval', key: 'k', userId: 6, match: MATCH }, tools('en')),
    ).toEqual({
      title: 'Squad ready for approval',
      body: "ECC I's squad for Saturday's match vs NCC-I is waiting for your approval.",
      url: '/board/squad/60',
      tag: 'approval-fixture-60',
    })
  })

  it('takes the captain back to a squad the Board sent back, in place of the prompt to pick', () => {
    expect(
      renderMessage({ kind: 'returned', key: 'k', userId: 1, match: MATCH }, tools('de')),
    ).toEqual({
      title: 'Kader zurückgegeben',
      body: 'Der Vorstand hat deinen Kader für das Spiel am Samstag gegen NCC-I zurückgegeben. Öffne ihn, um die Notiz zu lesen.',
      url: '/team/squad/60',
      tag: 'selection-fixture-60',
    })
  })

  it('tells each player their place in the announced squad, or that they are not in it', () => {
    const announce = (role: 'playing' | 'twelfth' | 'reserve' | null, locale: 'en' | 'de' = 'en') =>
      renderMessage(
        { kind: 'announcement', key: 'k', userId: 2, match: MATCH, role },
        tools(locale),
      )

    expect(announce('playing')).toEqual({
      title: "Squad for Saturday's match",
      body: "You're in the XI vs NCC-I.",
      url: '/',
      tag: 'announcement-fixture-60',
    })
    expect(announce('twelfth').body).toBe("You're 12th man vs NCC-I.")
    expect(announce('reserve').body).toBe("You're a reserve vs NCC-I.")
    expect(announce(null).body).toBe("You're not in the squad vs NCC-I this time.")
    expect(announce(null, 'de')).toMatchObject({
      title: 'Kader für das Spiel am Samstag',
      body: 'Du bist diesmal nicht im Kader gegen NCC-I.',
    })
  })

  it('tells a player what their attendance still needs, or that they cannot be picked', () => {
    const warn = (
      countdown: { kind: 'needs'; needed: number; of: number } | { kind: 'out' },
      locale: 'en' | 'de' = 'en',
    ) =>
      renderMessage(
        { kind: 'attendance', key: 'k', userId: 2, match: MATCH, countdown },
        tools(locale),
      )

    expect(warn({ kind: 'out' })).toEqual({
      title: 'Practice attendance',
      body: "You can't be selected for Saturday's match: 2 of the last 4 practices are needed (motion 2023/01).",
      url: '/attendance',
      tag: 'attendance',
    })
    expect(warn({ kind: 'needs', needed: 2, of: 3 }).body).toBe(
      "Attend 2 of the next 3 practices to be selected for Saturday's match.",
    )
    expect(warn({ kind: 'needs', needed: 1, of: 1 }).body).toBe(
      "Attend the next practice to be selected for Saturday's match.",
    )
    expect(warn({ kind: 'needs', needed: 2, of: 3 }, 'de').body).toBe(
      'Besuche 2 der nächsten 3 Trainings, um für das Spiel am Samstag aufgestellt zu werden.',
    )
  })
})
