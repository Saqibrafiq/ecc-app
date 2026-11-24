import type { SquadRole } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

/** One player on the announced team sheet. */
export type SheetPlayer = {
  playerId: string
  name: string
  role: SquadRole
  /** The member looking at the sheet. */
  isViewer: boolean
}

/** An announced squad as every member sees it (UC-12): the match and the players in sheet order. */
export type TeamSheet = {
  fixtureId: number
  match: ScheduledEvent
  players: SheetPlayer[]
}
