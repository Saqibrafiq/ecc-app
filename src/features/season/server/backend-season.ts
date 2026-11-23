import 'server-only'

import { getLocalDate, type LocalDate } from '@/domain/club-rules'
import { getClubTeams, getSquadTeamId } from '@/features/week'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { dayStart, toQuery } from '@/shared/backend/query'
import { listOf } from '@/shared/backend/schemas'

import { buildSeason } from '../domain/build-season'
import type { Season, SeasonMatch } from '../types'
import { seasonFixtureDocSchema, toSeasonMatch } from './map-season'

/** A signed-in member; `playerId` is `null` for an account not linked to a player yet. */
export type SeasonMember = { token: string; playerId: number | null }

/** The season is the calendar year, as for the attendance rule (R-11). */
async function getSeasonMatches(auth: BackendAuth, year: number): Promise<SeasonMatch[]> {
  const { docs } = await backendRequest({
    path: `/fixtures${toQuery({
      'where[date][greater_than_equal]': dayStart(`${String(year)}-01-01`),
      'where[date][less_than]': dayStart(`${String(year + 1)}-01-01`),
      depth: '1',
      sort: 'date',
    })}`,
    auth,
    schema: listOf(seasonFixtureDocSchema),
  })
  return docs.map(toSeasonMatch).filter((match): match is SeasonMatch => match !== null)
}

async function getOwnTeamId(member: SeasonMember): Promise<number | null> {
  if (member.playerId === null) return null
  return getSquadTeamId({ playerId: member.playerId, token: member.token })
}

/** Every ECC match of the year from the club's backend, the member's own team first. */
export async function getBackendSeason(member: SeasonMember, now: Date): Promise<Season> {
  const auth: BackendAuth = { as: 'member', token: member.token }
  const today: LocalDate = getLocalDate(now)
  const year = Number(today.slice(0, 4))

  const [ownTeamId, teams, matches] = await Promise.all([
    getOwnTeamId(member),
    getClubTeams(auth),
    getSeasonMatches(auth, year),
  ])
  const ownTeam = ownTeamId === null ? null : (teams.get(ownTeamId) ?? null)
  return buildSeason({ year, today, ownTeam, matches })
}
