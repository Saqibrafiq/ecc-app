import { z } from 'zod'

import { fixtureDocSchema, toMatchEvent } from '@/features/week'

import type { MatchOutcome, SeasonMatch } from '../types'

const marginSchema = z.object({ unit: z.enum(['runs', 'wickets']), value: z.number() })

/** The website's derived result (`matchResult`, a virtual field): never typed in, never stored. */
const matchResultSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('win'),
    winnerTeamId: z.number(),
    margin: marginSchema.nullable(),
    isDls: z.boolean(),
  }),
  z.object({ kind: z.literal('tie'), isDls: z.boolean() }),
  z.object({ kind: z.literal('forfeit'), winnerTeamId: z.number() }),
  z.object({ kind: z.literal('walkover'), winnerTeamId: z.number() }),
  z.object({ kind: z.literal('no-result') }),
])
type BackendResult = z.infer<typeof matchResultSchema>

export const seasonFixtureDocSchema = fixtureDocSchema.extend({
  status: z.enum(['scheduled', 'completed', 'abandoned', 'cancelled']),
  matchResult: matchResultSchema.nullish(),
})
export type SeasonFixtureDoc = z.infer<typeof seasonFixtureDocSchema>

function toOutcome(result: BackendResult, clubTeamId: number): MatchOutcome {
  switch (result.kind) {
    case 'win':
      return {
        result: result.winnerTeamId === clubTeamId ? 'won' : 'lost',
        margin: result.margin,
        method: result.isDls ? 'dls' : null,
      }
    case 'tie':
      return { result: 'tied', margin: null, method: result.isDls ? 'dls' : null }
    case 'forfeit':
    case 'walkover':
      return {
        result: result.winnerTeamId === clubTeamId ? 'won' : 'lost',
        margin: null,
        method: result.kind,
      }
    case 'no-result':
      return { result: 'no-result', margin: null, method: null }
  }
}

function getOutcome(doc: SeasonFixtureDoc, clubTeamId: number): MatchOutcome | null {
  if (doc.status === 'abandoned' || doc.status === 'cancelled') {
    return { result: doc.status, margin: null, method: null }
  }
  // A completed fixture always has a derived result; without one it is still to be decided.
  return doc.matchResult ? toOutcome(doc.matchResult, clubTeamId) : null
}

/** A fixture as one ECC team's match of the season, or `null` when no ECC team plays in it. */
export function toSeasonMatch(doc: SeasonFixtureDoc): SeasonMatch | null {
  const event = toMatchEvent(doc)
  if (!event) return null
  return { ...event, outcome: getOutcome(doc, Number(event.team.id)) }
}
