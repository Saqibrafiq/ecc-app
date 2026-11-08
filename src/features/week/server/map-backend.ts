import { z } from 'zod'

import {
  getLocalDate,
  isLocalTime,
  type LocalDate,
  type LocalTime,
  type TeamPractice,
} from '@/domain/club-rules'
import { relationIdSchema } from '@/shared/backend/schemas'

import type { MemberAnswer, ScheduledEvent, Team } from '../types'

/** The website's documents as the app reads them (Payload REST, ADR-0024 in the website). */

const teamDocSchema = z.object({
  id: z.number(),
  name: z.string(),
  shortName: z.string(),
  isClubTeam: z.boolean().nullish(),
})

export const fixtureDocSchema = z.object({
  id: z.number(),
  date: z.string(),
  startTime: z.string().nullish(),
  team1: teamDocSchema,
  team2: teamDocSchema,
  ground: z.object({ name: z.string(), clubCode: z.string().nullish() }).nullish(),
  competition: z.object({ name: z.string(), maxOvers: z.number().nullish() }),
})
export type FixtureDoc = z.infer<typeof fixtureDocSchema>

export const practiceDocSchema = z.object({
  id: z.number(),
  team: relationIdSchema,
  date: z.string(),
  startTime: z.string().nullish(),
  isCancelled: z.boolean().nullish(),
  isRecorded: z.boolean().nullish(),
  ground: z.string().nullish(),
})
export type PracticeDoc = z.infer<typeof practiceDocSchema>

export const answerDocSchema = z.object({
  id: z.number(),
  fixture: relationIdSchema.nullish(),
  practice: relationIdSchema.nullish(),
  response: z.enum(['going', 'not-going']),
  reason: z.string().nullish(),
})
export type AnswerDoc = z.infer<typeof answerDocSchema>

/** "-I", "-II": the team number after the club code in league team codes. */
const TEAM_NUMBER_SUFFIX = /-(?:[IVX]+|\d+)$/i
/** The club's own ground (league club code). */
export const CLUB_CODE = 'ECC'
/** Practices are at the club's ground. */
const PRACTICE_GROUND = 'Erlangen'

/** "ECC-I" → "ECC I": how members name the teams. */
export function toTeamName(shortName: string): string {
  return shortName.replace('-', ' ')
}

export function toTeam(doc: { id: number; shortName: string }): Team {
  return { id: String(doc.id), name: toTeamName(doc.shortName) }
}

/** Payload stores day-only dates as instants (noon UTC); the club day is read in club time. */
export function toLocalDay(iso: string): LocalDate {
  return getLocalDate(new Date(iso))
}

function toTime(value: string | null | undefined): LocalTime | null {
  return value && isLocalTime(value) ? value : null
}

export function getClubCode(shortName: string): string {
  return shortName.trim().replace(TEAM_NUMBER_SUFFIX, '').toUpperCase()
}

/** A fixture as one ECC team's match, or `null` when no ECC team plays in it. */
export function toMatchEvent(doc: FixtureDoc): ScheduledEvent | null {
  const club = [doc.team1, doc.team2].find((team) => team.isClubTeam === true)
  if (!club) return null
  const opponent = club === doc.team1 ? doc.team2 : doc.team1
  return {
    id: `fixture-${String(doc.id)}`,
    kind: 'match',
    team: toTeam(club),
    date: toLocalDay(doc.date),
    startTime: toTime(doc.startTime),
    ground: doc.ground?.name ?? '',
    opponent: opponent.name,
    competition: doc.competition.name,
    overs: doc.competition.maxOvers ?? undefined,
    isHome: doc.ground?.clubCode?.toUpperCase() === CLUB_CODE,
  }
}

export function toPracticeEvent(doc: PracticeDoc, team: Team): ScheduledEvent {
  return {
    id: `practice-${String(doc.id)}`,
    kind: 'practice',
    team,
    date: toLocalDay(doc.date),
    startTime: toTime(doc.startTime),
    ground: doc.ground ?? PRACTICE_GROUND,
  }
}

export function toTeamPractice(doc: PracticeDoc): TeamPractice {
  return {
    id: `practice-${String(doc.id)}`,
    date: toLocalDay(doc.date),
    isCancelled: doc.isCancelled === true,
    isRecorded: doc.isRecorded === true,
  }
}

/** The member's answers by the app's event id ("fixture-12", "practice-5"). */
export function toAnswerMap(docs: readonly AnswerDoc[]): Record<string, MemberAnswer> {
  const answers: Record<string, MemberAnswer> = {}
  for (const doc of docs) {
    const id = doc.fixture
      ? `fixture-${String(doc.fixture)}`
      : doc.practice
        ? `practice-${String(doc.practice)}`
        : null
    if (id) answers[id] = { answer: doc.response, reason: doc.reason ?? null }
  }
  return answers
}

/** The event an app id points to, e.g. "fixture-12" → the fixture with id 12. */
export function parseEventId(
  id: string,
): { kind: 'fixture' | 'practice'; backendId: number } | null {
  const match = /^(fixture|practice)-(\d+)$/.exec(id)
  if (!match) return null
  return { kind: match[1] as 'fixture' | 'practice', backendId: Number(match[2]) }
}
