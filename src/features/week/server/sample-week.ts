import 'server-only'

import {
  addDays,
  getLocalDate,
  getWeekday,
  type LocalDate,
  startOfWeek,
  toInstant,
  toLocalTime,
} from '@/domain/club-rules'

import type { WeekInput } from '../domain/build-week'
import type { ScheduledEvent, Team } from '../types'

/**
 * Sample data for the preview, until the screen reads the club's real fixtures and answers from
 * the backend (ADR-0002). Same shape as the real data, so only this file is replaced.
 */

const ECC_I: Team = { id: 'ecc-1', name: 'ECC I' }
const ECC_II: Team = { id: 'ecc-2', name: 'ECC II' }
const PREVIEW_TIME = toLocalTime('10:00')
const PRACTICE_TIME = toLocalTime('18:30')
const DAYS_PER_WEEK = 7
const SEASON_LENGTH_SHOWN_DAYS = 60

/** The preview shows a Monday morning: the coming Monday, or today if it is Monday. */
export function getPreviewNow(realNow: Date): Date {
  const today = getLocalDate(realNow)
  const thisMonday = startOfWeek(today)
  const monday = getWeekday(today) === 'monday' ? today : addDays(thisMonday, DAYS_PER_WEEK)
  return toInstant(monday, PREVIEW_TIME)
}

function sampleEvents(monday: LocalDate): ScheduledEvent[] {
  return [
    {
      id: 'sample-ecc1-practice',
      kind: 'practice',
      team: ECC_I,
      date: addDays(monday, 2),
      startTime: PRACTICE_TIME,
      ground: 'Erlangen ground',
    },
    {
      id: 'sample-ecc1-match',
      kind: 'match',
      team: ECC_I,
      date: addDays(monday, 5),
      startTime: toLocalTime('11:00'),
      ground: 'Nürnberg',
      opponent: 'Nürnberg CC',
      competition: 'BCV Regionalliga',
      overs: 20,
      isHome: false,
    },
    {
      id: 'sample-ecc2-practice',
      kind: 'practice',
      team: ECC_II,
      date: addDays(monday, 3),
      startTime: PRACTICE_TIME,
      ground: 'Erlangen ground',
    },
    {
      id: 'sample-ecc2-match',
      kind: 'match',
      team: ECC_II,
      date: addDays(monday, 6),
      startTime: toLocalTime('13:00'),
      ground: 'Erlangen ground',
      opponent: 'Fürth II',
      competition: 'BCV Verbandsliga',
      overs: 20,
      isHome: true,
    },
  ]
}

/** A member of ECC I who attended 2 of the last 3 practices, with this week's still to come. */
export function getSampleWeekInput(now: Date): WeekInput {
  const monday = startOfWeek(getLocalDate(now))
  const wednesdayBefore = (weeksAgo: number) => addDays(monday, 2 - weeksAgo * DAYS_PER_WEEK)
  const practices = [3, 2, 1].map((weeksAgo) => ({
    id: `sample-practice-${String(weeksAgo)}`,
    date: wednesdayBefore(weeksAgo),
    isCancelled: false,
    isRecorded: true,
  }))

  return {
    now,
    ownTeam: ECC_I,
    events: sampleEvents(monday),
    answers: {},
    practices: [
      ...practices,
      {
        id: 'sample-ecc1-practice',
        date: wednesdayBefore(0),
        isCancelled: false,
        isRecorded: false,
      },
    ],
    attendedPracticeIds: new Set(['sample-practice-3', 'sample-practice-1']),
    seasonStart: addDays(monday, -SEASON_LENGTH_SHOWN_DAYS),
  }
}
