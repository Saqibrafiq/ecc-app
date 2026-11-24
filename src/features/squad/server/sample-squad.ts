import 'server-only'

import type { SquadRole } from '@/domain/club-rules'
import { getSampleSelection, getTeamPreviewNow, SAMPLE_FIXTURE_ID } from '@/features/team'

import { buildTeamSheet } from '../domain/build-team-sheet'
import type { TeamSheet } from '../types'

/** The sample squad: the XI, the 12th man and one reserve. */
const PLAYING_XI = 11
const SQUAD_SIZE = 13
/** The sample member is the third player picked, so the preview shows the highlight mid-list. */
const VIEWER_INDEX = 2

function roleAt(index: number): SquadRole {
  if (index < PLAYING_XI) return 'playing'
  return index === PLAYING_XI ? 'twelfth' : 'reserve'
}

/**
 * The announced team sheet in the preview (no backend): the sample ECC I squad from the captain's
 * screens, approved. Same shape as the real data.
 */
export function getSampleTeamSheet(realNow: Date): TeamSheet {
  const selection = getSampleSelection(getTeamPreviewNow(realNow))
  const picked = selection.candidates
    .filter((candidate) => candidate.eligibility.verdict !== 'not-selectable')
    .slice(0, SQUAD_SIZE)
  const picks = picked.map((candidate, index) => ({ playerId: candidate.id, role: roleAt(index) }))
  const names = new Map(picked.map((candidate) => [candidate.id, candidate.name]))

  return {
    fixtureId: SAMPLE_FIXTURE_ID,
    match: selection.match,
    players: buildTeamSheet(picks, names, null).map((player, index) => ({
      ...player,
      isViewer: index === VIEWER_INDEX,
    })),
  }
}
