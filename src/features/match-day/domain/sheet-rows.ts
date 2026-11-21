import type { SquadPick } from '@/domain/club-rules'

/** The rows of a team's block on the DCB match report sheet, top to bottom. */
export const SHEET_ROW_LABELS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  'A1',
  'A2',
  'B1',
  'B2',
] as const
export type SheetRowLabel = (typeof SHEET_ROW_LABELS)[number]

/** A player's Spielerpass details as the league registered them. */
export type SheetPass = { registeredName: string; passNumber: string }

export type SheetRow = {
  label: SheetRowLabel
  playerId: string | null
  registeredName: string
  passNumber: string
}

export type SheetRows = {
  rows: SheetRow[]
  /** Picked players without a Spielerpass: the captain and the Board are told (ADR-0007). */
  missingPasses: { playerId: string; name: string }[]
}

const PLAYING_LABELS = SHEET_ROW_LABELS.slice(0, 11)
const TWELFTH_LABEL: SheetRowLabel = 'A1'
const RESERVE_LABEL: SheetRowLabel = 'A2'

/**
 * Which player goes in which row of ECC's block (ADR-0007, Q-15): the XI in pick order in rows
 * 1–11, the 12th man in A1, the first reserve in A2; B1 and B2 (team officials) stay empty for
 * the captain. A player without a pass keeps their name and an empty pass number.
 */
export function buildSheetRows(
  picks: readonly SquadPick[],
  passes: ReadonlyMap<string, SheetPass>,
  names: Readonly<Record<string, string>>,
): SheetRows {
  const playing = picks.filter((pick) => pick.role === 'playing').map((pick) => pick.playerId)
  const twelfth = picks.find((pick) => pick.role === 'twelfth')?.playerId
  const reserve = picks.find((pick) => pick.role === 'reserve')?.playerId

  const playerFor = new Map<SheetRowLabel, string>()
  PLAYING_LABELS.forEach((label, index) => {
    const playerId = playing[index]
    if (playerId) playerFor.set(label, playerId)
  })
  if (twelfth) playerFor.set(TWELFTH_LABEL, twelfth)
  if (reserve) playerFor.set(RESERVE_LABEL, reserve)

  const missingPasses: SheetRows['missingPasses'] = []
  const rows = SHEET_ROW_LABELS.map((label) => {
    const playerId = playerFor.get(label) ?? null
    if (playerId === null) return { label, playerId, registeredName: '', passNumber: '' }
    const pass = passes.get(playerId)
    if (!pass) missingPasses.push({ playerId, name: names[playerId] ?? '' })
    return {
      label,
      playerId,
      registeredName: pass?.registeredName ?? names[playerId] ?? '',
      passNumber: pass?.passNumber ?? '',
    }
  })
  return { rows, missingPasses }
}
