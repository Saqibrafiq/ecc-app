import type { LocalDate } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

import type { SheetBlock } from './domain/sheet-layout'
import type { SheetRowLabel } from './domain/sheet-rows'

/** One selected player on match day, in the sheet's row order. */
export type MatchDayPlayer = {
  playerId: string
  label: SheetRowLabel
  name: string
  /** As on the Spielerpass, or `null` when the Board has not entered the pass yet. */
  registeredName: string | null
  passNumber: string | null
  validUntil: LocalDate | null
  hasCard: boolean
}

/** What the captain takes to an approved match (UC-13, UC-21, UC-22). */
export type MatchDay = {
  fixtureId: number
  match: ScheduledEvent
  block: SheetBlock
  players: MatchDayPlayer[]
  /** Players without a Spielerpass: the sheet shows their name without a pass number. */
  missingPasses: string[]
  /** When the signed sheet was uploaded, or `null` before. */
  signedSheetAt: string | null
}

export type SignedSheetOutcome = 'uploaded' | 'invalid' | 'not-approved' | 'unauthorized' | 'error'
/** Uploads the signed sheet's photo; the preview has none and keeps it in the page. */
export type UploadSignedSheet = (form: FormData) => Promise<{ status: SignedSheetOutcome }>
