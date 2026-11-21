import 'server-only'

import { getSampleSelection, getTeamPreviewNow, SAMPLE_FIXTURE_ID } from '@/features/team'

import { buildSheetRows } from '../domain/sheet-rows'
import type { MatchDay } from '../types'

/** The sample squad's size on the sheet: the XI and the 12th man. */
const SQUAD_SIZE = 12
/** One sample player without a Spielerpass, to show the warning. */
const WITHOUT_PASS = '13'

/**
 * Sample match day for the preview: the sample ECC I squad, approved, with passes for all but one
 * player and no card images. Same shape as the real data.
 */
export function getSampleMatchDay(realNow: Date): MatchDay {
  const selection = getSampleSelection(getTeamPreviewNow(realNow))
  const picked = selection.candidates
    .filter((candidate) => candidate.eligibility.verdict !== 'not-selectable')
    .slice(0, SQUAD_SIZE)
  const picks = picked.map((candidate, index) => ({
    playerId: candidate.id,
    role: index < SQUAD_SIZE - 1 ? ('playing' as const) : ('twelfth' as const),
  }))
  const names = Object.fromEntries(picked.map((candidate) => [candidate.id, candidate.name]))
  const passes = new Map(
    picked
      .filter((candidate) => candidate.id !== WITHOUT_PASS)
      .map((candidate) => [
        candidate.id,
        { registeredName: candidate.name, passNumber: `BY-26-${candidate.id.padStart(3, '0')}` },
      ]),
  )
  const { rows, missingPasses } = buildSheetRows(picks, passes, names)

  return {
    fixtureId: SAMPLE_FIXTURE_ID,
    match: selection.match,
    block: selection.match.isHome ? 'home' : 'away',
    players: rows.flatMap((row) =>
      row.playerId === null
        ? []
        : [
            {
              playerId: row.playerId,
              label: row.label,
              name: names[row.playerId] ?? '',
              registeredName: passes.get(row.playerId)?.registeredName ?? null,
              passNumber: passes.get(row.playerId)?.passNumber ?? null,
              validFrom: null,
              hasCard: false,
            },
          ],
    ),
    missingPasses: missingPasses.map((player) => player.name),
    signedSheetAt: null,
  }
}
