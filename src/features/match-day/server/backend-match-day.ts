import 'server-only'

import { z } from 'zod'

import type { LocalDate } from '@/domain/club-rules'
import { loadSelection, type TeamActor } from '@/features/team'
import { toLocalDay } from '@/features/week'
import { type BackendAuth, backendRequest } from '@/shared/backend/client'
import { toQuery } from '@/shared/backend/query'
import { listOf, relationIdSchema } from '@/shared/backend/schemas'

import { buildSheetRows, type SheetPass } from '../domain/sheet-rows'
import type { MatchDay } from '../types'
import type { MatchSheet } from './render-sheet'

const fixtureSchema = z.object({
  date: z.string(),
  ground: z.object({ name: z.string() }).nullish(),
  competition: z.object({
    name: z.string(),
    championship: z.string().nullish(),
    division: z.string().nullish(),
  }),
})

const passSchema = z.object({
  player: relationIdSchema,
  registeredName: z.string(),
  passNumber: z.string(),
  validFrom: z.string().nullish(),
  card: z.object({ filename: z.string() }).nullish(),
})
type PassDoc = z.infer<typeof passSchema>

const signedSheetSchema = z.object({
  id: z.number(),
  filename: z.string(),
  updatedAt: z.string(),
})

/** Everything match day needs on the server: the screen, the sheet, and where the files are. */
export type MatchDayData = {
  matchDay: MatchDay
  sheet: MatchSheet
  teamId: number
  /** Card image file names by player. */
  cards: Map<string, string>
  signedSheet: { id: number; filename: string } | null
}

export type MatchDayLoad = { kind: 'ready'; data: MatchDayData } | { kind: 'not-approved' }

/** "2026-11-14" → "14.11.2026", as dates are written on the sheet. */
export function toSheetDate(date: LocalDate): string {
  const [year, month, day] = date.split('-')
  return `${day ?? ''}.${month ?? ''}.${year ?? ''}`
}

/**
 * The Spielerpasses of the selected players. Passes are the Board's data, so they are read as the
 * service account, and only after the caller's right to this squad has been checked.
 */
async function getPasses(playerIds: readonly string[]): Promise<Map<string, PassDoc>> {
  if (playerIds.length === 0) return new Map()
  const { docs } = await backendRequest({
    path: `/spielerpasses${toQuery({ 'where[player][in]': playerIds.join(','), depth: '1' })}`,
    auth: { as: 'service' },
    schema: listOf(passSchema),
  })
  return new Map(docs.map((doc) => [String(doc.player), doc]))
}

async function getSignedSheet(auth: BackendAuth, fixtureId: number) {
  const { docs } = await backendRequest({
    path: `/match-sheets${toQuery({
      'where[fixture][equals]': String(fixtureId),
      depth: '0',
      limit: '1',
    })}`,
    auth,
    schema: listOf(signedSheetSchema),
  })
  return docs[0] ?? null
}

/**
 * An approved squad's match day for its captain or an admin (UC-13): the players in sheet order
 * with their passes, the filled sheet's contents, and the signed sheet if uploaded. `null` for a
 * match the actor may not see.
 */
export async function loadMatchDay(
  actor: TeamActor,
  fixtureId: number,
  now: Date,
): Promise<MatchDayLoad | null> {
  const selection = await loadSelection(actor, fixtureId, now)
  if (!selection) return null
  if (selection.selection.status !== 'approved') return { kind: 'not-approved' }

  const auth: BackendAuth = { as: 'member', token: actor.token }
  const { match, picks } = selection.selection
  const [fixture, passes, signedSheet] = await Promise.all([
    backendRequest({ path: `/fixtures/${String(fixtureId)}?depth=1`, auth, schema: fixtureSchema }),
    getPasses(picks.map((pick) => pick.playerId)),
    getSignedSheet(auth, fixtureId),
  ])
  const sheetPasses = new Map<string, SheetPass>(
    [...passes].map(([id, pass]) => [
      id,
      { registeredName: pass.registeredName, passNumber: pass.passNumber },
    ]),
  )
  const { rows, missingPasses } = buildSheetRows(picks, sheetPasses, selection.names)
  const block = match.isHome ? 'home' : 'away'

  return {
    kind: 'ready',
    data: {
      matchDay: {
        fixtureId,
        match,
        block,
        players: rows.flatMap((row) => {
          if (row.playerId === null) return []
          const pass = passes.get(row.playerId)
          return [
            {
              playerId: row.playerId,
              label: row.label,
              name: selection.names[row.playerId] ?? row.registeredName,
              registeredName: pass?.registeredName ?? null,
              passNumber: pass?.passNumber ?? null,
              validFrom: pass?.validFrom ? toLocalDay(pass.validFrom) : null,
              hasCard: Boolean(pass?.card),
            },
          ]
        }),
        missingPasses: missingPasses.map((player) => player.name),
        signedSheetAt: signedSheet?.updatedAt ?? null,
      },
      sheet: {
        date: toSheetDate(match.date),
        ground: fixture.ground?.name ?? '',
        championship: fixture.competition.championship ?? fixture.competition.name,
        division: fixture.competition.division ?? '',
        block,
        rows,
      },
      teamId: Number(match.team.id),
      cards: new Map(
        [...passes].flatMap(([id, pass]) => (pass.card ? [[id, pass.card.filename]] : [])),
      ),
      signedSheet: signedSheet ? { id: signedSheet.id, filename: signedSheet.filename } : null,
    },
  }
}
