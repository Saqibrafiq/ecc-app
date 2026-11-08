import 'server-only'

import { addDays } from '@/domain/club-rules'
import { type SelectionData, getSampleSelection, SAMPLE_FIXTURE_ID } from '@/features/team'

import type { BoardMatch } from '../types'

/**
 * Sample data for the Board's screens in the preview: ECC I's squad waiting for approval and
 * ECC II's still open, in the same shapes as the real data.
 */

const SECOND_TEAM_FIXTURE_ID = 202
const SQUAD_SIZE = 12

export function getSampleBoardSelection(now: Date): SelectionData {
  const selection = getSampleSelection(now)
  const picks = selection.candidates
    .filter((candidate) => candidate.eligibility.verdict !== 'not-selectable')
    .slice(0, SQUAD_SIZE)
    .map((candidate, index) => ({
      playerId: candidate.id,
      role: index < SQUAD_SIZE - 1 ? ('playing' as const) : ('twelfth' as const),
    }))
  return {
    selection: { ...selection, status: 'submitted', picks },
    squadId: 1,
    deadlineDay: 'tuesday',
    exceptionIds: [],
    names: Object.fromEntries(selection.candidates.map((c) => [c.id, c.name])),
  }
}

export function getSampleBoardMatches(now: Date): BoardMatch[] {
  const { match } = getSampleSelection(now)
  return [
    {
      event: match,
      fixtureId: SAMPLE_FIXTURE_ID,
      squadStatus: 'submitted',
      deadlineDay: 'tuesday',
    },
    {
      event: {
        ...match,
        id: `fixture-${String(SECOND_TEAM_FIXTURE_ID)}`,
        team: { id: 'ecc-2', name: 'ECC II' },
        date: addDays(match.date, 1),
        startTime: null,
        ground: 'Erlangen ground',
        opponent: 'Fürth II',
        competition: 'BCV Verbandsliga',
        isHome: true,
      },
      fixtureId: SECOND_TEAM_FIXTURE_ID,
      squadStatus: 'open',
      deadlineDay: 'wednesday',
    },
  ]
}
