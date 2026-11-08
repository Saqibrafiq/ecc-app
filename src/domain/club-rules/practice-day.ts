import { addDays, getWeekday, type LocalDate, startOfWeek, type Weekday } from './local-time'

/** R-1: a team with a Saturday match practises on Wednesday; with a Sunday match, on Thursday. */
const PRACTICE_DAY_BEFORE: Partial<Record<Weekday, Weekday>> = {
  saturday: 'wednesday',
  sunday: 'thursday',
}

const DAY_INDEX_FROM_MONDAY: Record<Weekday, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
}

export type TeamFixture = {
  id: string
  teamId: string
  date: LocalDate
}

export type PlannedPractice = {
  teamId: string
  date: LocalDate
  /** The match the practice prepares for. */
  fixtureId: string
}

/**
 * The practice day for a match (R-1), or `null` for a match that is not on a weekend: those get no
 * automatic practice; the admin can add one by hand (Q-1).
 */
export function getPracticeDate(matchDate: LocalDate): LocalDate | null {
  const practiceDay = PRACTICE_DAY_BEFORE[getWeekday(matchDate)]
  if (practiceDay === undefined) return null
  return addDays(startOfWeek(matchDate), DAY_INDEX_FROM_MONDAY[practiceDay])
}

/**
 * The automatic practices for a set of fixtures: one per team per week, before that team's first
 * weekend match. A team playing on both Saturday and Sunday practises once, on Wednesday. Weeks
 * without a weekend match get none (Q-1).
 */
export function planPractices(fixtures: readonly TeamFixture[]): PlannedPractice[] {
  const byTeamAndWeek = new Map<string, PlannedPractice>()
  const inDateOrder = [...fixtures].sort((a, b) => a.date.localeCompare(b.date))

  for (const fixture of inDateOrder) {
    const date = getPracticeDate(fixture.date)
    if (date === null) continue
    const key = `${fixture.teamId}|${startOfWeek(fixture.date)}`
    if (byTeamAndWeek.has(key)) continue
    byTeamAndWeek.set(key, { teamId: fixture.teamId, date, fixtureId: fixture.id })
  }

  return [...byTeamAndWeek.values()]
}
