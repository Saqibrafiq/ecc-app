import 'server-only'

import {
  addDays,
  getLocalDate,
  type LocalDate,
  startOfWeek,
  toInstant,
  toLocalTime,
} from '@/domain/club-rules'
import { getPreviewNow } from '@/features/week'

import { buildLedger } from '../domain/build-ledger'
import type { AttendanceLedger } from '../types'

/**
 * Sample data for the Attendance page in the preview: an ECC I player halfway through the
 * season, one missed practice still open for a correction request. Same shape as the real data.
 */

const DAYS_PER_WEEK = 7
const WEDNESDAY = 2
const SATURDAY = 5
const WEEKS_SHOWN = 10
/** Weeks ago of the practices the sample player attended. */
const ATTENDED = new Set([1, 2, 4, 5, 7, 9])
const MISSED_WITH_REQUEST = 6
const CANCELLED = 3
/** Away matches, weeks ago, and how the sample player answered. */
const AWAY_ANSWERS: Record<number, 'going' | 'not-going' | null> = {
  1: 'going',
  3: null,
  5: 'going',
  7: 'not-going',
  9: 'going',
}

export function getSampleLedger(realNow: Date): AttendanceLedger {
  const now = getPreviewNow(realNow)
  const today = getLocalDate(now)
  const monday = startOfWeek(today)
  const weeksAgo = (weeks: number, weekday: number): LocalDate =>
    addDays(monday, weekday - weeks * DAYS_PER_WEEK)
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, index) => index)

  return buildLedger({
    team: { id: 'ecc-1', name: 'ECC I' },
    now,
    today,
    seasonStart: addDays(monday, -WEEKS_SHOWN * DAYS_PER_WEEK),
    practices: weeks.map((weeks) => ({
      id: `practice-${String(100 + weeks)}`,
      date: weeksAgo(weeks, WEDNESDAY),
      isRecorded: weeks > 0,
      isCancelled: weeks === CANCELLED,
    })),
    attendedPracticeIds: new Set([...ATTENDED].map((weeks) => `practice-${String(100 + weeks)}`)),
    corrections: new Map([[`practice-${String(100 + MISSED_WITH_REQUEST)}`, 'requested']]),
    matches: [
      ...Object.entries(AWAY_ANSWERS).map(([weeks, answer]) => {
        const date = weeksAgo(Number(weeks), SATURDAY)
        return { date, isHome: false, answer, closesAt: toInstant(date, toLocalTime('00:00')) }
      }),
      {
        date: weeksAgo(0, SATURDAY),
        isHome: false,
        answer: null,
        closesAt: toInstant(weeksAgo(0, 1), toLocalTime('23:59')),
      },
    ],
    isCaptain: false,
    targetsStartOn: null,
  })
}
