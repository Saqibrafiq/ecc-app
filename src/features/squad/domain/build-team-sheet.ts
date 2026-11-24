import { orderSquad, type SquadPick } from '@/domain/club-rules'

import type { SheetPlayer } from '../types'

/**
 * The announced squad in sheet order (R-17) with each player's name, marking the member looking at
 * it. A player whose name the backend no longer has keeps their place, unnamed.
 */
export function buildTeamSheet(
  picks: readonly SquadPick[],
  names: ReadonlyMap<string, string>,
  viewerPlayerId: string | null,
): SheetPlayer[] {
  return orderSquad(picks).map((pick) => ({
    playerId: pick.playerId,
    name: names.get(pick.playerId) ?? '',
    role: pick.role,
    isViewer: pick.playerId === viewerPlayerId,
  }))
}
